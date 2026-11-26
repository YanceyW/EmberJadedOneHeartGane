import { GAMES } from '../shared/content/games-manifest.generated';
import { LobbyScene } from '../lobby/lobby-scene';
import { COLORS, FONT, RADIUS, SPACE } from '../shared/design-system/tokens';
import { drawPanel, drawText, fillRoundRect } from '../shared/design-system/draw';
import { platform } from '../shared/platform/wx';
import { AssetService } from '../core/assets/assets';
import { AnalyticsService } from '../core/analytics/analytics';
import { AudioService } from '../core/audio/audio';
import { CloudService } from '../core/cloud/cloud';
import { GameRegistry } from '../core/game-registry';
import type { GameDefinition } from '../core/types';
import { HapticsService } from '../core/haptics/haptics';
import { InputService } from '../core/input/input';
import { ParticleSystem } from '../core/particles/particles';
import { ProfileService } from '../core/profile';
import { QualityService } from '../core/quality/quality';
import { Renderer } from '../core/render/renderer';
import { createRng } from '../core/rng';
import { GameScene } from '../core/scene/game-scene';
import { SceneManager } from '../core/scene/scene';
import { CloudSaveService } from '../core/cloud/cloud-save';
import { ShareService } from '../core/share/share';
import { StorageService } from '../core/storage/storage';
import { TimeService } from '../core/time/time';
import { logger } from '../core/utils/logger';
import { AppServices } from '../core/app/services';
import { createFeedback } from '../shared/game-kit/feedback';
import { SpriteAtlas, SpriteId } from '../shared/design-system/sprite-atlas';

interface Notice {
  text: string;
  until: number;
}

const ATLAS_IDS: SpriteId[] = [
  'tile-berry',
  'tile-honey',
  'tile-mint',
  'tile-sky',
  'tile-lilac',
  'shadow',
  'p-star',
  'p-petal',
  'p-bubble',
  'p-dust',
  'p-coin',
  'p-sugar',
  'p-ring',
  'p-leaf',
  'p-firefly',
  'p-splash',
  'p-smoke',
];

export class App {
  private readonly renderer: Renderer;
  private readonly storage: StorageService;
  private readonly cloud: CloudService;
  private readonly audio: AudioService;
  private readonly profile: ProfileService;
  private readonly services: AppServices;
  private readonly scenes = new SceneManager();
  private readonly input: InputService;
  private readonly quality: QualityService;
  private readonly particles: ParticleSystem;
  private readonly haptics = new HapticsService();
  private readonly atlas: SpriteAtlas;

  private loadingMessage = '';
  private notice: Notice | null = null;
  private paused = false;
  private lastTick = 0;
  private lastFrameMs = 0;
  private lastParticleBudget = -1;

  constructor() {
    this.quality = new QualityService(platform.getMetrics());
    this.renderer = new Renderer(platform.getMetrics(), this.quality.profile.maxDpr);
    this.storage = new StorageService();
    this.cloud = new CloudService();
    this.audio = new AudioService(
      () => platform.createWebAudioContext(),
      () => platform.createInnerAudioContext(),
    );
    this.profile = new ProfileService(this.storage);

    this.atlas = new SpriteAtlas();
    this.particles = new ParticleSystem(512);
    for (const id of ATLAS_IDS) this.particles.registerFrame(id, this.atlas.frame(id));

    const settings = this.profile.get().settings;
    this.audio.setMusic(settings.music);
    this.audio.setSfx(settings.sfx);
    this.audio.setMaxVoices(this.quality.profile.sfxVoices);
    this.haptics.setEnabled(settings.haptics && !settings.reducedMotion);
    this.quality.setPreference(
      settings.reducedMotion ? 'reduced' : settings.performanceMode ? 'low' : settings.quality,
    );
    this.quality.setEffects({
      ambientEffects: settings.ambientEffects && !settings.performanceMode,
      sceneMotion: settings.sceneMotion && !settings.performanceMode,
      textureDetail: settings.textureDetail && !settings.performanceMode,
      screenShake: settings.screenShake && !settings.performanceMode,
    });
    platform.setInnerAudioOption(true);

    const feedback = createFeedback({
      audio: this.audio,
      haptics: this.haptics,
      particles: this.particles,
      quality: this.quality,
    });

    this.input = new InputService(this.renderer);
    const services: AppServices = {
      renderer: this.renderer,
      input: this.input,
      audio: this.audio,
      assets: new AssetService(),
      storage: this.storage,
      cloud: this.cloud,
      cloudSave: new CloudSaveService(this.cloud, this.storage),
      analytics: new AnalyticsService(),
      share: new ShareService(),
      time: new TimeService(),
      rng: createRng(Date.now() >>> 0),
      profile: this.profile,
      logger,
      feedback,
      particles: this.particles,
      haptics: this.haptics,
      quality: this.quality,
      atlas: this.atlas,
      debugStats: () => this.debugStats,
      openGame: (gameId) => this.openGame(gameId),
    };

    this.services = services;

    // 首次触摸就解锁音频：纯滑动玩法不会产生 tap，不能等到 touchend。
    this.input.onPress((point) => {
      this.audio.unlock();
      if (this.loadingMessage) return;
      this.scenes.press(point);
    });
    this.input.onDrag((point) => {
      if (this.loadingMessage) return;
      this.scenes.drag(point);
    });
    this.input.onRelease((point) => {
      if (this.loadingMessage) return;
      this.scenes.release(point);
    });
    this.input.onSwipe((event) => {
      if (this.loadingMessage) return;
      this.scenes.swipe(event);
    });
    this.input.onPinch((event) => {
      if (this.loadingMessage) return;
      this.scenes.pinch(event);
    });
    this.input.onTap((point) => {
      this.audio.unlock();
      if (this.loadingMessage) return;
      this.scenes.tap(point.x, point.y);
    });

    platform.onShow(() => {
      this.paused = false;
      this.lastTick = Date.now();
      this.audio.resume();
    });
    platform.onHide(() => {
      this.paused = true;
      this.audio.pause();
      // 切后台把动画直接落终态，回来不会看到半截动画。
      this.particles.clear();
    });
    platform.onError((error) => logger.error('uncaught', error));
  }

  start(): void {
    const localName = this.profile.get().displayName;
    void this.cloud.init(localName).then(() => {
      // 云端名字是唯一事实来源；离线时保留本地名字继续玩。
      if (this.cloud.displayName) this.profile.setDisplayName(this.cloud.displayName, true);
    });
    void this.scenes.replace(new LobbyScene(this.services));
    // 大厅 BGM：mp3 未打包时静默失败，不影响启动。
    this.audio.playBgm('lobby');
    this.lastTick = Date.now();
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(this.tick);
    } else {
      setTimeout(() => this.tick(Date.now()), 16);
    }
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTick) / 1000));
    this.lastTick = now;

    if (!this.paused) {
      this.quality.reportFrame(dt * 1000);
      const budget = this.quality.particleBudget;
      if (budget !== this.lastParticleBudget) {
        this.lastParticleBudget = budget;
        this.particles.setBudget(budget);
      }
      this.scenes.update(dt);
      this.particles.update(dt);
      this.renderer.beginFrame();
      this.scenes.render(this.renderer);
      this.particles.draw(this.renderer.ctx);
      this.renderOverlays();
      this.lastFrameMs = dt * 1000;
    }

    this.scheduleFrame();
  };

  get debugStats(): { fps: number; frameMs: number; particles: number; tier: string } {
    return {
      fps: this.lastFrameMs > 0 ? Math.round(1000 / this.lastFrameMs) : 0,
      frameMs: Math.round(this.lastFrameMs * 10) / 10,
      particles: this.particles.activeCount,
      tier: this.quality.tier,
    };
  }

  private openGame(gameId: string): void {
    if (this.loadingMessage) return;

    const entry = GAMES.find((game) => game.id === gameId);
    if (!entry || entry.status !== 'playable') {
      this.showNotice('这个场馆还在装修中，敬请期待');
      return;
    }

    this.loadingMessage = `正在进入${entry.title}`;
    platform
      .loadSubpackage(entry.packageName)
      .then(() => this.waitForDefinition(entry.id))
      .then((definition) => {
        if (!definition) throw new Error(`Game ${entry.id} did not register`);
        this.loadingMessage = '';
        return this.scenes.replace(
          new GameScene(definition, this.services, () => this.returnToLobby()),
        );
      })
      .catch((error) => {
        logger.error('openGame failed', error);
        this.loadingMessage = '';
        this.showNotice('加载失败，请稍后重试');
      });
  }

  // 分包根目录的 game.js 是入口文件，wx.loadSubpackage 成功后由运行时执行；
  // 这里留几帧余量，避免个别基础库把 execute 排在 success 之后。
  private async waitForDefinition(gameId: string): Promise<GameDefinition | undefined> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const definition = GameRegistry.get(gameId);
      if (definition) return definition;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 16);
      });
    }
    return undefined;
  }

  private returnToLobby(): void {
    void this.scenes.replace(new LobbyScene(this.services));
  }

  private showNotice(text: string): void {
    this.notice = { text, until: Date.now() + 1800 };
  }

  private renderOverlays(): void {
    const ctx = this.renderer.ctx;
    const width = this.renderer.width;
    const height = this.renderer.height;

    if (this.loadingMessage) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,246,233,0.78)';
      ctx.fillRect(0, 0, width, height);
      const panel = { x: 105, y: height / 2 - 80, w: width - 210, h: 160 };
      drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });
      drawText(ctx, this.loadingMessage, width / 2, panel.y + 62, {
        size: FONT.subtitle,
        weight: '700',
        align: 'center',
      });
      drawText(ctx, '王都正在为你准备场馆…', width / 2, panel.y + 112, {
        size: FONT.caption,
        color: COLORS.inkSoft,
        align: 'center',
      });
      ctx.restore();
    }

    if (this.notice && Date.now() < this.notice.until) {
      const textWidth = Math.min(width - 120, Math.max(320, this.notice.text.length * 26 + 64));
      const rect = { x: (width - textWidth) / 2, y: height - 190, w: textWidth, h: 72 };
      fillRoundRect(ctx, rect, 'rgba(58,46,42,0.88)', RADIUS.xl);
      drawText(ctx, this.notice.text, width / 2, rect.y + rect.h / 2, {
        size: FONT.body,
        color: COLORS.paper,
        align: 'center',
        maxWidth: rect.w - SPACE.xl * 2,
      });
    }
  }
}

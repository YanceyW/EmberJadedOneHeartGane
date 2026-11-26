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
import { InputService } from '../core/input/input';
import { ProfileService } from '../core/profile';
import { Renderer } from '../core/render/renderer';
import { createRng } from '../core/rng';
import { GameScene } from '../core/scene/game-scene';
import { SceneManager } from '../core/scene/scene';
import { ShareService } from '../core/share/share';
import { StorageService } from '../core/storage/storage';
import { TimeService } from '../core/time/time';
import { logger } from '../core/utils/logger';
import { AppServices } from '../core/app/services';

interface Notice {
  text: string;
  until: number;
}

export class App {
  private readonly renderer: Renderer;
  private readonly storage: StorageService;
  private readonly cloud: CloudService;
  private readonly audio: AudioService;
  private readonly profile: ProfileService;
  private readonly services: AppServices;
  private readonly scenes = new SceneManager();
  private readonly input: InputService;

  private loadingMessage = '';
  private notice: Notice | null = null;
  private paused = false;
  private lastTick = 0;

  constructor() {
    this.renderer = new Renderer();
    this.storage = new StorageService();
    this.cloud = new CloudService();
    this.audio = new AudioService();
    this.profile = new ProfileService(this.storage);

    const settings = this.profile.get().settings;
    this.audio.setMusic(settings.music);
    this.audio.setSfx(settings.sfx);

    this.input = new InputService(this.renderer);
    const services: AppServices = {
      renderer: this.renderer,
      input: this.input,
      audio: this.audio,
      assets: new AssetService(),
      storage: this.storage,
      cloud: this.cloud,
      analytics: new AnalyticsService(),
      share: new ShareService(),
      time: new TimeService(),
      rng: createRng(Date.now() >>> 0),
      profile: this.profile,
      logger,
      openGame: (gameId) => this.openGame(gameId),
    };

    this.services = services;

    this.input.onTap((point) => {
      if (this.loadingMessage) return;
      this.scenes.tap(point.x, point.y);
    });

    platform.onShow(() => {
      this.paused = false;
      this.lastTick = Date.now();
    });
    platform.onHide(() => {
      this.paused = true;
      this.audio.pause();
    });
    platform.onError((error) => logger.error('uncaught', error));
  }

  start(): void {
    void this.cloud.init();
    void this.scenes.replace(new LobbyScene(this.services));
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
      this.scenes.update(dt);
      this.renderer.beginFrame();
      this.scenes.render(this.renderer);
      this.renderOverlays();
    }

    this.scheduleFrame();
  };

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

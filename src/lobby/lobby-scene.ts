import { GAME_VERSION } from '../config';
import { AppServices } from '../core/app/services';
import { LeaderboardEntry } from '../core/cloud/cloud';
import { PinchEvent, PointerPoint } from '../core/input/input';
import { hashString } from '../core/rng';
import { Renderer } from '../core/render/renderer';
import { Scene } from '../core/scene/scene';
import { drawPetal, drawText, drawWangduCoin, pointInRect, Rect } from '../shared/design-system/draw';
import { drawRoyalPair, RoyalMood, RoyalOutfitId } from '../shared/design-system/royals';
import { COLORS, FONT, RADIUS } from '../shared/design-system/tokens';
import {
  drawDivider,
  drawPaperPanel,
  drawSegmented,
  drawSettingRow,
  drawStickerButton,
  drawTapeNote,
  drawWoodRibbon,
} from '../shared/design-system/paper-ui';
import { inkRoundRect } from '../shared/design-system/paint';
import { platform } from '../shared/platform/wx';
import { drawGameIcon } from './game-icons';
import { ChromeNav, drawDock, drawHeader, drawLobbyToast, drawPanHint } from './lobby-chrome';
import { TownArt } from './town/town-art';
import { LobbyAmbient } from './town/town-particles';
import { ResidentDirector } from './town/town-residents';
import {
  createCamera,
  panCamera,
  screenToWorld,
  TownCamera,
  worldToScreen,
  zoomAt,
} from './town/town-camera';
import { TownPhase } from './town/town-palette';
import {
  BUILD_TRACKS,
  buyOrEquipIcon,
  buyOrEquipOutfit,
  buyOrEquipStyle,
  buyOrEquipTile,
  ICON_STYLES,
  nextBuildCost,
  OUTFITS,
  selectBuildTrackLevel,
  selectWeather,
  ShopResult,
  upgradeBuildTrack,
} from './shop';
import { findStyle, findWeather, STYLES, WEATHERS } from './themes';
import { drawWeather } from './weather';
import { computeTownLayout, isOverRoyal, TownLayout, townStructureAt } from './town/town-layout';
import { townPalette, townPhaseAt } from './town/town-palette';
import { drawTown } from './town/town-view';
import { generateNameCandidates } from '../shared/content/player-names';
import { compactNumber } from '../shared/format';
import {
  LEADERBOARD_TABS,
  MATCH3_CAMPAIGN_BOARD,
  MATCH3_ENDLESS_BOARD,
} from '../shared/content/leaderboards';
import { TILE_SKINS } from '../shared/content/tile-skins';
import { drawStoragePanel, StorageHit, StorageTarget } from './storage';
import { drawDailyPanel, DailyTarget } from './daily';
import {
  DailyOrderDef,
  DAILY_CLEAR_COINS,
  DAILY_CLEAR_PROSPERITY,
  DAILY_ORDER_COUNT,
  dayKey,
  pickDailyOrders,
} from '../shared/content/daily-orders';
import { GoodsKind, INGREDIENTS, sellSelection } from '../shared/content/ingredients';

type Modal = 'settings' | 'privacy' | 'rank' | 'shop' | 'name' | 'storage' | 'daily' | null;
type ShopTab = 'build' | 'outfit' | 'weather' | 'style' | 'icon' | 'tile';
type NavId = 'rank' | 'daily' | 'collection' | 'shop';

interface NavItem {
  id: NavId;
  label: string;
  rect: Rect;
}

interface ShopHit {
  kind: 'tab' | 'build' | 'build-level' | 'outfit' | 'weather' | 'style' | 'icon' | 'tile' | 'close';
  id: string;
  rect: Rect;
  level?: number;
}

interface NameHit {
  kind: 'candidate' | 'reroll' | 'use' | 'close';
  index: number;
  rect: Rect;
}

interface RankTab {
  id: string;
  rect: Rect;
}


interface Toast {
  text: string;
  until: number;
}

function resultMessage(result: ShopResult): string {
  switch (result) {
    case 'bought':
      return '已兑换并换上';
    case 'owned':
      return '已经拥有了';
    case 'equipped':
      return '已换上';
    case 'poor':
      return '王都币不够，再玩一局吧';
    case 'maxed':
      return '已经满级啦';
    case 'locked':
      return '这个皮肤要在对应玩法里解锁';
    default:
      return '这件装扮暂时不可用';
  }
}

export class LobbyScene implements Scene {
  readonly key = 'lobby';

  private layout: TownLayout;
  private navs: NavItem[] = [];
  private pressedNav: NavId | null = null;
  private walletRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private settingsRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private toast: Toast | null = null;
  private modal: Modal = null;
  private pulse = 0;

  private readonly art = new TownArt();
  private readonly ambient: LobbyAmbient;
  private readonly residents = new ResidentDirector(0x7a17);
  private residentCount = -1;
  private residentPalettes: number[] = [];
  private pressedStructureId: string | null = null;
  private camera: TownCamera = createCamera();
  private lastDrag: { x: number; y: number } | null = null;
  private pinchBaseZoom: number | null = null;
  private panHintUntil = 0;
  private phase: TownPhase = townPhaseAt(new Date().getHours());
  private phaseFlash = 0;
  private settingsTab: 'sound' | 'visual' | 'data' = 'sound';
  private tabSoundRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private tabVisualRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private tabDataRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private qualityRects: Rect[] = [];
  private performanceRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private ambientRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private sceneRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private textureRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private shakeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private performanceSnapshot: {
    quality: 'auto' | 'high' | 'mid' | 'low';
    ambientEffects: boolean;
    sceneMotion: boolean;
    textureDetail: boolean;
    screenShake: boolean;
  } | null = null;

  private shopTab: ShopTab = 'build';
  private shopHits: ShopHit[] = [];
  private nameCandidates: string[] = [];
  private nameSelected = 0;
  private nameHits: NameHit[] = [];
  private nameBusy = false;

  private closeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private musicRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private sfxRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private privacyRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private deleteRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private hapticsRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private motionRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private nameRowRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private changeNameRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private privacyCloseRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private rankCloseRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private rankTabs: RankTab[] = [];
  private rankGameId = MATCH3_CAMPAIGN_BOARD;
  private rankRequestId = 0;
  private rankLoading = false;
  private rankEntries: LeaderboardEntry[] = [];
  private rankMessage = '';

  private storageTab: GoodsKind = 'crop';
  private storageSelected: string[] = [];
  private storageTargets: StorageTarget[] = [];
  private dailyTargets: DailyTarget[] = [];
  private dailyOrders: readonly DailyOrderDef[] = [];

  constructor(private readonly services: AppServices) {
    this.layout = computeTownLayout(
      services.renderer.width,
      services.renderer.height,
      services.renderer.safeTop,
      services.renderer.safeBottom,
      services.renderer.capsuleBottom,
    );
    this.ambient = new LobbyAmbient(services.atlas, services.quality);
    this.layoutDock();
  }

  enter(): void {
    this.services.analytics.track('lobby_enter');
    this.services.audio.playBgm('lobby');
    this.ensureResident();
    this.panHintUntil = Date.now() + 3400;
    this.art.ensure(
      this.layout,
      this.phase,
      this.services.quality.tier,
      this.services.quality.allowTextureDetail,
      this.services.profile.get().cosmetics.style,
    );
  }

  exit(): void {
    this.services.analytics.track('lobby_exit');
    this.ambient.clear();
  }

  update(dt: number): void {
    this.pulse += dt;
    const nextPhase = townPhaseAt(new Date().getHours());
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.phaseFlash = 1;
      this.art.ensure(
        this.layout,
        this.phase,
        this.services.quality.tier,
        this.services.quality.allowTextureDetail,
        this.services.profile.get().cosmetics.style,
      );
    }
    if (this.phaseFlash > 0) this.phaseFlash = Math.max(0, this.phaseFlash - dt * 4.2);

    const profile = this.services.profile.get();
    if (profile.residents.length !== this.residentCount) {
      this.residentCount = profile.residents.length;
      this.residentPalettes = profile.residents.map((resident) => resident.palette);
      this.residents.sync(this.residentCount, this.residentPalettes, this.layout);
    }
    const halfView = this.layout.width / (2 * this.camera.zoom);
    this.residents.update(
      dt,
      this.layout,
      { minX: this.camera.x - halfView, maxX: this.camera.x + halfView },
      this.services.quality.allowSceneMotion,
    );

    this.ambient.update(dt, {
      layout: this.layout,
      camera: this.camera,
      night: this.phase === 'night',
      reducedMotion: this.services.quality.reducedMotion,
      sceneMotion: this.services.quality.allowSceneMotion,
      fountainLevel: profile.cosmetics.build.fountain,
      lightsLevel: profile.cosmetics.build.lights,
      weather: findWeather(profile.cosmetics.weather)?.id ?? 'clear',
    });
  }

  private layoutDock(): void {
    const dock = this.layout.dockRect;
    const gap = 8;
    // 场馆入口都在王都街道上；Dock 只放全局功能，避免大厅失去意义。
    const labels: Array<[NavId, string]> = [
      ['rank', '排行榜'],
      ['daily', '每日'],
      ['collection', '收集册'],
      ['shop', '王都小铺'],
    ];
    const itemW = (dock.w - gap * (labels.length - 1)) / labels.length;
    this.navs = labels.map(([id, label], index) => ({
      id,
      label,
      rect: {
        x: dock.x + index * (itemW + gap),
        y: dock.y + 6,
        w: itemW,
        h: dock.h - 12,
      },
    }));
    this.walletRect = {
      x: this.layout.width - 40 - 64 - 16 - 200,
      y: this.layout.headerTop + 16,
      w: 200,
      h: 58,
    };
    this.settingsRect = {
      x: this.layout.width - 40 - 64,
      y: this.layout.headerTop + 10,
      w: 64,
      h: 64,
    };
  }

  private ensureResident(): void {
    const today = this.services.time.todayKey();
    const profile = this.services.profile.get();
    if (profile.lastResidentDate === today) return;
    this.services.profile.addResident({
      id: `resident-${today}`,
      palette: hashString(today) % 6,
      since: today,
    });
    this.services.profile.markResidentDate(today);
  }

  render(renderer: Renderer): void {
    const ctx = renderer.ctx;
    const profile = this.services.profile.get();
    const style = findStyle(profile.cosmetics.style)?.id ?? 'classic';
    const weather = findWeather(profile.cosmetics.weather)?.id ?? 'clear';
    const palette = townPalette(this.phase, style);
    this.art.ensure(
      this.layout,
      this.phase,
      this.services.quality.tier,
      this.services.quality.allowTextureDetail,
      style,
    );

    drawTown(ctx, this.layout, {
      palette,
      phase: this.phase,
      style,
      camera: this.camera,
      art: this.art,
      time: this.pulse,
      reducedMotion: this.services.quality.reducedMotion,
      quality: this.services.quality.tier,
      sceneMotion: this.services.quality.allowSceneMotion,
      textureDetail: this.services.quality.allowTextureDetail,
      iconStyle: profile.cosmetics.iconStyle,
      outfit: profile.cosmetics.royalOutfit as RoyalOutfitId,
      mood: this.royalMood(),
      build: profile.cosmetics.build,
      residents: this.residents.actors,
      pressedId: this.pressedStructureId,
    });

    this.ambient.draw(ctx);
    drawWeather(ctx, {
      weather,
      width: this.layout.width,
      height: this.layout.height,
      groundTop: this.layout.groundTop,
      dockTop: this.layout.dockRect.y,
      time: this.pulse,
      quality: this.services.quality.tier,
      reducedMotion: this.services.quality.reducedMotion,
      night: this.phase === 'night',
    });

    if (this.phaseFlash > 0.001) {
      ctx.save();
      ctx.globalAlpha = Math.sin((1 - this.phaseFlash) * Math.PI) * 0.34;
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(0, 0, this.layout.width, this.layout.height);
      ctx.restore();
    }

    drawHeader(ctx, {
      layout: this.layout,
      coins: profile.coins,
      displayName: profile.displayName,
      phase: this.phase,
      pressedNav: this.pressedNav,
      navs: this.navs as ChromeNav[],
      walletRect: this.walletRect,
      settingsRect: this.settingsRect,
    });
    drawDock(ctx, {
      layout: this.layout,
      coins: profile.coins,
      displayName: profile.displayName,
      phase: this.phase,
      pressedNav: this.pressedNav,
      navs: this.navs as ChromeNav[],
      walletRect: this.walletRect,
      settingsRect: this.settingsRect,
    });
    if (this.toast && Date.now() < this.toast.until) {
      drawLobbyToast(ctx, this.layout, this.toast.text);
    }
    if (!this.modal && Date.now() < this.panHintUntil) {
      drawPanHint(ctx, this.layout);
    }

    if (this.modal === 'settings') this.drawSettings(ctx, renderer.width, renderer.height);
    if (this.modal === 'privacy') this.drawPrivacy(ctx, renderer.width, renderer.height);
    if (this.modal === 'rank') this.drawRank(ctx, renderer.width, renderer.height);
    if (this.modal === 'shop') this.drawShop(ctx, renderer.width, renderer.height);
    if (this.modal === 'name') this.drawNamePicker(ctx, renderer.width, renderer.height);
    if (this.modal === 'storage') this.drawStorage(ctx, renderer.width, renderer.height);
    if (this.modal === 'daily') this.drawDaily(ctx, renderer.width, renderer.height);
  }

  onTap(x: number, y: number): void {
    if (this.modal === 'settings') {
      this.handleSettingsTap(x, y);
      return;
    }
    if (this.modal === 'privacy') {
      if (pointInRect(x, y, this.privacyCloseRect)) {
        this.services.feedback.tap();
        this.modal = 'settings';
      }
      return;
    }
    if (this.modal === 'rank') {
      if (pointInRect(x, y, this.rankCloseRect)) {
        this.services.feedback.tap();
        this.modal = null;
        return;
      }
      const tab = this.rankTabs.find((item) => pointInRect(x, y, item.rect));
      if (tab && tab.id !== this.rankGameId) {
        this.services.feedback.tap();
        this.loadRank(tab.id);
      }
      return;
    }
    if (this.modal === 'shop') {
      this.handleShopTap(x, y);
      return;
    }
    if (this.modal === 'name') {
      this.handleNameTap(x, y);
      return;
    }
    if (this.modal === 'storage') {
      this.handleStorageTap(x, y);
      return;
    }
    if (this.modal === 'daily') {
      this.handleDailyTap(x, y);
      return;
    }

    if (pointInRect(x, y, this.settingsRect)) {
      this.services.feedback.tap();
      this.modal = 'settings';
      return;
    }
    if (pointInRect(x, y, this.walletRect)) {
      this.services.feedback.tap();
      this.showToast('王都币来自小游戏、每日委托和排行榜，只能兑换外观');
      return;
    }

    const world = screenToWorld(
      this.camera,
      x,
      y,
      this.layout.width,
      this.layout.focusY,
    );
    if (isOverRoyal(this.layout, world.x, world.y)) {
      this.services.feedback.select();
      this.ambient.burst('petal', x, y, 0.7);
      this.openShop('outfit');
      return;
    }

    const structure = townStructureAt(this.layout, world.x, world.y);
    if (structure && structure.kind === 'facility') {
      this.services.feedback.tap();
      this.ambient.burst('sparkle', x, y, 0.7);
      this.openStorage();
      return;
    }
    const building = structure ? structure.building : null;
    if (building) {
      if (building.entry.status === 'playable') {
        this.services.feedback.tap();
        const center = worldToScreen(
          this.camera,
          building.base.x,
          building.base.y - 110 * building.scale,
          this.layout.width,
          this.layout.focusY,
        );
        this.ambient.burst('sparkle', center.x, center.y, 0.9);
        this.services.analytics.track('venue_click', { gameId: building.entry.id });
        this.services.openGame(building.entry.id);
      } else {
        this.services.feedback.invalid();
        this.ambient.burst('dust', x, y, 0.6);
        this.showToast(`${building.entry.title}正在装修中，敬请期待`);
      }
      return;
    }

    for (const nav of this.navs) {
      if (!pointInRect(x, y, nav.rect)) continue;
      this.handleNav(nav.id);
      return;
    }
  }

  onPress(point: PointerPoint): void {
    if (this.modal) return;
    this.pressedNav = this.navs.find((nav) => pointInRect(point.x, point.y, nav.rect))?.id ?? null;
    this.lastDrag = null;
    this.pinchBaseZoom = null;
    const world = screenToWorld(this.camera, point.x, point.y, this.layout.width, this.layout.focusY);
    const structure = townStructureAt(this.layout, world.x, world.y);
    this.pressedStructureId = structure
      ? structure.kind === 'venue'
        ? structure.building.id
        : structure.facility.id
      : null;
    if (structure) this.services.feedback.press();
  }

  onDrag(point: PointerPoint): void {
    if (this.modal) return;
    if (point.y < this.layout.headerBottom || point.y > this.layout.dockRect.y) {
      this.lastDrag = null;
      return;
    }
    this.panHintUntil = 0;
    if (!this.lastDrag) {
      this.lastDrag = { x: point.x, y: point.y };
      return;
    }
    const dx = point.x - this.lastDrag.x;
    this.lastDrag = { x: point.x, y: point.y };
    this.camera = panCamera(this.camera, dx, this.layout.cameraBounds);
  }

  onPinch(event: PinchEvent): void {
    if (this.modal) return;
    this.panHintUntil = 0;
    if (this.pinchBaseZoom === null) this.pinchBaseZoom = this.camera.zoom;
    this.camera = zoomAt(
      this.camera,
      this.pinchBaseZoom * event.scale,
      event.centerX,
      event.centerY,
      this.layout.cameraBounds,
      this.layout.focusY,
    );
  }

  onRelease(): void {
    this.pressedNav = null;
    this.pressedStructureId = null;
    this.lastDrag = null;
    this.pinchBaseZoom = null;
  }

  private handleNav(id: NavId): void {
    if (id === 'rank') {
      this.services.feedback.tap();
      this.openRank();
      return;
    }
    if (id === 'shop') {
      this.services.feedback.tap();
      this.openShop(this.shopTab);
      return;
    }
    if (id === 'daily') {
      this.services.feedback.tap();
      this.openDaily();
      return;
    }
    this.services.feedback.invalid();
    this.showToast('收集册即将开放');
  }

  private openStorage(): void {
    this.modal = 'storage';
    this.storageSelected = [];
    this.storageTargets = [];
    this.services.analytics.track('storage_open', { from: 'building' });
  }

  private handleStorageTap(x: number, y: number): void {
    const hit = this.findTarget<StorageHit>(this.storageTargets, x, y);
    if (!hit) return;
    const profile = this.services.profile;
    if (hit.kind === 'close') {
      this.services.feedback.tap();
      this.modal = null;
      this.storageTargets = [];
      return;
    }
    if (hit.kind === 'tab') {
      this.services.feedback.tap();
      this.storageTab = hit.tab;
      return;
    }
    if (hit.kind === 'clear') {
      this.services.feedback.tap();
      this.storageSelected = [];
      return;
    }
    if (hit.kind === 'select-all') {
      this.services.feedback.select();
      const ids = INGREDIENTS.filter(
        (item) => item.kind === this.storageTab && (profile.pantry()[item.id] ?? 0) > 0,
      ).map((item) => item.id);
      this.storageSelected = ids;
      return;
    }
    if (hit.kind === 'goods') {
      this.services.feedback.tap();
      this.storageSelected = this.storageSelected.includes(hit.id)
        ? this.storageSelected.filter((id) => id !== hit.id)
        : [...this.storageSelected, hit.id];
      return;
    }
    // sell
    const result = sellSelection(profile.pantry(), this.storageSelected);
    if (result.count <= 0) {
      this.services.feedback.invalid();
      return;
    }
    profile.addCoins(result.coins);
    profile.save();
    this.storageSelected = [];
    this.services.feedback.reward();
    this.showToast(`卖出 ${result.count} 件货物，+${compactNumber(result.coins)} 王都币`);
  }

  private openDaily(): void {
    this.modal = 'daily';
    this.dailyTargets = [];
    const state = this.services.profile.dailySync();
    this.dailyOrders = pickDailyOrders(state.date || dayKey(Date.now()));
    this.services.analytics.track('daily_open', { claimed: state.claimed.length });
  }

  private handleDailyTap(x: number, y: number): void {
    const hit = this.findTarget<{ kind: 'close' | 'claim'; id?: string }>(this.dailyTargets, x, y);
    if (!hit) return;
    if (hit.kind === 'close') {
      this.services.feedback.tap();
      this.modal = null;
      this.dailyTargets = [];
      return;
    }
    const order = this.dailyOrders.find((item) => item.id === hit.id);
    if (!order) return;
    const profile = this.services.profile;
    const state = profile.dailySync();
    if (state.claimed.includes(order.id)) return;
    if (!profile.takePantry(order.needs)) {
      this.services.feedback.invalid();
      this.showToast('仓库里的货物还不够，先去农场或厨房做一点');
      return;
    }
    profile.addCoins(order.coins);
    profile.addProsperity(order.prosperity);
    const next = profile.markDailyClaimed(order.id);
    const cleared = next.claimed.length >= DAILY_ORDER_COUNT;
    if (cleared) {
      profile.addCoins(DAILY_CLEAR_COINS);
      profile.addProsperity(DAILY_CLEAR_PROSPERITY);
    }
    profile.save();
    this.services.feedback.reward();
    this.showToast(
      cleared
        ? `${order.title}完成，全清 +${order.coins + DAILY_CLEAR_COINS} 王都币`
        : `${order.title}完成，+${order.coins} 王都币`,
    );
  }

  private findTarget<T>(targets: Array<{ hit: T; rect: Rect }>, x: number, y: number): T | null {
    for (const target of targets) {
      if (pointInRect(x, y, target.rect)) return target.hit;
    }
    return null;
  }

  private drawStorage(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const profile = this.services.profile.get();
    this.storageTargets = drawStoragePanel(ctx, width, height, {
      coins: profile.coins,
      prosperity: profile.prosperity,
      pantry: profile.pantry,
      selected: this.storageSelected,
      tab: this.storageTab,
      ingredientUnlocks: profile.ingredientUnlocks,
    });
  }

  private drawDaily(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const profile = this.services.profile.get();
    const state = profile.daily;
    if (this.dailyOrders.length === 0) {
      this.dailyOrders = pickDailyOrders(state.date || dayKey(Date.now()));
    }
    this.dailyTargets = drawDailyPanel(ctx, width, height, {
      coins: profile.coins,
      prosperity: profile.prosperity,
      pantry: profile.pantry,
      orders: this.dailyOrders,
      claimed: state.claimed,
      streak: state.streak,
    });
  }

  private royalMood(): RoyalMood {
    const loop = this.pulse % 14;
    return loop > 11 ? 'happy' : 'idle';
  }

  private openShop(tab: ShopTab): void {
    this.modal = 'shop';
    this.shopTab = tab;
    this.shopHits = [];
  }

  private handleShopTap(x: number, y: number): void {
    for (const hit of this.shopHits) {
      if (!pointInRect(x, y, hit.rect)) continue;
      if (hit.kind === 'close') {
        this.services.feedback.tap();
        this.modal = null;
        return;
      }
      if (hit.kind === 'tab') {
        this.services.feedback.tap();
        this.shopTab = hit.id as ShopTab;
        return;
      }
      const profile = this.services.profile;
      let result: ShopResult;
      if (hit.kind === 'build') {
        result = upgradeBuildTrack(profile, hit.id as 'fountain' | 'lights' | 'garden');
      } else if (hit.kind === 'build-level') {
        result = selectBuildTrackLevel(
          profile,
          hit.id as 'fountain' | 'lights' | 'garden',
          hit.level ?? 0,
        );
      } else if (hit.kind === 'outfit') {
        result = buyOrEquipOutfit(profile, hit.id);
      } else if (hit.kind === 'weather') {
        result = selectWeather(profile, hit.id);
      } else if (hit.kind === 'style') {
        result = buyOrEquipStyle(profile, hit.id);
        if (result === 'bought' || result === 'equipped') this.art.invalidate();
      } else if (hit.kind === 'tile') {
        result = buyOrEquipTile(profile, hit.id);
      } else {
        result = buyOrEquipIcon(profile, hit.id);
      }
      if (result === 'bought') this.services.feedback.reward();
      else if (result === 'poor') this.services.feedback.invalid();
      else this.services.feedback.tap();
      this.showToast(resultMessage(result));
      return;
    }
  }

  private drawShop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(58,46,42,0.35)';
    ctx.fillRect(0, 0, width, height);

    const panel = { x: 36, y: height / 2 - 360, w: width - 72, h: 720 };
    drawPaperPanel(ctx, panel, {
      fill: COLORS.paper,
      radius: RADIUS.xl,
      stitch: true,
      seed: 821,
    });
    this.shopHits = [];

    drawText(ctx, '王都小铺', panel.x + 32, panel.y + 50, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '只兑换外观，不影响分数与公平', panel.x + 32, panel.y + 84, {
      size: 16,
      color: COLORS.inkSoft,
    });
    drawWangduCoin(ctx, panel.x + panel.w - 118, panel.y + 50, 15);
    drawText(ctx, `${this.services.profile.get().coins}`, panel.x + panel.w - 96, panel.y + 50, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    const tabs: Array<[ShopTab, string]> = [
      ['build', '建设'],
      ['outfit', '装扮'],
      ['weather', '天气'],
      ['style', '风格'],
      ['icon', '图标'],
      ['tile', '方块'],
    ];
    const tabRects = drawSegmented(
      ctx,
      { x: panel.x + 32, y: panel.y + 108, w: panel.w - 64, h: 48 },
      tabs.map(([, label]) => label),
      tabs.findIndex(([id]) => id === this.shopTab),
      COLORS.jade,
    );
    tabs.forEach(([id], index) => {
      this.shopHits.push({ kind: 'tab', id, rect: tabRects[index] });
    });

    if (this.shopTab === 'build') this.drawBuildTab(ctx, panel);
    else if (this.shopTab === 'outfit') this.drawOutfitTab(ctx, panel);
    else if (this.shopTab === 'weather') this.drawWeatherTab(ctx, panel);
    else if (this.shopTab === 'style') this.drawStyleTab(ctx, panel);
    else if (this.shopTab === 'icon') this.drawIconTab(ctx, panel);
    else this.drawTileTab(ctx, panel);

    const close = { x: panel.x + 32, y: panel.y + panel.h - 70, w: panel.w - 64, h: 50 };
    drawStickerButton(ctx, close, '关闭', { fontSize: FONT.body, seed: 823 });
    this.shopHits.push({ kind: 'close', id: 'close', rect: close });
  }

  private drawBuildTab(ctx: CanvasRenderingContext2D, panel: Rect): void {
    const state = this.services.profile.get().cosmetics;
    BUILD_TRACKS.forEach((track, index) => {
      const row = {
        x: panel.x + 24,
        y: panel.y + 166 + index * 140,
        w: panel.w - 48,
        h: 128,
      };
      inkRoundRect(ctx, row.x, row.y, row.w, row.h, RADIUS.lg, 'rgba(255,253,248,0.8)', {
        stroke: 'rgba(58,46,42,0.14)',
        width: 1.8,
        seed: 827 + index,
      });
      drawText(ctx, track.name, row.x + 20, row.y + 28, {
        size: FONT.body,
        weight: '700',
        color: COLORS.ink,
      });
      drawText(ctx, track.description, row.x + 20, row.y + 56, {
        size: 14,
        color: COLORS.inkSoft,
        maxWidth: row.w - 220,
      });

      const level = state.build[track.id];
      const max = state.buildMax[track.id];
      for (let i = 0; i < 4; i += 1) {
        const unlocked = i <= max;
        const selected = i === level;
        const pill = { x: row.x + 20 + i * 40, y: row.y + 78, w: 34, h: 30 };
        inkRoundRect(
          ctx,
          pill.x,
          pill.y,
          pill.w,
          pill.h,
          9,
          selected ? COLORS.jade : unlocked ? 'rgba(168,230,207,0.55)' : 'rgba(58,46,42,0.07)',
          {
            stroke: selected ? COLORS.teal : 'rgba(58,46,42,0.14)',
            width: selected ? 2 : 1.2,
            seed: 829 + index * 7 + i,
          },
        );
        drawText(ctx, `${i}`, pill.x + pill.w / 2, pill.y + 15, {
          size: 14,
          weight: '700',
          color: selected ? COLORS.paper : unlocked ? COLORS.ink : 'rgba(58,46,42,0.28)',
          align: 'center',
        });
        if (unlocked) {
          this.shopHits.push({
            kind: 'build-level',
            id: track.id,
            level: i,
            rect: { x: pill.x - 2, y: pill.y - 6, w: pill.w + 4, h: pill.h + 12 },
          });
        }
      }
      drawText(ctx, `展示：${track.levelNames[level]}`, row.x + 190, row.y + 92, {
        size: 15,
        color: COLORS.jade,
        weight: '700',
        maxWidth: row.w - 330,
      });
      drawText(ctx, `已解锁 Lv.${max}`, row.x + 190, row.y + 112, {
        size: 12,
        color: COLORS.inkSoft,
      });

      const cost = nextBuildCost(track, max);
      const button = {
        x: row.x + row.w - 134,
        y: row.y + 76,
        w: 112,
        h: 44,
      };
      drawStickerButton(ctx, button, cost === null ? '已满级' : `${cost} 王都币`, {
        fill: cost === null ? 'rgba(58,46,42,0.10)' : COLORS.gold,
        textColor: cost === null ? COLORS.inkSoft : COLORS.honeyDeep,
        fontSize: 16,
        radius: RADIUS.md,
        disabled: cost === null,
        seed: 831 + index,
      });
      if (cost !== null) {
        this.shopHits.push({ kind: 'build', id: track.id, rect: button });
      }
    });
  }

  private drawWeatherTab(ctx: CanvasRenderingContext2D, panel: Rect): void {
    const active = this.services.profile.get().cosmetics.weather;
    const cardW = (panel.w - 64) / 2;
    WEATHERS.forEach((weather, index) => {
      const col = index % 2;
      const rowIndex = Math.floor(index / 2);
      const card = {
        x: panel.x + 24 + col * (cardW + 16),
        y: panel.y + 170 + rowIndex * 196,
        w: cardW,
        h: 180,
      };
      const equipped = active === weather.id;
      inkRoundRect(
        ctx,
        card.x,
        card.y,
        card.w,
        card.h,
        RADIUS.lg,
        equipped ? 'rgba(168,230,207,0.34)' : 'rgba(255,253,248,0.82)',
        {
          stroke: equipped ? 'rgba(47,143,123,0.55)' : 'rgba(58,46,42,0.14)',
          width: equipped ? 2.4 : 1.8,
          seed: 871 + index,
        },
      );
      const cx = card.x + card.w / 2;
      this.drawWeatherPreview(ctx, weather.id, cx, card.y + 62, 34, this.pulse);
      drawText(ctx, weather.name, card.x + 18, card.y + 112, {
        size: FONT.body,
        weight: '700',
        color: COLORS.ink,
      });
      drawText(ctx, weather.description, card.x + 18, card.y + 140, {
        size: 14,
        color: COLORS.inkSoft,
        maxWidth: card.w - 36,
      });
      drawText(ctx, equipped ? '使用中' : '免费使用', card.x + 18, card.y + 166, {
        size: 15,
        color: equipped ? COLORS.jade : COLORS.honeyDeep,
        weight: '700',
      });
      this.shopHits.push({ kind: 'weather', id: weather.id, rect: card });
    });
  }

  private drawWeatherPreview(
    ctx: CanvasRenderingContext2D,
    id: string,
    cx: number,
    cy: number,
    size: number,
    time: number,
  ): void {
    ctx.save();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    if (id === 'clear') {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = COLORS.honey;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8 + time * 0.25;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * size * 0.66, cy + Math.sin(a) * size * 0.66);
        ctx.lineTo(cx + Math.cos(a) * size * 0.86, cy + Math.sin(a) * size * 0.86);
        ctx.stroke();
      }
    } else if (id === 'rain') {
      ctx.fillStyle = COLORS.sky;
      ctx.beginPath();
      ctx.arc(cx - 14, cy, 18, 0, Math.PI * 2);
      ctx.arc(cx + 8, cy - 8, 22, 0, Math.PI * 2);
      ctx.arc(cx + 24, cy + 4, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = COLORS.waterDeep;
      ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i += 1) {
        const fall = (time * 42 + (i + 1) * 13) % 34;
        ctx.beginPath();
        ctx.moveTo(cx + i * 16, cy + 12 + fall);
        ctx.lineTo(cx + i * 16 - 5, cy + 24 + fall);
        ctx.stroke();
      }
    } else if (id === 'snow') {
      ctx.strokeStyle = COLORS.waterDeep;
      for (let i = 0; i < 3; i += 1) {
        const a = (Math.PI * i) / 3;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(a) * 20, cy - Math.sin(a) * 20);
        ctx.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
        ctx.stroke();
      }
      ctx.fillStyle = COLORS.paper;
      for (let i = 0; i < 3; i += 1) {
        const fall = (time * 16 + i * 12) % 32;
        const x = cx - 20 + i * 20 + Math.sin(time * 1.4 + i) * 3;
        ctx.beginPath();
        ctx.arc(x, cy + 12 + fall, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(95,163,188,0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 5; i += 1) {
        const fall = (time * 22 + i * 9) % 40;
        drawPetal(
          ctx,
          cx - 24 + i * 12 + Math.sin(time * 1.2 + i) * 5,
          cy - 14 + fall,
          6.4,
          i % 2 === 0 ? COLORS.petal : COLORS.honey,
        );
      }
    }
    ctx.restore();
  }

  private drawStyleTab(ctx: CanvasRenderingContext2D, panel: Rect): void {
    const state = this.services.profile.get().cosmetics;
    const cardW = (panel.w - 64) / 2;
    STYLES.forEach((style, index) => {
      const col = index % 2;
      const rowIndex = Math.floor(index / 2);
      const card = {
        x: panel.x + 24 + col * (cardW + 16),
        y: panel.y + 170 + rowIndex * 140,
        w: cardW,
        h: 126,
      };
      const owned = state.ownedStyles.includes(style.id);
      const equipped = state.style === style.id;
      inkRoundRect(
        ctx,
        card.x,
        card.y,
        card.w,
        card.h,
        RADIUS.lg,
        equipped ? 'rgba(242,193,78,0.24)' : 'rgba(255,253,248,0.82)',
        {
          stroke: equipped ? 'rgba(185,134,47,0.55)' : 'rgba(58,46,42,0.14)',
          width: equipped ? 2.4 : 1.8,
          seed: 891 + index,
        },
      );
      style.swatches.forEach((color, swatchIndex) => {
        ctx.beginPath();
        ctx.arc(card.x + 24 + swatchIndex * 24, card.y + 28, 9, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(58,46,42,0.18)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      const preview = { x: card.x + card.w - 102, y: card.y + 14, w: 86, h: 58 };
      inkRoundRect(ctx, preview.x, preview.y, preview.w, preview.h, 10, style.swatches[0], {
        stroke: 'rgba(58,46,42,0.18)',
        width: 1.4,
        seed: 901 + index,
      });
      inkRoundRect(
        ctx,
        preview.x + 2,
        preview.y + 34,
        preview.w - 4,
        22,
        8,
        style.swatches[2],
        { width: 0 },
      );
      ctx.beginPath();
      ctx.moveTo(preview.x + 24, preview.y + 38);
      ctx.lineTo(preview.x + 42, preview.y + 22);
      ctx.lineTo(preview.x + 62, preview.y + 38);
      ctx.closePath();
      ctx.fillStyle = style.swatches[1];
      ctx.fill();
      inkRoundRect(ctx, preview.x + 34, preview.y + 38, 18, 16, 3, COLORS.paper, { width: 0 });
      ctx.beginPath();
      ctx.arc(preview.x + 72, preview.y + 16, 6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.gold;
      ctx.fill();
      drawText(ctx, style.name, card.x + 16, card.y + 58, {
        size: FONT.body,
        weight: '700',
        color: COLORS.ink,
      });
      drawText(ctx, style.description, card.x + 16, card.y + 82, {
        size: 13,
        color: COLORS.inkSoft,
        maxWidth: card.w - 122,
      });
      const status = equipped ? '使用中' : owned ? '点击使用' : `${style.price} 王都币`;
      drawText(ctx, status, card.x + 16, card.y + 108, {
        size: 15,
        color: equipped ? COLORS.jade : owned ? COLORS.inkSoft : COLORS.honeyDeep,
        weight: '700',
      });
      this.shopHits.push({ kind: 'style', id: style.id, rect: card });
    });
  }

  private drawOutfitTab(ctx: CanvasRenderingContext2D, panel: Rect): void {
    const state = this.services.profile.get().cosmetics;
    const cardW = (panel.w - 48 - 24) / 2;
    OUTFITS.forEach((outfit, index) => {
      const col = index % 2;
      const rowIndex = Math.floor(index / 2);
      const card = {
        x: panel.x + 24 + col * (cardW + 24),
        y: panel.y + 170 + rowIndex * 188,
        w: cardW,
        h: 172,
      };
      const owned = state.ownedOutfits.includes(outfit.id);
      const equipped = state.royalOutfit === outfit.id;
      inkRoundRect(
        ctx,
        card.x,
        card.y,
        card.w,
        card.h,
        RADIUS.lg,
        equipped ? 'rgba(242,193,78,0.22)' : 'rgba(255,253,248,0.82)',
        {
          stroke: equipped ? 'rgba(185,134,47,0.55)' : 'rgba(58,46,42,0.14)',
          width: equipped ? 2.4 : 1.8,
          seed: 841 + index,
        },
      );
      drawRoyalPair(
        ctx,
        card.x + card.w / 2,
        card.y + 104,
        0.42,
        outfit.id as RoyalOutfitId,
        'happy',
        this.pulse,
        this.services.quality.reducedMotion,
      );
      drawText(ctx, outfit.name, card.x + 16, card.y + 124, {
        size: FONT.body,
        weight: '700',
        color: COLORS.ink,
      });
      const status = equipped ? '使用中' : owned ? '点击使用' : `${outfit.price} 王都币`;
      drawText(ctx, status, card.x + 16, card.y + 154, {
        size: 16,
        color: equipped ? COLORS.jade : owned ? COLORS.inkSoft : COLORS.honeyDeep,
        weight: equipped ? '700' : 'normal',
      });
      this.shopHits.push({ kind: 'outfit', id: outfit.id, rect: card });
    });
  }

  private drawIconTab(ctx: CanvasRenderingContext2D, panel: Rect): void {
    const state = this.services.profile.get().cosmetics;
    const cardW = (panel.w - 48 - 24) / 3;
    ICON_STYLES.forEach((icon, index) => {
      const card = {
        x: panel.x + 24 + index * (cardW + 12),
        y: panel.y + 176,
        w: cardW,
        h: 300,
      };
      const owned = state.ownedIcons.includes(icon.id);
      const equipped = state.iconStyle === icon.id;
      inkRoundRect(
        ctx,
        card.x,
        card.y,
        card.w,
        card.h,
        RADIUS.lg,
        equipped ? 'rgba(242,193,78,0.22)' : 'rgba(255,253,248,0.82)',
        {
          stroke: equipped ? 'rgba(185,134,47,0.55)' : 'rgba(58,46,42,0.14)',
          width: equipped ? 2.4 : 1.8,
          seed: 851 + index,
        },
      );
      ctx.beginPath();
      ctx.arc(card.x + card.w / 2, card.y + 84, 54, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.paper;
      ctx.fill();
      drawGameIcon(
        ctx,
        'match3',
        card.x + card.w / 2,
        card.y + 84,
        58,
        { main: COLORS.jade, soft: COLORS.mint, deep: COLORS.teal },
        icon.id,
      );
      drawText(ctx, icon.name, card.x + card.w / 2, card.y + 168, {
        size: FONT.body,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
      });
      drawText(ctx, icon.description, card.x + card.w / 2, card.y + 204, {
        size: 14,
        color: COLORS.inkSoft,
        align: 'center',
        maxWidth: card.w - 28,
      });
      const status = equipped ? '使用中' : owned ? '点击使用' : `${icon.price} 王都币`;
      drawText(ctx, status, card.x + card.w / 2, card.y + 254, {
        size: 16,
        color: equipped ? COLORS.jade : owned ? COLORS.inkSoft : COLORS.honeyDeep,
        align: 'center',
        weight: '700',
      });
      this.shopHits.push({ kind: 'icon', id: icon.id, rect: card });
    });
  }

  private drawTileTab(ctx: CanvasRenderingContext2D, panel: Rect): void {
    const state = this.services.profile.get().cosmetics;
    const cardW = (panel.w - 48 - 12) / 2;
    const cardH = 220;
    TILE_SKINS.forEach((skin, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const card = {
        x: panel.x + 24 + col * (cardW + 12),
        y: panel.y + 170 + row * (cardH + 10),
        w: cardW,
        h: cardH,
      };
      const owned = state.ownedTiles.includes(skin.id);
      const equipped = state.tileStyle === skin.id;
      inkRoundRect(
        ctx,
        card.x,
        card.y,
        card.w,
        card.h,
        RADIUS.lg,
        equipped ? 'rgba(242,193,78,0.22)' : 'rgba(255,253,248,0.82)',
        {
          stroke: equipped ? 'rgba(185,134,47,0.55)' : 'rgba(58,46,42,0.14)',
          width: equipped ? 2.4 : 1.8,
          seed: 861 + index,
        },
      );

      const size = 30;
      const gap = 4;
      const stripW = skin.sprites.length * size + (skin.sprites.length - 1) * gap;
      const stripX = card.x + (card.w - stripW) / 2;
      skin.sprites.forEach((id, tileIndex) => {
        const frame = this.services.atlas.frame(id);
        ctx.drawImage(
          frame.canvas,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          stripX + tileIndex * (size + gap),
          card.y + 44,
          size,
          size,
        );
      });

      drawText(ctx, skin.name, card.x + card.w / 2, card.y + 116, {
        size: FONT.body,
        weight: '700',
        color: COLORS.ink,
        align: 'center',
        maxWidth: card.w - 20,
      });
      drawText(ctx, skin.description, card.x + card.w / 2, card.y + 150, {
        size: 13,
        color: COLORS.inkSoft,
        align: 'center',
        maxWidth: card.w - 28,
      });
      const status = equipped
        ? '使用中'
        : owned
          ? '点击使用'
          : skin.unlockHint
            ? skin.unlockHint
            : skin.price > 0
              ? `${skin.price} 王都币`
              : '免费';
      drawText(ctx, status, card.x + card.w / 2, card.y + 192, {
        size: 14,
        color: equipped ? COLORS.jade : owned ? COLORS.inkSoft : COLORS.honeyDeep,
        align: 'center',
        maxWidth: card.w - 28,
        weight: '700',
      });
      this.shopHits.push({ kind: 'tile', id: skin.id, rect: card });
    });
  }

  private openNamePicker(): void {
    const profile = this.services.profile.get();
    this.nameCandidates = generateNameCandidates(profile.playerId, 3);
    this.nameSelected = 0;
    this.modal = 'name';
    this.nameHits = [];
  }

  private useName(): void {
    if (this.nameBusy || this.nameCandidates.length === 0) return;
    const chosen = this.nameCandidates[this.nameSelected] ?? this.nameCandidates[0];
    this.services.profile.setDisplayName(chosen, false);
    this.modal = null;
    this.showToast('名字已更换');
    this.services.feedback.reward();

    if (!this.services.cloud.online) return;
    this.nameBusy = true;
    void this.services.cloud.rename(chosen).then((name) => {
      this.nameBusy = false;
      if (!name) return;
      this.services.profile.setDisplayName(name, true);
      if (name !== chosen) this.showToast(`云端已换成唯一名字：${name}`);
    });
  }

  private drawNamePicker(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(58,46,42,0.38)';
    ctx.fillRect(0, 0, width, height);
    const panel = { x: 80, y: height / 2 - 300, w: width - 160, h: 600 };
    drawPaperPanel(ctx, panel, {
      fill: COLORS.paper,
      radius: RADIUS.xl,
      stitch: true,
      seed: 861,
    });
    this.nameHits = [];

    drawText(ctx, '王都居民名册', panel.x + 32, panel.y + 56, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '名字都来自王都名册，不会和别的居民重复', panel.x + 32, panel.y + 92, {
      size: 16,
      color: COLORS.inkSoft,
    });
    drawText(ctx, this.services.profile.get().displayName, panel.x + 32, panel.y + 138, {
      size: FONT.subtitle,
      weight: '700',
      color: COLORS.jade,
    });

    this.nameCandidates.forEach((name, index) => {
      const rect = {
        x: panel.x + 32,
        y: panel.y + 172 + index * 88,
        w: panel.w - 64,
        h: 72,
      };
      const selected = index === this.nameSelected;
      inkRoundRect(
        ctx,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        RADIUS.md,
        selected ? 'rgba(47,143,123,0.16)' : 'rgba(255,253,248,0.8)',
        {
          stroke: selected ? COLORS.jade : 'rgba(58,46,42,0.14)',
          width: selected ? 2.4 : 1.8,
          seed: 863 + index,
        },
      );
      drawText(ctx, name, rect.x + 20, rect.y + 36, {
        size: FONT.body,
        weight: selected ? '700' : 'normal',
        color: COLORS.ink,
      });
      this.nameHits.push({ kind: 'candidate', index, rect });
    });

    const reroll = { x: panel.x + 32, y: panel.y + 458, w: 220, h: 56 };
    drawStickerButton(ctx, reroll, '换一批', {
      fill: COLORS.paper,
      textColor: COLORS.inkSoft,
      fontSize: FONT.body,
      radius: RADIUS.md,
      seed: 871,
    });
    this.nameHits.push({ kind: 'reroll', index: -1, rect: reroll });

    const use = { x: panel.x + panel.w - 252, y: panel.y + 458, w: 220, h: 56 };
    drawStickerButton(ctx, use, '使用这个名字', {
      fontSize: FONT.body,
      radius: RADIUS.md,
      seed: 873,
    });
    this.nameHits.push({ kind: 'use', index: -1, rect: use });

    const close = { x: panel.x + panel.w / 2 - 110, y: panel.y + panel.h - 70, w: 220, h: 46 };
    drawStickerButton(ctx, close, '关闭', {
      fill: COLORS.paper,
      textColor: COLORS.inkSoft,
      fontSize: 18,
      radius: RADIUS.md,
      seed: 877,
    });
    this.nameHits.push({ kind: 'close', index: -1, rect: close });
  }

  private handleNameTap(x: number, y: number): void {
    for (const hit of this.nameHits) {
      if (!pointInRect(x, y, hit.rect)) continue;
      if (hit.kind === 'candidate') {
        this.nameSelected = hit.index;
        this.services.feedback.tap();
      } else if (hit.kind === 'reroll') {
        this.services.feedback.tap();
        const profile = this.services.profile.get();
        this.nameCandidates = generateNameCandidates(profile.playerId, 3);
        this.nameSelected = 0;
      } else if (hit.kind === 'use') {
        this.useName();
      } else {
        this.services.feedback.tap();
        this.modal = 'settings';
      }
      return;
    }
  }

  private drawSettings(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(58,46,42,0.38)';
    ctx.fillRect(0, 0, width, height);

    const panel = { x: 62, y: Math.max(180, height / 2 - 440), w: width - 124, h: 880 };
    drawPaperPanel(ctx, panel, {
      fill: COLORS.paper,
      radius: RADIUS.xl,
      stitch: true,
      seed: 801,
    });

    drawText(ctx, '设置', panel.x + 32, panel.y + 50, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });
    drawWoodRibbon(ctx, { x: panel.x + panel.w - 150, y: panel.y + 30, w: 118, h: 30 }, '王都设置');

    const tabRects = drawSegmented(
      ctx,
      { x: panel.x + 28, y: panel.y + 78, w: panel.w - 56, h: 44 },
      ['声音', '画面', '数据'],
      this.settingsTab === 'sound' ? 0 : this.settingsTab === 'visual' ? 1 : 2,
      COLORS.jade,
    );
    this.tabSoundRect = tabRects[0];
    this.tabVisualRect = tabRects[1];
    this.tabDataRect = tabRects[2];

    const settings = this.services.profile.get().settings;
    const qualityIndex =
      settings.quality === 'high' ? 1 : settings.quality === 'mid' ? 2 : settings.quality === 'low' ? 3 : 0;

    if (this.settingsTab === 'sound') {
      this.nameRowRect = { x: panel.x + 28, y: panel.y + 142, w: panel.w - 56, h: 76 };
      inkRoundRect(ctx, this.nameRowRect.x, this.nameRowRect.y, this.nameRowRect.w, this.nameRowRect.h, RADIUS.md, 'rgba(255,253,248,0.8)', {
        stroke: 'rgba(58,46,42,0.14)',
        width: 1.8,
        seed: 807,
      });
      drawText(ctx, '名字', this.nameRowRect.x + 16, this.nameRowRect.y + 25, {
        size: 18,
        weight: '700',
        color: COLORS.ink,
      });
      drawText(ctx, this.services.profile.get().displayName, this.nameRowRect.x + 16, this.nameRowRect.y + 53, {
        size: 16,
        color: COLORS.inkSoft,
        maxWidth: 320,
      });
      this.changeNameRect = {
        x: this.nameRowRect.x + this.nameRowRect.w - 122,
        y: this.nameRowRect.y + 18,
        w: 104,
        h: 40,
      };
      drawStickerButton(ctx, this.changeNameRect, '更换', { fontSize: 16, seed: 809 });

      this.musicRect = { x: panel.x + 28, y: panel.y + 238, w: panel.w - 56, h: 70 };
      this.sfxRect = { x: panel.x + 28, y: panel.y + 318, w: panel.w - 56, h: 70 };
      this.hapticsRect = { x: panel.x + 28, y: panel.y + 398, w: panel.w - 56, h: 70 };
      this.motionRect = { x: panel.x + 28, y: panel.y + 478, w: panel.w - 56, h: 70 };
      drawSettingRow(ctx, this.musicRect, '音乐', '大厅与小游戏的背景音乐', settings.music);
      drawSettingRow(ctx, this.sfxRect, '音效', '点击、奖励与提示音', settings.sfx);
      drawSettingRow(ctx, this.hapticsRect, '震动', '消除与成功时的轻震动', settings.haptics);
      drawSettingRow(
        ctx,
        this.motionRect,
        '减少动效',
        '关闭粒子/缩放/震动，只保留必要淡入',
        settings.reducedMotion,
      );
      drawDivider(ctx, panel.x + 28, panel.y + 574, panel.w - 56);
      drawText(ctx, '音量与震动只影响反馈，不影响玩法结果。', panel.x + 34, panel.y + 606, {
        size: 15,
        color: COLORS.inkSoft,
      });
    } else if (this.settingsTab === 'visual') {
      this.performanceRect = { x: panel.x + 28, y: panel.y + 142, w: panel.w - 56, h: 70 };
      drawSettingRow(
        ctx,
        this.performanceRect,
        '性能模式',
        '一键低档：关环境粒子/场景动画/纸纹',
        settings.performanceMode,
        { accent: COLORS.honeyDeep },
      );

      drawText(ctx, '画面档位', panel.x + 34, panel.y + 238, {
        size: 16,
        weight: '700',
        color: COLORS.ink,
      });
      drawText(ctx, '自动按设备性能选择；手动档位会立即生效', panel.x + 34, panel.y + 262, {
        size: 13,
        color: COLORS.inkSoft,
      });
      this.qualityRects = drawSegmented(
        ctx,
        { x: panel.x + 28, y: panel.y + 282, w: panel.w - 56, h: 44 },
        ['自动', '高', '中', '低'],
        qualityIndex,
        COLORS.jade,
      );

      const disabled = settings.reducedMotion || settings.performanceMode;
      this.ambientRect = { x: panel.x + 28, y: panel.y + 346, w: panel.w - 56, h: 70 };
      this.sceneRect = { x: panel.x + 28, y: panel.y + 426, w: panel.w - 56, h: 70 };
      this.textureRect = { x: panel.x + 28, y: panel.y + 506, w: panel.w - 56, h: 70 };
      this.shakeRect = { x: panel.x + 28, y: panel.y + 586, w: panel.w - 56, h: 70 };
      drawSettingRow(ctx, this.ambientRect, '环境粒子', '花瓣、萤火虫、喷泉水花', settings.ambientEffects, { disabled });
      drawSettingRow(ctx, this.sceneRect, '场景动画', '云、喷泉、招牌、居民、烟雾', settings.sceneMotion, { disabled });
      drawSettingRow(ctx, this.textureRect, '纸纹与装饰', '纸纹、远景屋顶、前景小花', settings.textureDetail, { disabled });
      drawSettingRow(ctx, this.shakeRect, '屏幕震动', '奖励与失败时的轻震动', settings.screenShake, { disabled });

      const stats = this.services.debugStats?.();
      drawTapeNote(
        ctx,
        { x: panel.x + 60, y: panel.y + 676, w: panel.w - 120, h: 66 },
        [
          stats
            ? `当前 ${stats.tier} · ${stats.fps}fps · ${stats.particles} 粒子`
            : '当前画质由设备自动判断',
          '低端机建议开启性能模式',
        ],
        { align: 'center' },
      );
    } else {
      this.privacyRect = { x: panel.x + 28, y: panel.y + 146, w: panel.w - 56, h: 64 };
      this.deleteRect = { x: panel.x + 28, y: panel.y + 222, w: panel.w - 56, h: 64 };
      this.drawLinkRow(ctx, this.privacyRect, '隐私协议', '查看');
      this.drawLinkRow(ctx, this.deleteRect, '删除本地数据', '仅清除本机存档');

      drawDivider(ctx, panel.x + 28, panel.y + 318, panel.w - 56);
      const stats = this.services.debugStats?.();
      const cloudLine = `云服务：${this.cloudStatusText()}`;
      drawText(ctx, cloudLine, panel.x + 34, panel.y + 352, {
        size: 16,
        color: COLORS.inkSoft,
        maxWidth: panel.w - 68,
      });
      drawText(
        ctx,
        stats ? `档位 ${stats.tier} · FPS ${stats.fps} · 粒子 ${stats.particles}` : '档位自动',
        panel.x + 34,
        panel.y + 382,
        { size: 14, color: COLORS.inkSoft, maxWidth: panel.w - 68 },
      );
      drawText(ctx, `版本 ${GAME_VERSION}`, panel.x + 34, panel.y + 412, {
        size: 14,
        color: COLORS.inkSoft,
      });
      drawTapeNote(
        ctx,
        { x: panel.x + 60, y: panel.y + 462, w: panel.w - 120, h: 92 },
        ['只使用 openid', '不收集头像、昵称、手机号'],
        { align: 'center' },
      );
    }

    this.closeRect = { x: panel.x + 28, y: panel.y + 786, w: panel.w - 56, h: 58 };
    drawStickerButton(ctx, this.closeRect, '关闭', { fontSize: FONT.body, seed: 811 });
  }

  private drawPrivacy(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(58,46,42,0.35)';
    ctx.fillRect(0, 0, width, height);

    const panel = { x: 75, y: height / 2 - 260, w: width - 150, h: 520 };
    drawPaperPanel(ctx, panel, {
      fill: COLORS.paper,
      radius: RADIUS.xl,
      stitch: true,
      seed: 881,
    });

    drawText(ctx, '隐私协议', panel.x + 40, panel.y + 62, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });

    const lines = [
      '休闲王都只使用微信 openid 保存游戏进度。',
      '不收集头像、昵称、手机号、位置或通讯录。',
      '玩家名来自王都名册，不提供自由输入。',
      '本地存档保存在本机；开启云开发后用于同步。',
      '你可以在设置中删除本地数据。',
    ];
    lines.forEach((line, index) => {
      drawText(ctx, line, panel.x + 40, panel.y + 140 + index * 58, {
        size: 21,
        color: index === lines.length - 1 ? COLORS.inkSoft : COLORS.ink,
        maxWidth: panel.w - 80,
      });
    });

    this.privacyCloseRect = { x: panel.x + 40, y: panel.y + 430, w: panel.w - 80, h: 64 };
    drawStickerButton(ctx, this.privacyCloseRect, '返回设置', {
      fontSize: FONT.subtitle,
      seed: 883,
    });
  }

  private openRank(): void {
    this.modal = 'rank';
    this.services.analytics.track('leaderboard_open', { game: this.rankGameId });
    this.loadRank(this.rankGameId);
  }

  private loadRank(gameId: string): void {
    this.rankGameId = gameId;
    this.rankEntries = [];
    this.rankMessage = '';
    this.rankLoading = true;
    const requestId = ++this.rankRequestId;

    void this.services.cloud.fetchLeaderboard(gameId, 20).then((entries) => {
      // 快速切分类时只接受最后一次请求，避免旧结果覆盖新标签。
      if (requestId !== this.rankRequestId) return;
      this.rankLoading = false;
      if (!entries) {
        this.rankMessage = this.services.cloud.online
          ? '排行榜加载失败，稍后再试'
          : '离线模式，排行榜暂时不可用';
        return;
      }
      this.rankEntries = entries;
      if (entries.length === 0) {
        this.rankMessage =
          gameId === MATCH3_CAMPAIGN_BOARD || gameId === MATCH3_ENDLESS_BOARD
            ? '还没有人上榜，去玩一局吧'
            : '这个场馆还没有人上榜';
      }
    });
  }

  private drawRank(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(58,46,42,0.35)';
    ctx.fillRect(0, 0, width, height);

    const panel = { x: 55, y: height / 2 - 320, w: width - 110, h: 640 };
    drawPaperPanel(ctx, panel, {
      fill: COLORS.paper,
      radius: RADIUS.xl,
      stitch: true,
      seed: 887,
    });

    drawText(ctx, '排行榜', panel.x + 40, panel.y + 62, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '每人只记最高分 · 仅展示，不发王都币', panel.x + 40, panel.y + 98, {
      size: 16,
      color: COLORS.inkSoft,
    });

    const rankRects = drawSegmented(
      ctx,
      { x: panel.x + 28, y: panel.y + 116, w: panel.w - 56, h: 40 },
      LEADERBOARD_TABS.map((tab) => tab.label),
      LEADERBOARD_TABS.findIndex((tab) => tab.id === this.rankGameId),
      COLORS.jade,
    );
    this.rankTabs = LEADERBOARD_TABS.map((tab, index) => ({
      id: tab.id,
      rect: rankRects[index],
    }));

    if (this.rankLoading) {
      drawText(ctx, '正在加载…', width / 2, panel.y + 250, {
        size: FONT.body,
        color: COLORS.inkSoft,
        align: 'center',
      });
    } else if (this.rankMessage) {
      drawText(ctx, this.rankMessage, width / 2, panel.y + 250, {
        size: FONT.body,
        color: COLORS.inkSoft,
        align: 'center',
        maxWidth: panel.w - 80,
      });
    } else {
      drawText(ctx, '名次', panel.x + 52, panel.y + 182, {
        size: 17,
        color: COLORS.inkSoft,
        align: 'center',
      });
      drawText(ctx, '居民', panel.x + 112, panel.y + 182, {
        size: 17,
        color: COLORS.inkSoft,
      });
      drawText(ctx, '分数', panel.x + panel.w - 40, panel.y + 182, {
        size: 17,
        color: COLORS.inkSoft,
        align: 'right',
      });

      this.rankEntries.slice(0, 10).forEach((entry, index) => {
        const rowY = panel.y + 214 + index * 34;
        const medal = index < 3 ? [COLORS.gold, '#C9CFD6', '#D8A47F'][index] : null;
        if (medal) {
          ctx.beginPath();
          ctx.arc(panel.x + 52, rowY, 13, 0, Math.PI * 2);
          ctx.fillStyle = medal;
          ctx.fill();
        }
        drawText(ctx, `${entry.rank}`, panel.x + 52, rowY, {
          size: FONT.caption,
          weight: '700',
          color: medal ? COLORS.paper : COLORS.inkSoft,
          align: 'center',
        });
        drawText(ctx, entry.name || '王都居民', panel.x + 112, rowY, {
          size: 20,
          color: COLORS.ink,
          maxWidth: panel.w - 260,
        });
        drawText(ctx, compactNumber(entry.score), panel.x + panel.w - 40, rowY, {
          size: FONT.subtitle,
          weight: '700',
          color: COLORS.jade,
          align: 'right',
        });
      });
    }

    this.rankCloseRect = { x: panel.x + 40, y: panel.y + 552, w: panel.w - 80, h: 64 };
    drawStickerButton(ctx, this.rankCloseRect, '关闭', {
      fontSize: FONT.subtitle,
      seed: 889,
    });
  }

  private cloudStatusText(): string {
    switch (this.services.cloud.status) {
      case 'online':
        return '已连接';
      case 'connecting':
        return '连接中';
      default:
        break;
    }
    if (!this.services.cloud.hasEnv) return '未配置环境';
    if (!platform.cloud.available()) return '当前运行环境没有 wx.cloud';
    return '未连接（检查云函数）';
  }

  private drawLinkRow(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    label: string,
    hint: string,
  ): void {
    drawText(ctx, label, rect.x, rect.y + 20, {
      size: FONT.body,
      color: COLORS.ink,
    });
    drawText(ctx, hint, rect.x + rect.w, rect.y + 20, {
      size: 17,
      color: COLORS.inkSoft,
      align: 'right',
    });
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.h);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.strokeStyle = 'rgba(58,46,42,0.10)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private handleSettingsTap(x: number, y: number): void {
    if (pointInRect(x, y, this.closeRect)) {
      this.services.feedback.tap();
      this.modal = null;
      return;
    }
    if (pointInRect(x, y, this.tabSoundRect)) {
      this.services.feedback.tap();
      this.settingsTab = 'sound';
      return;
    }
    if (pointInRect(x, y, this.tabVisualRect)) {
      this.services.feedback.tap();
      this.settingsTab = 'visual';
      return;
    }
    if (pointInRect(x, y, this.tabDataRect)) {
      this.services.feedback.tap();
      this.settingsTab = 'data';
      return;
    }

    const settings = this.services.profile.get().settings;

    if (this.settingsTab === 'sound') {
      if (pointInRect(x, y, this.changeNameRect)) {
        this.services.feedback.tap();
        this.openNamePicker();
        return;
      }
      if (pointInRect(x, y, this.musicRect)) {
        this.services.feedback.tap();
        this.services.profile.updateSettings({ music: !settings.music });
        this.services.audio.setMusic(!settings.music);
        this.showToast(settings.music ? '音乐已关闭' : '音乐已开启');
        return;
      }
      if (pointInRect(x, y, this.sfxRect)) {
        this.services.feedback.tap();
        this.services.profile.updateSettings({ sfx: !settings.sfx });
        this.services.audio.setSfx(!settings.sfx);
        this.showToast(settings.sfx ? '音效已关闭' : '音效已开启');
        return;
      }
      if (pointInRect(x, y, this.hapticsRect)) {
        this.services.profile.updateSettings({ haptics: !settings.haptics });
        this.services.haptics.setEnabled(!settings.haptics && !settings.reducedMotion);
        this.services.feedback.tap();
        this.showToast(settings.haptics ? '震动已关闭' : '震动已开启');
        return;
      }
      if (pointInRect(x, y, this.motionRect)) {
        this.services.feedback.tap();
        this.services.profile.updateSettings({ reducedMotion: !settings.reducedMotion });
        this.applyVisualSettings();
        if (settings.reducedMotion) {
          this.services.feedback.resetCombo();
        } else {
          this.services.particles.clear();
        }
        this.showToast(settings.reducedMotion ? '动效已恢复' : '已开启减少动效');
        return;
      }
      return;
    }

    if (this.settingsTab === 'visual') {
      if (pointInRect(x, y, this.performanceRect)) {
        this.services.feedback.tap();
        if (!settings.performanceMode) {
          this.performanceSnapshot = {
            quality: settings.quality,
            ambientEffects: settings.ambientEffects,
            sceneMotion: settings.sceneMotion,
            textureDetail: settings.textureDetail,
            screenShake: settings.screenShake,
          };
          this.services.profile.updateSettings({ performanceMode: true });
          this.showToast('性能模式已开启');
        } else {
          const snap = this.performanceSnapshot;
          this.services.profile.updateSettings({
            performanceMode: false,
            ...(snap ?? {}),
          });
          this.performanceSnapshot = null;
          this.showToast('性能模式已关闭');
        }
        this.applyVisualSettings();
        return;
      }
      const qualityHit = this.qualityRects.findIndex((rect) => pointInRect(x, y, rect));
      if (qualityHit >= 0) {
        this.services.feedback.tap();
        const quality = (['auto', 'high', 'mid', 'low'] as const)[qualityHit];
        this.services.profile.updateSettings({ quality, performanceMode: false });
        this.performanceSnapshot = null;
        this.applyVisualSettings();
        this.showToast(`画面档位：${['自动', '高', '中', '低'][qualityHit]}`);
        return;
      }
      const effectHit =
        pointInRect(x, y, this.ambientRect) ||
        pointInRect(x, y, this.sceneRect) ||
        pointInRect(x, y, this.textureRect) ||
        pointInRect(x, y, this.shakeRect);
      if (effectHit && (settings.performanceMode || settings.reducedMotion)) {
        this.services.feedback.invalid();
        this.showToast('请先关闭性能模式或减少动效');
        return;
      }
      if (pointInRect(x, y, this.ambientRect)) {
        this.services.feedback.tap();
        this.services.profile.updateSettings({ ambientEffects: !settings.ambientEffects });
        this.applyVisualSettings();
        this.showToast(settings.ambientEffects ? '环境粒子已关闭' : '环境粒子已开启');
        return;
      }
      if (pointInRect(x, y, this.sceneRect)) {
        this.services.feedback.tap();
        this.services.profile.updateSettings({ sceneMotion: !settings.sceneMotion });
        this.applyVisualSettings();
        this.showToast(settings.sceneMotion ? '场景动画已关闭' : '场景动画已开启');
        return;
      }
      if (pointInRect(x, y, this.textureRect)) {
        this.services.feedback.tap();
        this.services.profile.updateSettings({ textureDetail: !settings.textureDetail });
        this.applyVisualSettings();
        this.showToast(settings.textureDetail ? '纸纹已关闭' : '纸纹已开启');
        return;
      }
      if (pointInRect(x, y, this.shakeRect)) {
        this.services.feedback.tap();
        this.services.profile.updateSettings({ screenShake: !settings.screenShake });
        this.applyVisualSettings();
        this.showToast(settings.screenShake ? '屏幕震动已关闭' : '屏幕震动已开启');
        return;
      }
      return;
    }

    if (pointInRect(x, y, this.privacyRect)) {
      this.services.feedback.tap();
      this.modal = 'privacy';
      return;
    }
    if (pointInRect(x, y, this.deleteRect)) {
      this.services.feedback.tap();
      void this.confirmDelete();
    }
  }

  private applyVisualSettings(): void {
    const settings = this.services.profile.get().settings;
    const perf = settings.performanceMode;
    const prevTier = this.services.quality.tier;
    const prevTexture = this.services.quality.allowTextureDetail;
    this.services.quality.setPreference(
      settings.reducedMotion ? 'reduced' : perf ? 'low' : settings.quality,
    );
    this.services.quality.setEffects({
      ambientEffects: settings.ambientEffects && !perf,
      sceneMotion: settings.sceneMotion && !perf,
      textureDetail: settings.textureDetail && !perf,
      screenShake: settings.screenShake && !perf,
    });
    this.services.haptics.setEnabled(settings.haptics && !settings.reducedMotion);
    if (
      prevTier !== this.services.quality.tier ||
      prevTexture !== this.services.quality.allowTextureDetail
    ) {
      this.art.invalidate();
    }
    this.ambient.clear();
  }

  private async confirmDelete(): Promise<void> {
    const confirmed = await platform.showModal(
      '删除本地数据',
      '将清除本机的存档、设置与进度。云端数据不会自动删除。确定继续吗？',
    );
    if (!confirmed) return;

    this.services.storage.clear();
    this.services.profile.reset();
    const settings = this.services.profile.get().settings;
    this.services.audio.setMusic(settings.music);
    this.services.audio.setSfx(settings.sfx);
    this.services.haptics.setEnabled(settings.haptics && !settings.reducedMotion);
    this.applyVisualSettings();
    this.showToast('本地数据已清除');
  }

  private showToast(text: string): void {
    this.toast = { text, until: Date.now() + 1800 };
  }
}

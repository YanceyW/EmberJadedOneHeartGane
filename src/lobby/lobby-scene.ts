import { GAMES, GameManifestEntry } from '../shared/content/games-manifest.generated';
import { AppServices } from '../core/app/services';
import { LeaderboardEntry } from '../core/cloud/cloud';
import { Renderer } from '../core/render/renderer';
import { Scene } from '../core/scene/scene';
import {
  drawBerry,
  drawCoin,
  drawDiamond,
  drawFish,
  drawHex,
  drawPanel,
  drawPetal,
  drawStar,
  drawText,
  fillRoundRect,
  pointInRect,
  Rect,
  roundRectPath,
  strokeRoundRect,
} from '../shared/design-system/draw';
import { Accent, accentOf, COLORS, FONT, RADIUS, SPACE } from '../shared/design-system/tokens';
import { platform } from '../shared/platform/wx';
import { GAME_VERSION } from '../config';

interface VenueCard {
  entry: GameManifestEntry;
  rect: Rect;
  accent: Accent;
}

interface NavItem {
  label: string;
  rect: Rect;
}

interface Toast {
  text: string;
  until: number;
}

export class LobbyScene implements Scene {
  readonly key = 'lobby';

  private cards: VenueCard[] = [];
  private navs: NavItem[] = [];
  private settingsRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private starRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private toast: Toast | null = null;
  private modal: 'settings' | 'privacy' | 'rank' | null = null;
  private pulse = 0;

  private closeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private musicRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private sfxRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private privacyRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private deleteRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private hapticsRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private motionRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private privacyCloseRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private rankCloseRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private rankLoading = false;
  private rankEntries: LeaderboardEntry[] = [];
  private rankMessage = '';

  constructor(private readonly services: AppServices) {
    this.layout();
  }

  enter(): void {
    this.services.analytics.track('lobby_enter');
  }

  exit(): void {
    this.services.analytics.track('lobby_exit');
  }

  update(dt: number): void {
    this.pulse += dt;
  }

  private layout(): void {
    const { width, height, safeTop, safeBottom } = this.services.renderer;
    const margin = 40;
    const gap = 20;
    const cardW = (width - margin * 2 - gap) / 2;
    const cardH = 300;
    const top = safeTop + 208;

    this.cards = GAMES.map((entry, index) => ({
      entry,
      rect: {
        x: margin + (index % 2) * (cardW + gap),
        y: top + Math.floor(index / 2) * (cardH + gap),
        w: cardW,
        h: cardH,
      },
      accent: accentOf(entry.accent),
    }));

    const navW = (width - margin * 2 - 24) / 3;
    const navY = height - safeBottom - 112;
    const labels = ['排行榜', '每日委托', '收集册'];
    this.navs = labels.map((label, index) => ({
      label,
      rect: { x: margin + index * (navW + 12), y: navY, w: navW, h: 80 },
    }));

    this.settingsRect = { x: width - margin - 64, y: safeTop + 28, w: 64, h: 64 };
    this.starRect = { x: width - margin - 64 - 16 - 190, y: safeTop + 34, w: 190, h: 52 };
  }

  render(renderer: Renderer): void {
    const ctx = renderer.ctx;
    const { width, height, safeTop } = renderer;

    this.drawBackground(ctx, width, height, safeTop);
    this.drawHeader(ctx, safeTop);

    drawText(ctx, '王都场馆', 40, safeTop + 172, {
      size: FONT.body,
      color: COLORS.inkSoft,
      weight: '700',
    });
    drawText(ctx, `${GAMES.length} 个场馆`, width - 40, safeTop + 172, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      align: 'right',
    });

    for (const card of this.cards) this.drawVenue(ctx, card);
    this.drawNav(ctx);
    this.drawToast(ctx, width, height);

    if (this.modal === 'settings') this.drawSettings(ctx, width, height);
    if (this.modal === 'privacy') this.drawPrivacy(ctx, width, height);
    if (this.modal === 'rank') this.drawRank(ctx, width, height);
  }

  onTap(x: number, y: number): void {
    if (this.modal === 'settings') {
      this.handleSettingsTap(x, y);
      return;
    }
    if (this.modal === 'privacy') {
      this.handlePrivacyTap(x, y);
      return;
    }
    if (this.modal === 'rank') {
      if (pointInRect(x, y, this.rankCloseRect)) {
        this.services.feedback.tap();
        this.modal = null;
      }
      return;
    }

    if (pointInRect(x, y, this.settingsRect)) {
      this.services.feedback.tap();
      this.modal = 'settings';
      return;
    }
    if (pointInRect(x, y, this.starRect)) {
      this.services.feedback.tap();
      this.showToast('星尘可以通过小游戏和每日委托获得');
      return;
    }

    for (const card of this.cards) {
      if (!pointInRect(x, y, card.rect)) continue;
      if (card.entry.status === 'playable') {
        this.services.feedback.tap();
        this.services.analytics.track('venue_click', { gameId: card.entry.id });
        this.services.openGame(card.entry.id);
      } else {
        // 未开放的场馆用「非法操作」的轻反馈，不用成功音误导玩家
        this.services.feedback.invalid();
        this.showToast(`${card.entry.title}正在装修中，敬请期待`);
      }
      return;
    }

    for (const nav of this.navs) {
      if (!pointInRect(x, y, nav.rect)) continue;
      if (nav.label === '排行榜') {
        this.services.feedback.tap();
        this.openRank();
      } else {
        this.services.feedback.invalid();
        this.showToast(`${nav.label}即将开放`);
      }
      return;
    }
  }

  private openRank(): void {
    this.modal = 'rank';
    this.rankEntries = [];
    this.rankMessage = '';
    this.rankLoading = true;
    this.services.analytics.track('leaderboard_open', { game: 'match3' });

    void this.services.cloud
      .fetchLeaderboard('match3', this.services.time.weekKey(), 20)
      .then((entries) => {
      this.rankLoading = false;
      if (!entries) {
        this.rankMessage = this.services.cloud.online
          ? '排行榜加载失败，稍后再试'
          : '离线模式，排行榜暂时不可用';
        return;
      }
      this.rankEntries = entries;
      if (entries.length === 0) this.rankMessage = '这周还没有人上榜，去玩一局吧';
    });
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    safeTop: number,
  ): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#FFF9EF');
    gradient.addColorStop(0.55, '#F3FAF3');
    gradient.addColorStop(1, '#E4F4EC');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(width - 110, safeTop + 90, 74, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE3A8';
    ctx.fill();
    ctx.restore();

    // 三层视差：远景云海 / 中景山丘 / 前景草地，位移幅度依次放大。
    const drift = this.services.quality.reducedMotion ? 0 : 1;
    const far = Math.sin(this.pulse * 0.22) * 10 * drift;
    const mid = Math.sin(this.pulse * 0.34) * 18 * drift;
    const near = Math.sin(this.pulse * 0.5) * 26 * drift;

    this.drawCloud(ctx, 110 + far, safeTop + 250, 1);
    this.drawCloud(ctx, width - 90 + far * 0.8, safeTop + 360, 0.8);

    ctx.beginPath();
    ctx.moveTo(0, height * 0.78 + mid * 0.15);
    ctx.quadraticCurveTo(width * 0.25, height * 0.72 + mid * 0.15, width * 0.5, height * 0.78 + mid * 0.15);
    ctx.quadraticCurveTo(width * 0.75, height * 0.84 + mid * 0.15, width, height * 0.76 + mid * 0.15);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(168,230,207,0.34)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-near * 0.4, height * 0.86);
    ctx.quadraticCurveTo(width * 0.3, height * 0.8, width * 0.62, height * 0.86);
    ctx.quadraticCurveTo(width * 0.84, height * 0.9, width + near * 0.4, height * 0.84);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(127,191,106,0.20)';
    ctx.fill();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = COLORS.paper;
    const parts: Array<[number, number, number]> = [
      [0, 0, 42],
      [46, -16, 52],
      [96, 4, 38],
      [42, 10, 40],
    ];
    for (const [dx, dy, radius] of parts) {
      ctx.beginPath();
      ctx.arc(x + dx * scale, y + dy * scale, radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D, safeTop: number): void {
    drawText(ctx, '休闲王都', 40, safeTop + 58, {
      size: FONT.display,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, '选一个场馆，开始今天的轻松一刻', 40, safeTop + 108, {
      size: FONT.caption,
      color: COLORS.inkSoft,
    });

    drawPanel(ctx, this.starRect, { fill: COLORS.paper, radius: 26 });
    drawCoin(ctx, this.starRect.x + 30, this.starRect.y + 26, 16);
    drawText(ctx, `${this.services.profile.get().stardust}`, this.starRect.x + 58, this.starRect.y + 27, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });

    drawPanel(ctx, this.settingsRect, { fill: COLORS.paper, radius: 32 });
    const cx = this.settingsRect.x + 32;
    const cy = this.settingsRect.y + 32;
    ctx.save();
    ctx.strokeStyle = COLORS.inkSoft;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15);
      ctx.lineTo(cx + Math.cos(angle) * 21, cy + Math.sin(angle) * 21);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawVenue(ctx: CanvasRenderingContext2D, card: VenueCard): void {
    const { rect, entry, accent } = card;
    const playable = entry.status === 'playable';

    drawPanel(ctx, rect, { fill: COLORS.paper, radius: RADIUS.xl });

    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, RADIUS.xl);
    ctx.clip();
    ctx.fillStyle = accent.soft;
    ctx.fillRect(rect.x, rect.y, rect.w, 108);
    ctx.restore();
    strokeRoundRect(ctx, rect, 'rgba(58,46,42,0.16)', 2, RADIUS.xl);

    const iconX = rect.x + 58;
    const iconY = rect.y + 58;
    ctx.save();
    ctx.globalAlpha = playable ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(iconX, iconY, 38, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
    ctx.strokeStyle = accent.main;
    ctx.lineWidth = 3;
    ctx.stroke();
    this.drawGameIcon(ctx, entry.id, iconX, iconY, 28, accent);
    ctx.restore();

    const pillW = 118;
    const pillRect = {
      x: rect.x + rect.w - pillW - 24,
      y: rect.y + 26,
      w: pillW,
      h: 42,
    };
    fillRoundRect(ctx, pillRect, playable ? accent.main : 'rgba(58,46,42,0.10)', 21);
    drawText(ctx, playable ? '可游玩' : '即将开放', pillRect.x + pillRect.w / 2, pillRect.y + 21, {
      size: 18,
      color: playable ? COLORS.paper : COLORS.inkSoft,
      align: 'center',
      weight: '700',
    });

    drawText(ctx, entry.title, rect.x + 28, rect.y + 158, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
      maxWidth: rect.w - 56,
    });
    drawText(ctx, entry.subtitle, rect.x + 28, rect.y + 200, {
      size: FONT.caption,
      color: COLORS.inkSoft,
      maxWidth: rect.w - 56,
    });

    const barRect = { x: rect.x + 28, y: rect.y + 246, w: rect.w - 84, h: 12 };
    fillRoundRect(ctx, barRect, 'rgba(58,46,42,0.10)', 6);
    fillRoundRect(
      ctx,
      { ...barRect, w: playable ? barRect.w * 0.22 : 0 },
      accent.main,
      6,
    );

    if (playable) {
      const glow = 0.5 + Math.sin(this.pulse * 2.4) * 0.2;
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.beginPath();
      ctx.arc(rect.x + rect.w - 44, rect.y + rect.h - 44, 22, 0, Math.PI * 2);
      ctx.fillStyle = accent.main;
      ctx.fill();
      ctx.fillStyle = COLORS.paper;
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w - 49, rect.y + rect.h - 55);
      ctx.lineTo(rect.x + rect.w - 49, rect.y + rect.h - 33);
      ctx.lineTo(rect.x + rect.w - 32, rect.y + rect.h - 44);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      drawText(ctx, '装修中', rect.x + rect.w - 28, rect.y + rect.h - 28, {
        size: 18,
        color: COLORS.inkSoft,
        align: 'right',
      });
    }
  }

  private drawGameIcon(
    ctx: CanvasRenderingContext2D,
    id: string,
    cx: number,
    cy: number,
    size: number,
    accent: Accent,
  ): void {
    switch (id) {
      case 'match3':
        drawStar(ctx, cx, cy, size, size * 0.46, COLORS.gold);
        drawDiamond(ctx, cx - size * 0.95, cy + size * 0.72, size * 0.34, COLORS.berry);
        drawDiamond(ctx, cx + size * 0.95, cy + size * 0.72, size * 0.34, COLORS.mint);
        break;
      case 'garden':
        drawPetal(ctx, cx, cy, size, COLORS.petal);
        break;
      case 'merge':
        drawHex(ctx, cx, cy, size, accent.main);
        drawHex(ctx, cx, cy, size * 0.52, COLORS.honey);
        break;
      case 'aquarium':
        drawFish(ctx, cx, cy, size * 0.9, accent.main);
        break;
      default:
        drawBerry(ctx, cx, cy, size * 0.8, accent.main);
        break;
    }
  }

  private drawNav(ctx: CanvasRenderingContext2D): void {
    for (const nav of this.navs) {
      drawPanel(ctx, nav.rect, { fill: COLORS.paper, radius: RADIUS.lg });
      const cx = nav.rect.x + nav.rect.w / 2;
      const cy = nav.rect.y + 26;
      if (nav.label === '每日委托') {
        drawStar(ctx, cx, cy, 15, 7, COLORS.gold);
      } else if (nav.label === '收集册') {
        drawPetal(ctx, cx, cy, 15, COLORS.petal);
      } else {
        const bars = [10, 18, 26];
        bars.forEach((height, index) => {
          fillRoundRect(
            ctx,
            { x: cx - 15 + index * 12, y: cy + 14 - height, w: 8, h: height },
            index === 2 ? COLORS.jade : COLORS.mint,
            4,
          );
        });
      }
      drawText(ctx, nav.label, cx, nav.rect.y + 60, {
        size: FONT.caption,
        color: COLORS.inkSoft,
        align: 'center',
      });
    }
  }

  private drawToast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.toast || Date.now() >= this.toast.until) return;
    const textWidth = Math.min(width - 120, Math.max(340, this.toast.text.length * 26 + 64));
    const rect = { x: (width - textWidth) / 2, y: height - 230, w: textWidth, h: 72 };
    fillRoundRect(ctx, rect, 'rgba(58,46,42,0.88)', RADIUS.xl);
    drawText(ctx, this.toast.text, width / 2, rect.y + rect.h / 2, {
      size: FONT.body,
      color: COLORS.paper,
      align: 'center',
      maxWidth: rect.w - SPACE.xl * 2,
    });
  }

  private drawSettings(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(58,46,42,0.35)';
    ctx.fillRect(0, 0, width, height);

    const panel = { x: 75, y: height / 2 - 340, w: width - 150, h: 680 };
    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });

    drawText(ctx, '设置', panel.x + 40, panel.y + 62, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });

    const settings = this.services.profile.get().settings;
    this.musicRect = { x: panel.x + 28, y: panel.y + 104, w: panel.w - 56, h: 68 };
    this.sfxRect = { x: panel.x + 28, y: panel.y + 176, w: panel.w - 56, h: 68 };
    this.hapticsRect = { x: panel.x + 28, y: panel.y + 248, w: panel.w - 56, h: 68 };
    this.motionRect = { x: panel.x + 28, y: panel.y + 320, w: panel.w - 56, h: 68 };

    this.drawSettingRow(ctx, this.musicRect, '音乐', '大厅与小游戏的背景音乐', settings.music);
    this.drawSettingRow(ctx, this.sfxRect, '音效', '点击、奖励与提示音', settings.sfx);
    this.drawSettingRow(ctx, this.hapticsRect, '震动', '消除与成功时的轻震动', settings.haptics);
    this.drawSettingRow(
      ctx,
      this.motionRect,
      '减少动效',
      '关闭缩放/粒子/震动，省电且更稳',
      settings.reducedMotion,
    );

    this.privacyRect = { x: panel.x + 40, y: panel.y + 408, w: panel.w - 80, h: 48 };
    this.deleteRect = { x: panel.x + 40, y: panel.y + 462, w: panel.w - 80, h: 48 };

    this.drawLinkRow(ctx, this.privacyRect, '隐私协议', '查看');
    this.drawLinkRow(ctx, this.deleteRect, '删除本地数据', '仅清除本机存档');

    const stats = this.services.debugStats?.();
    const cloudLine = `云服务：${this.cloudStatusText()}`;
    const perfLine = stats
      ? ` · 档位 ${stats.tier} · FPS ${stats.fps} · 粒子 ${stats.particles}`
      : '';
    drawText(ctx, cloudLine + perfLine, panel.x + 40, panel.y + 534, {
      size: 17,
      color: COLORS.inkSoft,
      maxWidth: panel.w - 80,
    });

    drawText(ctx, `版本 ${GAME_VERSION}`, panel.x + 40, panel.y + 562, {
      size: 17,
      color: COLORS.inkSoft,
    });

    this.closeRect = { x: panel.x + 40, y: panel.y + 592, w: panel.w - 80, h: 64 };
    fillRoundRect(ctx, this.closeRect, COLORS.jade, RADIUS.md);
    drawText(ctx, '关闭', this.closeRect.x + this.closeRect.w / 2, this.closeRect.y + 32, {
      size: FONT.subtitle,
      color: COLORS.paper,
      align: 'center',
      weight: '700',
    });
  }

  private drawPrivacy(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    ctx.fillStyle = 'rgba(58,46,42,0.35)';
    ctx.fillRect(0, 0, width, height);

    const panel = { x: 75, y: height / 2 - 260, w: width - 150, h: 520 };
    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });

    drawText(ctx, '隐私协议', panel.x + 40, panel.y + 62, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });

    const lines = [
      '休闲王都只使用微信 openid 保存游戏进度。',
      '不收集头像、昵称、手机号、位置或通讯录。',
      '本地存档保存在本机；开启云开发后用于同步。',
      '你可以在设置中删除本地数据。',
      '正式发布前会补充完整隐私协议与数据删除说明。',
    ];
    lines.forEach((line, index) => {
      drawText(ctx, line, panel.x + 40, panel.y + 140 + index * 58, {
        size: 22,
        color: index === lines.length - 1 ? COLORS.inkSoft : COLORS.ink,
        maxWidth: panel.w - 80,
      });
    });

    this.privacyCloseRect = { x: panel.x + 40, y: panel.y + 430, w: panel.w - 80, h: 64 };
    fillRoundRect(ctx, this.privacyCloseRect, COLORS.jade, RADIUS.md);
    drawText(
      ctx,
      '返回设置',
      this.privacyCloseRect.x + this.privacyCloseRect.w / 2,
      this.privacyCloseRect.y + 32,
      {
        size: FONT.subtitle,
        color: COLORS.paper,
        align: 'center',
        weight: '700',
      },
    );
  }

  private handlePrivacyTap(x: number, y: number): void {
    if (pointInRect(x, y, this.privacyCloseRect)) {
      this.modal = 'settings';
    }
  }

  private drawRank(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = 'rgba(58,46,42,0.35)';
    ctx.fillRect(0, 0, width, height);

    const panel = { x: 75, y: height / 2 - 320, w: width - 150, h: 640 };
    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });

    drawText(ctx, '排行榜', panel.x + 40, panel.y + 62, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, `王都三消 · ${this.services.time.weekKey()}`, panel.x + 40, panel.y + 100, {
      size: 18,
      color: COLORS.inkSoft,
    });

    if (this.rankLoading) {
      drawText(ctx, '正在加载…', width / 2, panel.y + 220, {
        size: FONT.body,
        color: COLORS.inkSoft,
        align: 'center',
      });
    } else if (this.rankMessage) {
      drawText(ctx, this.rankMessage, width / 2, panel.y + 220, {
        size: FONT.body,
        color: COLORS.inkSoft,
        align: 'center',
        maxWidth: panel.w - 80,
      });
    } else {
      drawText(ctx, '名次', panel.x + 52, panel.y + 132, {
        size: 18,
        color: COLORS.inkSoft,
        align: 'center',
      });
      drawText(ctx, '分数', panel.x + panel.w - 40, panel.y + 132, {
        size: 18,
        color: COLORS.inkSoft,
        align: 'right',
      });

      this.rankEntries.slice(0, 10).forEach((entry, index) => {
        const rowY = panel.y + 172 + index * 44;
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
        drawText(ctx, `${entry.score}`, panel.x + panel.w - 40, rowY, {
          size: FONT.subtitle,
          weight: '700',
          color: COLORS.jade,
          align: 'right',
        });
      });
    }

    this.rankCloseRect = { x: panel.x + 40, y: panel.y + 552, w: panel.w - 80, h: 64 };
    fillRoundRect(ctx, this.rankCloseRect, COLORS.jade, RADIUS.md);
    drawText(
      ctx,
      '关闭',
      this.rankCloseRect.x + this.rankCloseRect.w / 2,
      this.rankCloseRect.y + 32,
      {
        size: FONT.subtitle,
        color: COLORS.paper,
        align: 'center',
        weight: '700',
      },
    );
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

  private drawSettingRow(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    label: string,
    hint: string,
    enabled: boolean,
  ): void {
    drawText(ctx, label, rect.x + 8, rect.y + 24, {
      size: FONT.body,
      weight: '700',
      color: COLORS.ink,
    });
    drawText(ctx, hint, rect.x + 8, rect.y + 54, {
      size: 18,
      color: COLORS.inkSoft,
    });

    const toggle = { x: rect.x + rect.w - 104, y: rect.y + 18, w: 96, h: 44 };
    fillRoundRect(ctx, toggle, enabled ? COLORS.jade : 'rgba(58,46,42,0.16)', 22);
    const knobX = enabled ? toggle.x + toggle.w - 22 : toggle.x + 22;
    ctx.beginPath();
    ctx.arc(knobX, toggle.y + 22, 18, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
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
      size: 18,
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

    const settings = this.services.profile.get().settings;
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
      this.services.haptics.setEnabled(!settings.haptics);
      this.services.feedback.tap();
      this.showToast(settings.haptics ? '震动已关闭' : '震动已开启');
      return;
    }
    if (pointInRect(x, y, this.motionRect)) {
      this.services.feedback.tap();
      this.services.profile.updateSettings({ reducedMotion: !settings.reducedMotion });
      this.services.quality.setPreference(settings.reducedMotion ? 'auto' : 'reduced');
      if (settings.reducedMotion) {
        this.services.feedback.resetCombo();
      } else {
        this.services.particles.clear();
      }
      this.showToast(settings.reducedMotion ? '动效已恢复' : '已开启减少动效');
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
    this.services.haptics.setEnabled(settings.haptics);
    this.services.quality.setPreference(settings.reducedMotion ? 'reduced' : 'auto');
    this.showToast('本地数据已清除');
  }

  private showToast(text: string): void {
    this.toast = { text, until: Date.now() + 1600 };
  }
}

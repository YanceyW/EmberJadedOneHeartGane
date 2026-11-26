import { GAMES, GameManifestEntry } from '../shared/content/games-manifest.generated';
import { AppServices } from '../core/app/services';
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
  private modal: 'settings' | 'privacy' | null = null;
  private pulse = 0;

  private closeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private musicRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private sfxRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private privacyRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private deleteRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private privacyCloseRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

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
    const labels = ['每日委托', '收集册', '双人广场'];
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

    if (pointInRect(x, y, this.settingsRect)) {
      this.modal = 'settings';
      return;
    }
    if (pointInRect(x, y, this.starRect)) {
      this.showToast('星尘可以通过小游戏和每日委托获得');
      return;
    }

    for (const card of this.cards) {
      if (!pointInRect(x, y, card.rect)) continue;
      if (card.entry.status === 'playable') {
        this.services.analytics.track('venue_click', { gameId: card.entry.id });
        this.services.openGame(card.entry.id);
      } else {
        this.showToast(`${card.entry.title}正在装修中，敬请期待`);
      }
      return;
    }

    for (const nav of this.navs) {
      if (pointInRect(x, y, nav.rect)) {
        this.showToast(`${nav.label}即将开放`);
        return;
      }
    }
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

    this.drawCloud(ctx, 110, safeTop + 250, 1);
    this.drawCloud(ctx, width - 90, safeTop + 360, 0.8);

    ctx.beginPath();
    ctx.moveTo(0, height * 0.78);
    ctx.quadraticCurveTo(width * 0.25, height * 0.72, width * 0.5, height * 0.78);
    ctx.quadraticCurveTo(width * 0.75, height * 0.84, width, height * 0.76);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(168,230,207,0.34)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, height * 0.86);
    ctx.quadraticCurveTo(width * 0.3, height * 0.8, width * 0.62, height * 0.86);
    ctx.quadraticCurveTo(width * 0.84, height * 0.9, width, height * 0.84);
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
        ctx.beginPath();
        ctx.arc(cx - 7, cy - 2, 7, 0, Math.PI * 2);
        ctx.arc(cx + 9, cy - 2, 7, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.lilac;
        ctx.fill();
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

    const panel = { x: 75, y: height / 2 - 300, w: width - 150, h: 600 };
    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });

    drawText(ctx, '设置', panel.x + 40, panel.y + 62, {
      size: FONT.title,
      weight: '700',
      color: COLORS.ink,
    });

    const settings = this.services.profile.get().settings;
    this.musicRect = { x: panel.x + 28, y: panel.y + 112, w: panel.w - 56, h: 76 };
    this.sfxRect = { x: panel.x + 28, y: panel.y + 196, w: panel.w - 56, h: 76 };

    this.drawSettingRow(ctx, this.musicRect, '音乐', '大厅与小游戏的背景音乐', settings.music);
    this.drawSettingRow(ctx, this.sfxRect, '音效', '点击、奖励与提示音', settings.sfx);

    this.privacyRect = { x: panel.x + 40, y: panel.y + 300, w: panel.w - 80, h: 56 };
    this.deleteRect = { x: panel.x + 40, y: panel.y + 372, w: panel.w - 80, h: 56 };

    this.drawLinkRow(ctx, this.privacyRect, '隐私协议', '查看');
    this.drawLinkRow(ctx, this.deleteRect, '删除本地数据', '仅清除本机存档');

    drawText(
      ctx,
      `云服务：${this.cloudStatusText()}`,
      panel.x + 40,
      panel.y + 442,
      {
        size: 18,
        color: COLORS.inkSoft,
      },
    );
    drawText(ctx, `版本 ${GAME_VERSION}`, panel.x + 40, panel.y + 472, {
      size: FONT.caption,
      color: COLORS.inkSoft,
    });

    this.closeRect = { x: panel.x + 40, y: panel.y + 512, w: panel.w - 80, h: 64 };
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

  private cloudStatusText(): string {
    switch (this.services.cloud.status) {
      case 'online':
        return '已连接';
      case 'connecting':
        return '连接中';
      default:
        return this.services.cloud.hasEnv ? '未连接（检查云函数）' : '未配置环境';
    }
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
      this.modal = null;
      return;
    }

    const settings = this.services.profile.get().settings;
    if (pointInRect(x, y, this.musicRect)) {
      this.services.profile.updateSettings({ music: !settings.music });
      this.services.audio.setMusic(!settings.music);
      this.showToast(settings.music ? '音乐已关闭' : '音乐已开启');
      return;
    }
    if (pointInRect(x, y, this.sfxRect)) {
      this.services.profile.updateSettings({ sfx: !settings.sfx });
      this.services.audio.setSfx(!settings.sfx);
      this.showToast(settings.sfx ? '音效已关闭' : '音效已开启');
      return;
    }
    if (pointInRect(x, y, this.privacyRect)) {
      this.modal = 'privacy';
      return;
    }
    if (pointInRect(x, y, this.deleteRect)) {
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
    this.showToast('本地数据已清除');
  }

  private showToast(text: string): void {
    this.toast = { text, until: Date.now() + 1600 };
  }
}

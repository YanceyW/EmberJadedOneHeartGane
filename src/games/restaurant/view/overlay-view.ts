import { Rect, drawText } from '../../../shared/design-system/draw';
import { drawPaperPanel, drawStickerButton } from '../../../shared/design-system/paper-ui';
import { COLORS, FONT, RADIUS } from '../../../shared/design-system/tokens';
import { compactNumber } from '../../../shared/format';
import { ShiftSummary } from '../systems/shift';

export interface ExitPanelRects {
  panel: Rect;
  continue: Rect;
  close: Rect;
  leave: Rect;
}

export function drawSettleOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  summary: ShiftSummary | null,
  perfectCloses = 0,
): Rect | null {
  if (!summary) return null;
  ctx.fillStyle = 'rgba(58,46,42,0.4)';
  ctx.fillRect(0, 0, width, height);
  const panel: Rect = { x: 65, y: height / 2 - 330, w: width - 130, h: 660 };
  drawPaperPanel(ctx, panel, {
    fill: COLORS.paper,
    radius: RADIUS.xl,
    stitch: true,
    seed: 1951,
  });
  drawText(ctx, summary.perfect ? '完美打烊' : '今日打烊', panel.x + 40, panel.y + 52, {
    size: FONT.title,
    weight: '700',
    color: summary.perfect ? COLORS.jade : COLORS.ink,
  });
  drawText(ctx, `评价 ${summary.rating}`, panel.x + panel.w - 40, panel.y + 52, {
    size: FONT.title,
    weight: '700',
    color: COLORS.gold,
    align: 'right',
  });
  drawText(
    ctx,
    summary.perfect
      ? `完美打烊 ×${perfectCloses} · 当前客人全部服务完`
      : summary.netRevenue < 0
        ? '净收入可为负；钱包最低扣到 0，不会出现负数'
        : '打烊中已停止新增客人',
    panel.x + 40,
    panel.y + 82,
    {
      size: 12,
      color: summary.netRevenue < 0 ? COLORS.coral : COLORS.inkSoft,
      maxWidth: panel.w - 80,
    },
  );
  const rows: Array<[string, string]> = [
    ['端出', `${summary.delivered} 道`],
    ['接待', `${summary.servedCustomers} 位`],
    ['平均品质', `${Math.round(summary.averageQuality * 100)}%`],
    ['营业额', `${compactNumber(summary.revenue)} 王都币`],
    ['赔偿', summary.penalty > 0 ? `-${compactNumber(summary.penalty)} 王都币` : '0'],
    ['净收入', `${signedNumber(summary.netRevenue)} 王都币`],
    ['最高连击', `${summary.bestCombo}`],
    ['焦糊 / 流失', `${summary.burnt} / ${summary.lost}`],
    ['回收饲料', `${summary.recycledFeed} 份`],
    ['繁荣度', `+${summary.prosperity}`],
  ];
  rows.forEach(([label, value], index) => {
    const y = panel.y + 108 + index * 44;
    drawText(ctx, label, panel.x + 44, y, { size: 16, color: COLORS.inkSoft });
    drawText(ctx, value, panel.x + panel.w - 44, y, {
      size: 17,
      weight: '700',
      color:
        (label === '赔偿' && summary.penalty > 0) ||
        (label === '净收入' && summary.netRevenue < 0)
          ? COLORS.coral
          : COLORS.ink,
      align: 'right',
    });
  });
  drawText(
    ctx,
    `钱包实际扣款 ${summary.walletLoss} · 营业现做的菜只在本局有效；成品柜会锁定品质并暂停焦糊`,
    panel.x + 40,
    panel.y + 545,
    {
      size: 12,
      color: summary.walletLoss > 0 ? COLORS.coral : COLORS.inkSoft,
      maxWidth: panel.w - 80,
    },
  );
  const settle: Rect = { x: panel.x + 40, y: panel.y + 575, w: panel.w - 80, h: 58 };
  drawStickerButton(ctx, settle, '收下', {
    fontSize: FONT.subtitle,
    seed: 1953,
  });
  return settle;
}

export function drawExitOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  penalty: number,
): ExitPanelRects {
  ctx.fillStyle = 'rgba(58,46,42,0.42)';
  ctx.fillRect(0, 0, width, height);
  const panel: Rect = { x: 75, y: height / 2 - 210, w: width - 150, h: 420 };
  drawPaperPanel(ctx, panel, {
    fill: COLORS.paper,
    radius: RADIUS.xl,
    stitch: true,
    seed: 1961,
  });
  drawText(ctx, '要结束营业吗？', panel.x + 40, panel.y + 54, {
    size: FONT.title,
    weight: '700',
    color: COLORS.ink,
  });
  drawText(
    ctx,
    '打烊中会停止来新客人，服务完当前客人再结算；直接离开才赔偿。',
    panel.x + 40,
    panel.y + 88,
    {
      size: 13,
      color: COLORS.inkSoft,
      maxWidth: panel.w - 80,
    },
  );
  drawText(
    ctx,
    penalty > 0
      ? `预计赔偿 ${compactNumber(penalty)} 王都币 · 净收入可为负，钱包最低扣到 0`
      : '当前没有未上菜客人，直接离开不赔偿。',
    panel.x + 40,
    panel.y + 112,
    {
      size: 13,
      weight: '700',
      color: penalty > 0 ? COLORS.coral : COLORS.jade,
      maxWidth: panel.w - 80,
    },
  );
  const buttonW = panel.w - 80;
  const continueRect: Rect = { x: panel.x + 40, y: panel.y + 140, w: buttonW, h: 64 };
  const closeRect: Rect = { x: panel.x + 40, y: panel.y + 220, w: buttonW, h: 64 };
  const leaveRect: Rect = { x: panel.x + 40, y: panel.y + 300, w: buttonW, h: 64 };
  drawStickerButton(ctx, continueRect, '继续营业', {
    fill: COLORS.jade,
    textColor: COLORS.paper,
    fontSize: 16,
    seed: 1963,
  });
  drawStickerButton(ctx, closeRect, '打烊中（服务完客人）', {
    fill: COLORS.gold,
    textColor: COLORS.honeyDeep,
    fontSize: 15,
    seed: 1965,
  });
  drawStickerButton(ctx, leaveRect, '直接离开（赔偿）', {
    fill: COLORS.coral,
    textColor: COLORS.paper,
    fontSize: 15,
    seed: 1967,
  });
  return { panel: { x: 0, y: 0, w: width, h: height }, continue: continueRect, close: closeRect, leave: leaveRect };
}

function signedNumber(value: number): string {
  return value < 0 ? `-${compactNumber(-value)}` : compactNumber(value);
}

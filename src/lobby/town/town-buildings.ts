import { drawPetal, drawStar, drawText } from '../../shared/design-system/draw';
import {
  fillPoints,
  inkEllipse,
  inkLine,
  inkRoundRect,
  paperShade,
  Point,
  softShadow,
  strokeInk,
  tracePath,
} from '../../shared/design-system/paint';
import { COLORS, TOWN_COLORS } from '../../shared/design-system/tokens';
import { drawGameIcon } from '../game-icons';
import { TownBuildingLayout, TownFacilityLayout } from './town-layout';
import { TownPalette } from './town-palette';

export interface BuildingAnchors {
  signY: number;
  roofY: number;
  smoke: Point;
  sparkle: Point;
  door: Point;
  glow: Point[];
}

export const BUILDING_ANCHORS: Record<string, BuildingAnchors> = {
  match3: {
    signY: -300,
    roofY: -242,
    smoke: { x: 70, y: -292 },
    sparkle: { x: -92, y: -214 },
    door: { x: 0, y: -20 },
    glow: [
      { x: -49, y: -121 },
      { x: 47, y: -121 },
      { x: 0, y: -50 },
    ],
  },
  garden: {
    signY: -300,
    roofY: -252,
    smoke: { x: 0, y: -292 },
    sparkle: { x: -86, y: -218 },
    door: { x: 0, y: -18 },
    glow: [
      { x: 0, y: -70 },
      { x: -78, y: -70 },
      { x: 74, y: -70 },
    ],
  },
  merge: {
    signY: -300,
    roofY: -250,
    smoke: { x: 62, y: -286 },
    sparkle: { x: -92, y: -218 },
    door: { x: 38, y: -18 },
    glow: [
      { x: -28, y: -104 },
      { x: 54, y: -38 },
    ],
  },
  farm: {
    signY: -278,
    roofY: -236,
    smoke: { x: -58, y: -248 },
    sparkle: { x: 82, y: -176 },
    door: { x: 0, y: -18 },
    glow: [
      { x: -66, y: -132 },
      { x: 0, y: -84 },
    ],
  },
  aquarium: {
    signY: -210,
    roofY: -232,
    smoke: { x: 0, y: -286 },
    sparkle: { x: -92, y: -206 },
    door: { x: 78, y: -18 },
    glow: [
      { x: -62, y: -142 },
      { x: 58, y: -142 },
      { x: 0, y: -86 },
    ],
  },
  restaurant: {
    signY: -300,
    roofY: -244,
    smoke: { x: 60, y: -262 },
    sparkle: { x: -90, y: -212 },
    door: { x: 0, y: -18 },
    glow: [
      { x: -70, y: -150 },
      { x: 70, y: -150 },
      { x: 0, y: -74 },
    ],
  },
  ranch: {
    signY: -286,
    roofY: -244,
    smoke: { x: 74, y: -252 },
    sparkle: { x: -92, y: -206 },
    door: { x: 0, y: -18 },
    glow: [
      { x: -82, y: -124 },
      { x: 64, y: -118 },
      { x: 0, y: -66 },
    ],
  },
};

function shape(ctx: CanvasRenderingContext2D, points: Point[], fill: string, seed: number, width = 3): void {
  fillPoints(ctx, points, fill);
  strokeInk(ctx, points, { seed, width, wobble: 0.75, doubleStroke: false });
}

function plinth(ctx: CanvasRenderingContext2D, width: number, palette: TownPalette): void {
  softShadow(ctx, 8, 4, width * 0.56, 18, 0.2, 5);
  inkRoundRect(ctx, -width / 2, -28, width, 28, 10, palette.stone, {
    stroke: palette.stoneDeep,
    width: 2.5,
    seed: 211,
  });
  inkRoundRect(ctx, -width / 2 + 8, -36, width - 16, 10, 5, COLORS.paper, {
    stroke: 'rgba(58,46,42,0.14)',
    width: 1.5,
    seed: 213,
  });
}

function window(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: TownPalette,
  seed: number,
): void {
  inkRoundRect(ctx, x, y, w, h, 10, palette.window, {
    stroke: 'rgba(58,46,42,0.28)',
    width: 2,
    seed,
  });
  ctx.strokeStyle = 'rgba(58,46,42,0.20)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

function signBoardBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: TownPalette,
): void {
  inkRoundRect(ctx, -width / 2 + 4, 6, width, height, 10, 'rgba(58,46,42,0.14)', {
    width: 0,
    seed: 223,
  });
  inkRoundRect(ctx, -width / 2, 0, width, height, 10, COLORS.paper, {
    stroke: 'rgba(58,46,42,0.22)',
    width: 2.2,
    seed: 227,
  });
  paperShade(ctx, -width / 2, 0, width, height, 10, 0.06);
  inkLine(
    ctx,
    [
      { x: -width * 0.36, y: -20 },
      { x: -width * 0.36, y: 2 },
    ],
    { stroke: palette.woodDeep, width: 2.2, seed: 229, wobble: 0.3 },
  );
  inkLine(
    ctx,
    [
      { x: width * 0.36, y: -20 },
      { x: width * 0.36, y: 2 },
    ],
    { stroke: palette.woodDeep, width: 2.2, seed: 231, wobble: 0.3 },
  );
}

function candyShop(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 250, palette);
  inkRoundRect(ctx, -106, -220, 212, 198, 18, palette.wall, {
    stroke: palette.outline,
    width: 3,
    seed: 241,
  });
  paperShade(ctx, -106, -220, 212, 198, 18, 0.1);
  // 侧墙厚度
  inkRoundRect(ctx, 78, -212, 26, 188, 10, palette.wallShade, { width: 0 });
  // 屋顶
  const roof: Point[] = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    roof.push({ x: -124 + 248 * t, y: -242 - Math.sin(t * Math.PI) * 54 });
  }
  roof.push({ x: 124, y: -198 }, { x: 106, y: -180 }, { x: -106, y: -180 }, { x: -124, y: -198 });
  shape(ctx, roof, palette.roof1, 251, 3.2);
  for (let i = 0; i < 5; i += 1) {
    const bx = -100 + i * 50;
    ctx.beginPath();
    ctx.arc(bx, -190, 25, 0, Math.PI);
    ctx.fillStyle = palette.roof1;
    ctx.fill();
    ctx.strokeStyle = palette.roof1Deep;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  ctx.strokeStyle = palette.roof1Deep;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.55;
  for (let row = 0; row < 3; row += 1) {
    const ry = -248 + row * 18;
    for (let i = 0; i < 5; i += 1) {
      const tx = -100 + i * 50 + (row % 2) * 25;
      ctx.beginPath();
      ctx.arc(tx, ry, 24, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = palette.roof1Deep;
  ctx.lineWidth = 1.8;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 46, -288);
    ctx.quadraticCurveTo(i * 54, -242, i * 58, -198);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 烟囱
  inkRoundRect(ctx, 56, -302, 28, 66, 8, COLORS.petalDeep, {
    stroke: palette.outline,
    width: 2.4,
    seed: 257,
  });
  // 雨棚
  const ay = -184;
  for (let i = 0; i < 7; i += 1) {
    const sw = 212 / 7;
    ctx.fillStyle = i % 2 === 0 ? COLORS.berry : COLORS.paper;
    ctx.fillRect(-106 + i * sw, ay, sw + 0.5, 30);
    ctx.beginPath();
    ctx.arc(-106 + (i + 0.5) * sw, ay + 30, sw / 2, 0, Math.PI);
    ctx.fill();
  }
  inkRoundRect(ctx, -106, ay, 212, 32, 6, null, {
    stroke: 'rgba(58,46,42,0.24)',
    width: 2,
    seed: 263,
  });
  // 橱窗
  window(ctx, -80, -150, 62, 58, palette, 269);
  window(ctx, 16, -150, 62, 58, palette, 271);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(-64 + i * 18, -108, 7, 0, Math.PI * 2);
    ctx.fillStyle = [COLORS.berry, COLORS.honey, COLORS.mint][i];
    ctx.fill();
    ctx.fillRect(-69 + i * 18, -116, 10, 6);
  }
  ctx.beginPath();
  ctx.arc(-48, -94, 13, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.honey;
  ctx.fill();
  ctx.fillStyle = palette.outline;
  ctx.beginPath();
  ctx.arc(-53, -97, 1.8, 0, Math.PI * 2);
  ctx.arc(-43, -97, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-48, -94, 6, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // 门
  inkRoundRect(ctx, -28, -92, 56, 82, 14, COLORS.petalDeep, {
    stroke: palette.outline,
    width: 2.6,
    seed: 277,
  });
  inkRoundRect(ctx, -20, -82, 40, 68, 10, COLORS.petal, { width: 0 });
  ctx.beginPath();
  ctx.arc(10, -48, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  drawPetal(ctx, 0, -58, 5.5, COLORS.paper);
  // 棒棒糖
  inkLine(ctx, [{ x: 112, y: -8 }, { x: 112, y: -174 }], {
    stroke: COLORS.paper,
    width: 6,
    seed: 281,
    wobble: 0.3,
  });
  inkEllipse(ctx, 112, -200, 32, 32, COLORS.petal, {
    stroke: palette.outline,
    width: 2.6,
    seed: 283,
  });
  ctx.strokeStyle = COLORS.paper;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(112, -200, 19, 0.2, Math.PI * 1.5);
  ctx.stroke();
  drawStar(ctx, 112, -200, 5.5, 2.4, COLORS.gold);
}

function greenhouse(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 230, palette);
  const body: Point[] = [
    { x: -104, y: 0 },
    { x: -104, y: -120 },
    { x: 0, y: -224 },
    { x: 104, y: -120 },
    { x: 104, y: 0 },
  ];
  shape(ctx, body, palette.glass, 291, 3.2);
  ctx.save();
  tracePath(ctx, body, true);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,247,224,0.62)';
  ctx.fillRect(-104, -70, 208, 70);
  ctx.fillStyle = 'rgba(255,222,154,0.42)';
  ctx.beginPath();
  ctx.ellipse(0, -66, 70, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = palette.glassDeep;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, -216);
  ctx.lineTo(0, 0);
  for (const y of [-164, -120, -76]) {
    ctx.moveTo(-96, y);
    ctx.lineTo(96, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = COLORS.paper;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-72, -178);
  ctx.lineTo(-44, -196);
  ctx.moveTo(-58, -120);
  ctx.lineTo(-30, -150);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // 植物
  for (const [px, py, color] of [
    [-62, -82, COLORS.petal],
    [-24, -98, COLORS.honey],
    [30, -76, COLORS.berry],
    [62, -104, COLORS.mint],
  ] as Array<[number, number, string]>) {
    inkLine(ctx, [{ x: px, y: py }, { x: px, y: py + 34 }], {
      stroke: COLORS.leaf,
      width: 2.4,
      seed: 293 + px,
      wobble: 0.3,
    });
    drawPetal(ctx, px, py - 4, 8.5, color);
  }
  // 门
  inkRoundRect(ctx, -24, -76, 48, 70, 18, COLORS.mint, {
    stroke: palette.outline,
    width: 2.4,
    seed: 301,
  });
  inkRoundRect(ctx, -16, -66, 32, 56, 12, COLORS.paper, { width: 0 });
  // 花槽
  for (const ex of [-100, 56]) {
    inkRoundRect(ctx, ex, -64, 44, 18, 6, palette.wood, {
      stroke: palette.woodDeep,
      width: 1.8,
      seed: 307 + ex,
    });
    for (let i = 0; i < 3; i += 1) {
      drawPetal(ctx, ex + 10 + i * 12, -70, 5.2, [COLORS.petal, COLORS.honey, COLORS.berry][i]);
    }
  }
  // 藤蔓
  ctx.strokeStyle = COLORS.leaf;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-92, -120, 30, Math.PI * 0.7, Math.PI * 1.6);
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(-116 + i * 4, -150 + i * 14, 7, 5, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.leaf;
    ctx.fill();
  }
  // 屋顶花风向标
  inkLine(ctx, [{ x: 0, y: -224 }, { x: 0, y: -246 }], {
    stroke: palette.outline,
    width: 2.2,
    seed: 311,
    wobble: 0.2,
  });
  drawPetal(ctx, 0, -252, 8.5, COLORS.honey);
  shape(
    ctx,
    [
      { x: -44, y: -206 },
      { x: 0, y: -232 },
      { x: 44, y: -206 },
    ],
    COLORS.leaf,
    313,
    2.4,
  );
}

function restaurant(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 240, palette);
  // 奶油色店面
  inkRoundRect(ctx, -100, -206, 200, 186, 18, COLORS.cream, {
    stroke: palette.outline,
    width: 3,
    seed: 351,
  });
  paperShade(ctx, -100, -206, 200, 186, 18, 0.12);
  inkRoundRect(ctx, 78, -200, 22, 180, 9, COLORS.coral, { width: 0 });
  // 桃色屋顶
  shape(
    ctx,
    [
      { x: -116, y: -200 },
      { x: 0, y: -262 },
      { x: 116, y: -200 },
      { x: 104, y: -186 },
      { x: 0, y: -242 },
      { x: -104, y: -186 },
    ],
    COLORS.peach,
    353,
    2.8,
  );
  ctx.strokeStyle = 'rgba(184,92,72,0.55)';
  ctx.lineWidth = 1.6;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 30, -246);
    ctx.lineTo(i * 44, -190);
    ctx.stroke();
  }
  // 烟囱
  inkRoundRect(ctx, 46, -294, 28, 52, 8, '#C8907F', {
    stroke: palette.outline,
    width: 2.2,
    seed: 355,
  });
  // 条纹雨棚
  const ay = -168;
  for (let i = 0; i < 6; i += 1) {
    const sw = 184 / 6;
    ctx.fillStyle = i % 2 === 0 ? COLORS.coral : COLORS.paper;
    ctx.fillRect(-92 + i * sw, ay, sw + 0.5, 24);
  }
  inkRoundRect(ctx, -92, ay, 184, 26, 5, null, {
    stroke: 'rgba(58,46,42,0.24)',
    width: 2,
    seed: 357,
  });
  // 大橱窗
  window(ctx, -76, -134, 82, 58, palette, 359);
  // 门
  inkRoundRect(ctx, 18, -136, 62, 118, 12, palette.wood, {
    stroke: palette.woodDeep,
    width: 2.6,
    seed: 361,
  });
  inkRoundRect(ctx, 26, -126, 46, 44, 8, palette.window, {
    stroke: 'rgba(58,46,42,0.22)',
    width: 1.8,
    seed: 363,
  });
  inkRoundRect(ctx, 58, -70, 8, 8, 4, COLORS.gold, { width: 0 });
  // 门口的餐牌
  inkLine(ctx, [{ x: -84, y: -18 }, { x: -84, y: -66 }], {
    stroke: palette.woodDeep,
    width: 4,
    seed: 365,
    wobble: 0.2,
  });
  shape(
    ctx,
    [
      { x: -116, y: -92 },
      { x: -84, y: -112 },
      { x: -52, y: -92 },
      { x: -84, y: -72 },
    ],
    COLORS.paper,
    367,
    2.2,
  );
  drawText(ctx, 'OPEN', -84, -91, {
    size: 11,
    weight: '700',
    color: COLORS.coral,
    align: 'center',
  });
  // 屋顶小旗
  inkLine(ctx, [{ x: 0, y: -262 }, { x: 0, y: -288 }], {
    stroke: palette.woodDeep,
    width: 3,
    seed: 369,
  });
  ctx.beginPath();
  ctx.moveTo(0, -286);
  ctx.lineTo(34, -276);
  ctx.lineTo(0, -266);
  ctx.closePath();
  ctx.fillStyle = COLORS.coral;
  ctx.fill();
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function farmhouse(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 246, palette);
  // 谷仓主体
  inkRoundRect(ctx, -100, -196, 200, 176, 16, COLORS.cream, {
    stroke: palette.outline,
    width: 3,
    seed: 318,
  });
  paperShade(ctx, -100, -196, 200, 176, 16, 0.12);
  inkRoundRect(ctx, 78, -190, 22, 170, 9, COLORS.honey, { width: 0 });
  // 红色谷仓屋顶
  shape(
    ctx,
    [
      { x: -116, y: -190 },
      { x: 0, y: -252 },
      { x: 116, y: -190 },
      { x: 104, y: -176 },
      { x: 0, y: -234 },
      { x: -104, y: -176 },
    ],
    palette.roof1,
    319,
    2.8,
  );
  ctx.strokeStyle = palette.roof1Deep;
  ctx.lineWidth = 1.6;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 30, -236);
    ctx.lineTo(i * 42, -183);
    ctx.stroke();
  }
  // 谷仓大门与交叉木条
  inkRoundRect(ctx, -46, -124, 92, 102, 10, palette.wood, {
    stroke: palette.woodDeep,
    width: 2.6,
    seed: 320,
  });
  inkLine(ctx, [{ x: -36, y: -116 }, { x: 36, y: -30 }], {
    stroke: palette.woodDeep,
    width: 5,
    seed: 322,
    wobble: 0.2,
  });
  inkLine(ctx, [{ x: 36, y: -116 }, { x: -36, y: -30 }], {
    stroke: palette.woodDeep,
    width: 5,
    seed: 324,
    wobble: 0.2,
  });
  // 窗
  for (const wx of [-78, 56]) {
    inkRoundRect(ctx, wx, -160, 38, 34, 6, palette.window, {
      stroke: palette.outline,
      width: 2,
      seed: 326 + wx,
    });
    inkLine(ctx, [{ x: wx + 19, y: -160 }, { x: wx + 19, y: -126 }], {
      stroke: palette.outline,
      width: 1.5,
      seed: 330 + wx,
      wobble: 0.1,
    });
  }
  // 筒仓
  inkRoundRect(ctx, 88, -236, 42, 216, 18, TOWN_COLORS.stone, {
    stroke: palette.outline,
    width: 2.6,
    seed: 334,
  });
  inkRoundRect(ctx, 88, -236, 42, 34, 16, palette.roof2, {
    stroke: palette.roof2Deep,
    width: 2,
    seed: 336,
  });
  for (let i = 0; i < 4; i += 1) {
    inkLine(ctx, [{ x: 92, y: -190 + i * 38 }, { x: 126, y: -190 + i * 38 }], {
      stroke: 'rgba(154,101,56,0.36)',
      width: 1.2,
      seed: 338 + i,
      wobble: 0.1,
    });
  }
  // 干草与南瓜
  inkEllipse(ctx, -118, -20, 26, 18, COLORS.honey, {
    stroke: palette.woodDeep,
    width: 2,
    seed: 342,
  });
  inkEllipse(ctx, 124, -18, 18, 13, COLORS.honeyDeep, {
    stroke: palette.woodDeep,
    width: 2,
    seed: 344,
  });
  drawPetal(ctx, 118, -26, 5, COLORS.leaf);
}

function ranchBarn(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 252, palette);
  // 牧场主屋：奶油墙 + 绿色屋顶，和农场的红谷仓区分开。
  inkRoundRect(ctx, -104, -198, 208, 178, 18, COLORS.paper, {
    stroke: palette.outline,
    width: 3,
    seed: 341,
  });
  paperShade(ctx, -104, -198, 208, 178, 18, 0.12);
  inkRoundRect(ctx, 82, -192, 22, 172, 9, COLORS.leaf, { width: 0 });
  shape(
    ctx,
    [
      { x: -120, y: -192 },
      { x: 0, y: -254 },
      { x: 120, y: -192 },
      { x: 106, y: -178 },
      { x: 0, y: -236 },
      { x: -106, y: -178 },
    ],
    palette.roof3,
    343,
    2.8,
  );
  ctx.strokeStyle = palette.roof3Deep;
  ctx.lineWidth = 1.6;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 30, -238);
    ctx.lineTo(i * 44, -186);
    ctx.stroke();
  }
  // 门
  inkRoundRect(ctx, -44, -126, 88, 104, 10, palette.wood, {
    stroke: palette.woodDeep,
    width: 2.6,
    seed: 345,
  });
  inkLine(ctx, [{ x: -34, y: -118 }, { x: 34, y: -30 }], {
    stroke: palette.woodDeep,
    width: 4.5,
    seed: 347,
    wobble: 0.2,
  });
  inkLine(ctx, [{ x: 34, y: -118 }, { x: -34, y: -30 }], {
    stroke: palette.woodDeep,
    width: 4.5,
    seed: 349,
    wobble: 0.2,
  });
  // 奶罐
  inkRoundRect(ctx, -94, -58, 30, 40, 8, COLORS.sky, {
    stroke: palette.outline,
    width: 2,
    seed: 351,
  });
  inkRoundRect(ctx, -88, -66, 18, 10, 4, COLORS.paper, {
    stroke: palette.outline,
    width: 1.6,
    seed: 353,
  });
  // 小栅栏
  for (const x of [-118, 112]) {
    inkLine(ctx, [{ x, y: -8 }, { x, y: -50 }], {
      stroke: palette.woodDeep,
      width: 4,
      seed: 355 + x,
      wobble: 0.15,
    });
  }
  ctx.strokeStyle = palette.wood;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-118, -38);
  ctx.quadraticCurveTo(-80, -28, -44, -38);
  ctx.moveTo(44, -38);
  ctx.quadraticCurveTo(80, -28, 112, -38);
  ctx.stroke();
  // 干草堆与鸡
  inkEllipse(ctx, -108, -18, 22, 15, COLORS.honey, {
    stroke: palette.woodDeep,
    width: 2,
    seed: 357,
  });
  inkEllipse(ctx, 100, -18, 16, 12, COLORS.cream, {
    stroke: COLORS.ink,
    width: 2,
    seed: 359,
  });
  inkEllipse(ctx, 112, -28, 9, 8, COLORS.paper, {
    stroke: COLORS.ink,
    width: 1.6,
    seed: 361,
  });
  inkRoundRect(ctx, 108, -38, 5, 8, 2, COLORS.coral, { width: 0 });
  drawPetal(ctx, 118, -22, 5, COLORS.leaf);
}

function bakery(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 236, palette);
  inkRoundRect(ctx, -100, -212, 200, 190, 18, COLORS.honey, {
    stroke: palette.outline,
    width: 3,
    seed: 321,
  });
  paperShade(ctx, -100, -212, 200, 190, 18, 0.12);
  inkRoundRect(ctx, 76, -206, 24, 184, 10, COLORS.honeyDeep, { width: 0 });
  // 砖缝
  ctx.strokeStyle = 'rgba(185,134,47,0.5)';
  ctx.lineWidth = 1.3;
  for (let row = 0; row < 6; row += 1) {
    const y = -192 + row * 26;
    ctx.beginPath();
    ctx.moveTo(-92, y);
    ctx.lineTo(90, y);
    ctx.stroke();
    for (let k = 0; k < 4; k += 1) {
      const x = -86 + k * 40 + (row % 2) * 20;
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  // 屋顶
  inkRoundRect(ctx, -118, -238, 236, 30, 12, palette.roof2, {
    stroke: palette.roof2Deep,
    width: 2.6,
    seed: 327,
  });
  inkRoundRect(ctx, -108, -250, 216, 18, 9, palette.roof2Deep, { width: 0 });
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.arc(-92 + i * 34, -238, 17, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(194,135,28,0.5)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // 烟囱
  inkRoundRect(ctx, 52, -308, 32, 70, 8, COLORS.honeyDeep, {
    stroke: palette.outline,
    width: 2.4,
    seed: 331,
  });
  // 格纹雨棚
  const ay = -164;
  for (let i = 0; i < 6; i += 1) {
    const sw = 184 / 6;
    ctx.fillStyle = i % 2 === 0 ? COLORS.coral : COLORS.paper;
    ctx.fillRect(-92 + i * sw, ay, sw + 0.5, 26);
  }
  inkRoundRect(ctx, -92, ay, 184, 28, 5, null, {
    stroke: 'rgba(58,46,42,0.24)',
    width: 2,
    seed: 337,
  });
  inkLine(ctx, [{ x: -92, y: ay + 30 }, { x: 92, y: ay + 30 }], {
    stroke: palette.woodDeep,
    width: 4,
    seed: 339,
    wobble: 0.3,
  });
  // 圆窗
  inkEllipse(ctx, -28, -104, 34, 34, palette.window, {
    stroke: palette.outline,
    width: 2.4,
    seed: 341,
  });
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-28, -138);
  ctx.lineTo(-28, -70);
  ctx.moveTo(-62, -104);
  ctx.lineTo(6, -104);
  ctx.stroke();
  ctx.fillStyle = COLORS.honeyDeep;
  ctx.beginPath();
  ctx.ellipse(-42, -96, 13, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(-16, -96, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 门
  inkRoundRect(ctx, 34, -78, 44, 72, 12, COLORS.honeyDeep, {
    stroke: palette.outline,
    width: 2.4,
    seed: 347,
  });
  inkRoundRect(ctx, 40, -68, 32, 58, 8, COLORS.path, { width: 0 });
  ctx.beginPath();
  ctx.arc(64, -38, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  // 面包篮
  inkRoundRect(ctx, -98, -34, 52, 24, 8, palette.wood, {
    stroke: palette.woodDeep,
    width: 2,
    seed: 349,
  });
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(-88 + i * 14, -42, 8, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.honeyDeep;
    ctx.fill();
  }
  // 屋顶面包
  ctx.beginPath();
  ctx.ellipse(0, -262, 20, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.honeyDeep;
  ctx.fill();
  ctx.strokeStyle = COLORS.honey;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-10 + i * 10, -266);
    ctx.lineTo(-7 + i * 10, -258);
    ctx.stroke();
  }
}

function aquarium(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 240, palette);
  inkRoundRect(ctx, -104, -206, 208, 186, 20, COLORS.water, {
    stroke: palette.outline,
    width: 3,
    seed: 357,
  });
  paperShade(ctx, -104, -206, 208, 186, 20, 0.11);
  inkRoundRect(ctx, 78, -200, 24, 180, 10, COLORS.waterDeep, { width: 0 });
  // 波浪屋顶
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(-68 + i * 56, -232, 28, Math.PI, Math.PI * 2);
    ctx.fillStyle = COLORS.sky;
    ctx.fill();
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  inkRoundRect(ctx, -108, -206, 216, 10, 5, COLORS.sky, { width: 0 });
  // 侧舷窗
  for (const px of [-62, 58]) {
    inkEllipse(ctx, px, -142, 22, 22, palette.window, {
      stroke: palette.outline,
      width: 2.2,
      seed: 361 + px,
    });
    ctx.beginPath();
    ctx.ellipse(px - 3, -144, 9, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.petal;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 6, -144);
    ctx.lineTo(px + 13, -149);
    ctx.lineTo(px + 13, -139);
    ctx.closePath();
    ctx.fill();
  }
  // 大舷窗
  inkEllipse(ctx, 0, -86, 62, 58, palette.window, {
    stroke: palette.outline,
    width: 3,
    seed: 367,
  });
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -86, 55, 51, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(140,207,232,0.55)';
  ctx.fillRect(-55, -110, 110, 70);
  // 鱼
  for (const [fx, fy, fs, fc, dir] of [
    [-18, -94, 22, COLORS.petal, 1],
    [24, -68, 16, COLORS.honey, -1],
    [-28, -50, 13, COLORS.lilac, 1],
  ] as Array<[number, number, number, string, number]>) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, fs, fs * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = fc;
    ctx.fill();
    const tail = fx - fs * dir;
    ctx.beginPath();
    ctx.moveTo(tail, fy);
    ctx.lineTo(tail - fs * 0.7 * dir, fy - fs * 0.55);
    ctx.lineTo(tail - fs * 0.7 * dir, fy + fs * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + fs * 0.35 * dir, fy - fs * 0.1, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ink;
    ctx.fill();
  }
  ctx.restore();
  // 海草
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-46 + i * 24, 0);
    ctx.quadraticCurveTo(-54 + i * 24, -24, -40 + i * 24, -46);
    ctx.strokeStyle = COLORS.leaf;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // 门
  inkRoundRect(ctx, 62, -78, 42, 72, 16, COLORS.waterDeep, {
    stroke: palette.outline,
    width: 2.4,
    seed: 373,
  });
  inkRoundRect(ctx, 68, -68, 30, 58, 12, COLORS.sky, { width: 0 });
  // 屋顶小水缸
  inkRoundRect(ctx, -34, -288, 68, 44, 14, COLORS.sky, {
    stroke: palette.outline,
    width: 2.4,
    seed: 377,
  });
  inkRoundRect(ctx, -27, -281, 54, 30, 10, 'rgba(140,207,232,0.7)', { width: 0 });
  ctx.beginPath();
  ctx.ellipse(-4, -268, 10, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.petal;
  ctx.fill();
  for (let i = 0; i < 2; i += 1) {
    ctx.beginPath();
    ctx.arc(18 + i * 7, -292 - i * 9, 3, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.paper;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function scaffolding(ctx: CanvasRenderingContext2D, palette: TownPalette, offsetY = 0): void {
  // 只在门口围一小段木栏 + 落地挂牌，保留建筑本身可看，不把立面钉满脚手架。
  ctx.save();
  ctx.translate(0, offsetY);
  ctx.globalAlpha = 0.94;
  for (const x of [-58, 58]) {
    inkLine(ctx, [{ x, y: 0 }, { x, y: -42 }], {
      stroke: palette.woodDeep,
      width: 5,
      seed: 381 + x,
      wobble: 0.35,
    });
    inkRoundRect(ctx, x - 7, -8, 14, 8, 3, palette.wood, { width: 0 });
  }
  ctx.strokeStyle = palette.wood;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-58, -34);
  ctx.quadraticCurveTo(0, -16, 58, -34);
  ctx.stroke();
  inkRoundRect(ctx, -38, -50, 76, 26, 11, palette.wood, {
    stroke: palette.woodDeep,
    width: 2,
    seed: 397,
  });
  inkLine(ctx, [{ x: -28, y: -20 }, { x: -28, y: -14 }], {
    stroke: palette.woodDeep,
    width: 1.8,
    seed: 399,
    wobble: 0.2,
  });
  inkLine(ctx, [{ x: 28, y: -20 }, { x: 28, y: -14 }], {
    stroke: palette.woodDeep,
    width: 1.8,
    seed: 401,
    wobble: 0.2,
  });
  drawText(ctx, '装修中', 0, -37, {
    size: 13,
    weight: '700',
    color: COLORS.paper,
    align: 'center',
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawBuildingBody(
  ctx: CanvasRenderingContext2D,
  building: TownBuildingLayout,
  palette: TownPalette,
): void {
  switch (building.entry.id) {
    case 'match3':
      candyShop(ctx, palette);
      break;
    case 'garden':
      greenhouse(ctx, palette);
      break;
    case 'merge':
      bakery(ctx, palette);
      break;
    case 'aquarium':
      aquarium(ctx, palette);
      break;
    case 'farm':
      farmhouse(ctx, palette);
      break;
    case 'restaurant':
      restaurant(ctx, palette);
      break;
    case 'ranch':
      ranchBarn(ctx, palette);
      break;
    default:
      plinth(ctx, 230, palette);
      inkRoundRect(ctx, -100, -210, 200, 188, 18, building.accent.soft, {
        stroke: palette.outline,
        width: 3,
        seed: 401,
      });
      break;
  }

  if (building.entry.status !== 'playable') {
    // 水族馆的鱼缸更低，木牌下移，避免盖住主鱼。
    scaffolding(ctx, palette, building.entry.id === 'aquarium' ? 20 : 0);
  }
}

function drawSmoke(
  ctx: CanvasRenderingContext2D,
  anchor: Point,
  time: number,
  reducedMotion: boolean,
): void {
  if (reducedMotion) return;
  for (let i = 0; i < 3; i += 1) {
    const t = (time * 0.32 + i * 0.33) % 1;
    ctx.globalAlpha = 0.38 * (1 - t);
    ctx.fillStyle = COLORS.paper;
    ctx.beginPath();
    ctx.arc(anchor.x + Math.sin(t * 6 + i) * 7, anchor.y - t * 44, 8 + t * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawBuildingOverlay(
  ctx: CanvasRenderingContext2D,
  building: TownBuildingLayout,
  palette: TownPalette,
  time: number,
  iconStyle: string,
  reducedMotion: boolean,
): void {
  const anchors = BUILDING_ANCHORS[building.entry.id];
  if (!anchors) return;

  if (palette.night || palette.phase === 'dusk') {
    const base = palette.night ? 0.2 : 0.1;
    for (const point of anchors.glow) {
      for (let i = 4; i > 0; i -= 1) {
        ctx.globalAlpha = base * (0.35 + i * 0.12);
        ctx.fillStyle = palette.lamp;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10 + i * 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawSmoke(ctx, anchors.smoke, time, reducedMotion);

  // 招牌：悬在屋顶上方时补一根木杆，贴在立面时直接固定。
  if (anchors.signY + 26 < anchors.roofY) {
    inkLine(ctx, [{ x: 0, y: anchors.roofY + 6 }, { x: 0, y: anchors.signY + 22 }], {
      stroke: palette.woodDeep,
      width: 4.5,
      seed: 401 + building.base.x,
      wobble: 0.2,
    });
    inkLine(ctx, [{ x: -54, y: anchors.signY + 21 }, { x: 54, y: anchors.signY + 21 }], {
      stroke: palette.woodDeep,
      width: 3.4,
      seed: 405 + building.base.x,
      wobble: 0.2,
    });
  }

  // 招牌：每帧画，允许轻微摆动；文字保持清晰。
  const swing = reducedMotion ? 0 : Math.sin(time * 1.7 + building.base.x) * 0.026;
  ctx.save();
  ctx.translate(0, anchors.signY);
  ctx.rotate(swing);
  signBoardBase(ctx, 138, 42, palette);
  drawGameIcon(ctx, building.entry.id, -46, 21, 26, building.accent, iconStyle);
  drawText(ctx, building.entry.title, -24, 21, {
    size: 15,
    weight: '700',
    color: palette.outline,
    maxWidth: 100,
  });
  ctx.restore();

  if (building.entry.status === 'playable') {
    // 门口只留暖光，不再挂「可游玩」吊牌。
    const door = anchors.door;
    for (let i = 3; i > 0; i -= 1) {
      ctx.globalAlpha = 0.06 + (3 - i) * 0.035;
      ctx.fillStyle = palette.lamp;
      ctx.beginPath();
      ctx.ellipse(door.x, door.y - 12, 20 + i * 11, 13 + i * 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/** 兼容旧调用：烘焙时只画静态 body。 */
export function drawTownBuilding(
  ctx: CanvasRenderingContext2D,
  building: TownBuildingLayout,
  palette: TownPalette,
  _time: number,
  _iconStyle: string,
  _reducedMotion: boolean,
): void {
  drawBuildingBody(ctx, building, palette);
}

export const FACILITY_ANCHORS: Record<string, BuildingAnchors> = {
  warehouse: {
    signY: -318,
    roofY: -258,
    smoke: { x: 66, y: -300 },
    sparkle: { x: -96, y: -214 },
    door: { x: 0, y: -18 },
    glow: [
      { x: -58, y: -108 },
      { x: 58, y: -108 },
      { x: 0, y: -46 },
    ],
  },
};

/** 库房招牌的小木箱图标：不做成游戏图标，避免和场馆混淆。 */
function drawCrateIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const half = size / 2;
  inkRoundRect(ctx, cx - half, cy - half * 0.8, size, size * 0.8, 4, COLORS.honey, {
    stroke: COLORS.honeyDeep,
    width: 2,
    seed: 2401,
  });
  inkLine(ctx, [{ x: cx - half + 3, y: cy - half * 0.8 + 4 }, { x: cx + half - 3, y: cy + half * 0.8 - 4 }], {
    stroke: COLORS.honeyDeep,
    width: 2,
    seed: 2403,
    wobble: 0.2,
  });
  inkLine(ctx, [{ x: cx - half + 3, y: cy + half * 0.8 - 4 }, { x: cx + half - 3, y: cy - half * 0.8 + 4 }], {
    stroke: COLORS.honeyDeep,
    width: 2,
    seed: 2405,
    wobble: 0.2,
  });
}

/** 王都仓库：木构仓房 + 双开横木大门 + 门口木箱麻袋。 */
function warehouse(ctx: CanvasRenderingContext2D, palette: TownPalette): void {
  plinth(ctx, 264, palette);
  // 墙体
  inkRoundRect(ctx, -108, -232, 216, 206, 14, TOWN_COLORS.wood, {
    stroke: palette.outline,
    width: 3,
    seed: 2411,
  });
  paperShade(ctx, -108, -232, 216, 206, 14, 0.12);
  // 木板缝
  ctx.strokeStyle = 'rgba(154,101,56,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 7; i += 1) {
    const x = -98 + i * 32;
    ctx.beginPath();
    ctx.moveTo(x, -226);
    ctx.lineTo(x, -30);
    ctx.stroke();
  }
  // 屋顶（人字）
  shape(
    ctx,
    [
      { x: -126, y: -232 },
      { x: 0, y: -300 },
      { x: 126, y: -232 },
    ],
    palette.roof1,
    2415,
    3,
  );
  inkRoundRect(ctx, -134, -240, 268, 18, 9, palette.roof1Deep, { width: 0 });
  // 通风小阁
  inkRoundRect(ctx, -22, -320, 44, 34, 8, palette.roof1, {
    stroke: palette.outline,
    width: 2.4,
    seed: 2419,
  });
  inkRoundRect(ctx, -14, -312, 28, 18, 4, palette.window, { width: 0 });
  shape(
    ctx,
    [
      { x: -30, y: -318 },
      { x: 0, y: -340 },
      { x: 30, y: -318 },
    ],
    palette.roof1Deep,
    2421,
    2.4,
  );
  // 双开大门
  inkRoundRect(ctx, -66, -168, 132, 142, 12, TOWN_COLORS.woodDeep, {
    stroke: palette.outline,
    width: 2.8,
    seed: 2425,
  });
  inkLine(ctx, [{ x: 0, y: -168 }, { x: 0, y: -26 }], {
    stroke: palette.outline,
    width: 2.6,
    seed: 2427,
    wobble: 0.2,
  });
  for (const side of [-1, 1]) {
    inkLine(ctx, [{ x: side * 58, y: -156 }, { x: side * 10, y: -34 }], {
      stroke: COLORS.honeyDeep,
      width: 4,
      seed: 2429 + side,
      wobble: 0.25,
    });
    inkLine(ctx, [{ x: side * 58, y: -34 }, { x: side * 10, y: -156 }], {
      stroke: COLORS.honeyDeep,
      width: 4,
      seed: 2431 + side,
      wobble: 0.25,
    });
  }
  // 门楣木梁
  inkRoundRect(ctx, -74, -182, 148, 16, 6, TOWN_COLORS.woodDeep, {
    stroke: palette.outline,
    width: 2,
    seed: 2433,
  });
  // 窗
  window(ctx, -96, -214, 34, 30, palette, 2435);
  window(ctx, 62, -214, 34, 30, palette, 2437);
  // 门口暖灯
  inkLine(ctx, [{ x: -84, y: -186 }, { x: -84, y: -172 }], {
    stroke: palette.woodDeep,
    width: 2,
    seed: 2439,
  });
  inkEllipse(ctx, -84, -166, 7, 8, palette.lamp, {
    stroke: palette.outline,
    width: 1.8,
    seed: 2441,
  });
  // 木箱 / 麻袋 / 木桶
  inkRoundRect(ctx, 76, -66, 40, 38, 6, COLORS.honey, {
    stroke: palette.outline,
    width: 2.2,
    seed: 2443,
  });
  inkLine(ctx, [{ x: 80, y: -60 }, { x: 112, y: -34 }], {
    stroke: COLORS.honeyDeep,
    width: 2,
    seed: 2445,
    wobble: 0.2,
  });
  inkRoundRect(ctx, 84, -100, 30, 30, 6, COLORS.cream, {
    stroke: palette.outline,
    width: 2,
    seed: 2447,
  });
  inkEllipse(ctx, -98, -50, 20, 24, COLORS.cream, {
    stroke: palette.outline,
    width: 2.2,
    seed: 2449,
  });
  inkEllipse(ctx, -98, -74, 9, 6, COLORS.cream, {
    stroke: palette.outline,
    width: 2,
    seed: 2451,
  });
  inkRoundRect(ctx, -126, -78, 30, 50, 8, TOWN_COLORS.woodDeep, {
    stroke: palette.outline,
    width: 2.2,
    seed: 2453,
  });
  inkLine(ctx, [{ x: -126, y: -56 }, { x: -96, y: -56 }], {
    stroke: COLORS.honeyDeep,
    width: 2,
    seed: 2455,
  });
  // 斜靠的木梯
  inkLine(ctx, [{ x: 46, y: -26 }, { x: 72, y: -170 }], {
    stroke: palette.woodDeep,
    width: 5,
    seed: 2457,
    wobble: 0.4,
  });
  inkLine(ctx, [{ x: 66, y: -26 }, { x: 92, y: -170 }], {
    stroke: palette.woodDeep,
    width: 5,
    seed: 2459,
    wobble: 0.4,
  });
  for (let i = 0; i < 4; i += 1) {
    inkLine(
      ctx,
      [
        { x: 50 + i * 2.4, y: -56 - i * 30 },
        { x: 70 + i * 2.4, y: -56 - i * 30 },
      ],
      { stroke: palette.wood, width: 3.4, seed: 2461 + i, wobble: 0.2 },
    );
  }
  // 门口草
  for (let i = 0; i < 5; i += 1) {
    inkLine(
      ctx,
      [
        { x: -20 + i * 12, y: -4 },
        { x: -16 + i * 12, y: -18 },
      ],
      { stroke: palette.grassDeep, width: 2.6, seed: 2467 + i, wobble: 0.6 },
    );
  }
}

export function drawFacilityBody(
  ctx: CanvasRenderingContext2D,
  facility: TownFacilityLayout,
  palette: TownPalette,
): void {
  switch (facility.facilityId) {
    case 'warehouse':
      warehouse(ctx, palette);
      break;
    default:
      plinth(ctx, 230, palette);
      break;
  }
}

/** 设施的动态层：招牌、夜灯、木箱微光；没有「可游玩」徽章。 */
export function drawFacilityOverlay(
  ctx: CanvasRenderingContext2D,
  facility: TownFacilityLayout,
  palette: TownPalette,
  time: number,
  reducedMotion: boolean,
): void {
  const anchors = FACILITY_ANCHORS[facility.facilityId];
  if (!anchors) return;

  if (palette.night || palette.phase === 'dusk') {
    const base = palette.night ? 0.2 : 0.1;
    for (const point of anchors.glow) {
      for (let i = 4; i > 0; i -= 1) {
        ctx.globalAlpha = base * (0.35 + i * 0.12);
        ctx.fillStyle = palette.lamp;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10 + i * 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawSmoke(ctx, anchors.smoke, time, reducedMotion);

  if (anchors.signY + 26 < anchors.roofY) {
    inkLine(ctx, [{ x: 0, y: anchors.roofY + 6 }, { x: 0, y: anchors.signY + 22 }], {
      stroke: palette.woodDeep,
      width: 4.5,
      seed: 2471 + facility.base.x,
      wobble: 0.2,
    });
    inkLine(ctx, [{ x: -54, y: anchors.signY + 21 }, { x: 54, y: anchors.signY + 21 }], {
      stroke: palette.woodDeep,
      width: 3.4,
      seed: 2475 + facility.base.x,
      wobble: 0.2,
    });
  }

  const swing = reducedMotion ? 0 : Math.sin(time * 1.5 + facility.base.x) * 0.022;
  ctx.save();
  ctx.translate(0, anchors.signY);
  ctx.rotate(swing);
  signBoardBase(ctx, 152, 42, palette);
  drawCrateIcon(ctx, -50, 21, 22);
  drawText(ctx, facility.title, -28, 21, {
    size: 15,
    weight: '700',
    color: palette.outline,
    maxWidth: 112,
  });
  ctx.restore();
}

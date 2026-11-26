import { drawPetal, drawStar, fillRoundRect } from './draw';
import { inkEllipse, inkLine, inkRoundRect, softShadow, strokeInk, Point } from './paint';
import { COLORS } from './tokens';

export type RoyalRole = 'king' | 'queen';
export type RoyalOutfitId = 'classic' | 'garden' | 'winter' | 'starlight';
export type RoyalMood = 'idle' | 'happy' | 'cheer' | 'worried' | 'sad';

interface RoyalPalette {
  outfit: string;
  outfitDeep: string;
  cape: string;
  trim: string;
  hat: string;
  hair: string;
}

const PALETTES: Record<RoyalOutfitId, { king: RoyalPalette; queen: RoyalPalette }> = {
  classic: {
    king: {
      outfit: COLORS.jade,
      outfitDeep: COLORS.teal,
      cape: COLORS.mint,
      trim: COLORS.gold,
      hat: COLORS.gold,
      hair: COLORS.inkSoft,
    },
    queen: {
      outfit: COLORS.petal,
      outfitDeep: COLORS.berry,
      cape: COLORS.peach,
      trim: COLORS.gold,
      hat: COLORS.gold,
      hair: COLORS.ink,
    },
  },
  garden: {
    king: {
      outfit: COLORS.leaf,
      outfitDeep: '#456B3A',
      cape: COLORS.mint,
      trim: COLORS.paper,
      hat: COLORS.honey,
      hair: COLORS.inkSoft,
    },
    queen: {
      outfit: COLORS.mint,
      outfitDeep: COLORS.mintDeep,
      cape: COLORS.petal,
      trim: COLORS.paper,
      hat: COLORS.honey,
      hair: COLORS.ink,
    },
  },
  winter: {
    king: {
      outfit: COLORS.sky,
      outfitDeep: COLORS.waterDeep,
      cape: COLORS.paper,
      trim: COLORS.coral,
      hat: COLORS.coral,
      hair: COLORS.inkSoft,
    },
    queen: {
      outfit: COLORS.lilac,
      outfitDeep: COLORS.lilacDeep,
      cape: COLORS.paper,
      trim: COLORS.coral,
      hat: COLORS.coral,
      hair: COLORS.ink,
    },
  },
  starlight: {
    king: {
      outfit: COLORS.lilacDeep,
      outfitDeep: COLORS.teal,
      cape: COLORS.lilac,
      trim: COLORS.gold,
      hat: COLORS.gold,
      hair: COLORS.inkSoft,
    },
    queen: {
      outfit: COLORS.lilac,
      outfitDeep: COLORS.lilacDeep,
      cape: COLORS.teal,
      trim: COLORS.gold,
      hat: COLORS.gold,
      hair: COLORS.ink,
    },
  },
};

function polygon(ctx: CanvasRenderingContext2D, points: Point[], fill: string, seed: number): void {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  strokeInk(ctx, points, {
    seed,
    width: 2.4,
    wobble: 0.45,
    doubleStroke: false,
  });
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  mood: RoyalMood,
  queen: boolean,
  blink: boolean,
): void {
  const eyeY = -89;
  ctx.fillStyle = COLORS.ink;
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  if (blink || mood === 'happy' || mood === 'cheer') {
    for (const dx of [-10, 10]) {
      ctx.beginPath();
      ctx.arc(dx, eyeY + 1, 4.6, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
  } else if (mood === 'worried' || mood === 'sad') {
    for (const dx of [-10, 10]) {
      ctx.beginPath();
      ctx.arc(dx, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dx - 1, eyeY - 1.5, 1, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.paper;
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
    }
  } else {
    for (const dx of [-10, 10]) {
      ctx.beginPath();
      ctx.ellipse(dx, eyeY, 3.2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dx - 1.1, eyeY - 1.6, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.paper;
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
    }
  }

  ctx.beginPath();
  if (mood === 'cheer') {
    ctx.arc(0, -74, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ink;
    ctx.fill();
  } else if (mood === 'sad') {
    ctx.arc(0, -68, 5.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (mood === 'worried') {
    ctx.moveTo(-4.5, -70);
    ctx.lineTo(4.5, -70);
    ctx.stroke();
  } else {
    ctx.arc(0, -71, 5.5, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS.blush;
  for (const dx of [-18, 18]) {
    ctx.beginPath();
    ctx.ellipse(dx, -77, 4.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (queen) {
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(-27, -92, 1.6, 0, Math.PI * 2);
    ctx.arc(27, -92, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrown(ctx: CanvasRenderingContext2D, queen: boolean, color: string): void {
  const points: Point[] = queen
    ? [
        { x: -15, y: -116 },
        { x: -15, y: -108 },
        { x: 15, y: -108 },
        { x: 15, y: -116 },
        { x: 9, y: -128 },
        { x: 3, y: -117 },
        { x: 0, y: -133 },
        { x: -3, y: -117 },
        { x: -9, y: -128 },
      ]
    : [
        { x: -16, y: -116 },
        { x: -16, y: -107 },
        { x: 16, y: -107 },
        { x: 16, y: -116 },
        { x: 11, y: -128 },
        { x: 4, y: -117 },
        { x: 0, y: -132 },
        { x: -4, y: -117 },
        { x: -11, y: -128 },
      ];
  polygon(ctx, points, color, queen ? 121 : 127);
  drawStar(ctx, 0, -117, 3.4, 1.5, COLORS.paper);
}

function drawGardenHat(ctx: CanvasRenderingContext2D, palette: RoyalPalette): void {
  inkEllipse(ctx, 0, -112, 28, 6, palette.hat, {
    seed: 131,
    width: 2,
    wobble: 0.4,
    doubleStroke: false,
  });
  ctx.beginPath();
  ctx.ellipse(0, -117, 14, 8, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = palette.hat;
  ctx.fill();
  drawPetal(ctx, 18, -112, 6, COLORS.petal);
  ctx.strokeStyle = palette.trim;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, -114, 14, 4, 0, 0, Math.PI);
  ctx.stroke();
}

function drawWinterGear(ctx: CanvasRenderingContext2D, palette: RoyalPalette): void {
  fillRoundRect(ctx, { x: -18, y: -70, w: 36, h: 9 }, palette.trim, 4);
  for (const dx of [-24, 24]) {
    ctx.beginPath();
    ctx.arc(dx, -91, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = palette.trim;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.24)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dx, -91, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
  }
}

function drawCape(ctx: CanvasRenderingContext2D, palette: RoyalPalette, outfit: RoyalOutfitId): void {
  polygon(
    ctx,
    [
      { x: -25, y: -64 },
      { x: -34, y: -4 },
      { x: 34, y: -4 },
      { x: 25, y: -64 },
    ],
    palette.cape,
    137,
  );
  if (outfit === 'starlight') {
    drawStar(ctx, -16, -32, 5, 2.4, COLORS.gold);
    drawStar(ctx, 15, -20, 4, 1.9, COLORS.gold);
    drawStar(ctx, 0, -44, 3.5, 1.7, COLORS.paper);
  }
}

export function drawRoyal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  role: RoyalRole,
  outfit: RoyalOutfitId,
  mood: RoyalMood,
  time: number,
  reducedMotion = false,
): void {
  const queen = role === 'queen';
  const safeOutfit: RoyalOutfitId = outfit in PALETTES ? outfit : 'classic';
  const palette = PALETTES[safeOutfit][role];
  const bob = reducedMotion
    ? 0
    : mood === 'cheer'
      ? Math.abs(Math.sin(time * 6)) * 3.5
      : Math.sin(time * 2 + (queen ? 1.2 : 0)) * 1.1;
  const armLift = mood === 'cheer' ? -17 : mood === 'worried' ? -8 : 0;
  const blinkPhase = (time * 0.8 + (queen ? 0.45 : 0)) % 4.6;
  const blink = !reducedMotion && blinkPhase > 4.38;

  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale(scale, scale);

  softShadow(ctx, 0, 2, 31, 8, 0.18, 4);
  drawCape(ctx, palette, safeOutfit);

  if (queen) {
    polygon(
      ctx,
      [
        { x: -18, y: -66 },
        { x: -28, y: -2 },
        { x: 28, y: -2 },
        { x: 18, y: -66 },
      ],
      palette.outfit,
      149,
    );
    ctx.globalAlpha = 0.55;
    fillRoundRect(ctx, { x: -11, y: -52, w: 22, h: 44 }, COLORS.paper, 10);
    ctx.globalAlpha = 1;
    fillRoundRect(ctx, { x: -16, y: -56, w: 32, h: 7 }, palette.trim, 3);
  } else {
    inkRoundRect(ctx, -20, -66, 40, 62, 14, palette.outfit, {
      seed: 151,
      width: 2.4,
      wobble: 0.4,
      doubleStroke: false,
    });
    fillRoundRect(ctx, { x: -15, y: -60, w: 30, h: 8 }, palette.trim, 4);
    fillRoundRect(ctx, { x: -17, y: -30, w: 34, h: 6 }, palette.trim, 3);
    drawStar(ctx, 0, -42, 4.2, 1.9, palette.trim);
  }

  for (const dx of [-10, 10]) {
    inkRoundRect(ctx, dx - 5, -13, 10, 15, 5, queen ? COLORS.paper : palette.outfitDeep, {
      seed: 157 + dx,
      width: 1.8,
      wobble: 0.3,
      doubleStroke: false,
    });
  }

  inkLine(
    ctx,
    [
      { x: -19, y: -54 },
      { x: -29, y: -28 + armLift },
    ],
    { stroke: palette.outfitDeep, width: 7, seed: 163, wobble: 0.3 },
  );
  inkLine(
    ctx,
    [
      { x: 19, y: -54 },
      { x: 29, y: -28 + armLift },
    ],
    { stroke: palette.outfitDeep, width: 7, seed: 167, wobble: 0.3 },
  );
  for (const dx of [-29, 29]) {
    ctx.beginPath();
    ctx.arc(dx, -24 + armLift, 4.8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.skin;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.24)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  inkEllipse(ctx, 0, -88, 28, 28, COLORS.skin, {
    seed: 173,
    width: 2.4,
    wobble: 0.4,
    doubleStroke: false,
  });

  ctx.beginPath();
  ctx.ellipse(0, -96, 28, 21, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = palette.hair;
  ctx.fill();
  if (queen) {
    ctx.beginPath();
    ctx.ellipse(-26, -82, 7.5, 17, 0.18, 0, Math.PI * 2);
    ctx.ellipse(26, -82, 7.5, 17, -0.18, 0, Math.PI * 2);
    ctx.fillStyle = palette.hair;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-26, -98, 2, 0, Math.PI * 2);
    ctx.arc(26, -98, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
  }

  drawFace(ctx, mood, queen, blink);

  if (safeOutfit === 'garden') drawGardenHat(ctx, palette);
  else if (safeOutfit === 'winter') drawWinterGear(ctx, palette);
  else drawCrown(ctx, queen, palette.hat);

  if (safeOutfit === 'classic') {
    fillRoundRect(ctx, { x: queen ? -11 : -12, y: -63, w: 24, h: 6 }, palette.trim, 3);
  }
  if (safeOutfit === 'garden') {
    drawPetal(ctx, queen ? 17 : -17, -66, 5.5, COLORS.petal);
  }
  if (safeOutfit === 'winter') {
    fillRoundRect(ctx, { x: -10, y: -62, w: 20, h: 17 }, COLORS.paper, 6);
  }

  ctx.restore();
}

export function drawRoyalPair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  outfit: RoyalOutfitId,
  mood: RoyalMood,
  time: number,
  reducedMotion = false,
): void {
  const spread = 35 * scale;
  drawRoyal(ctx, x - spread, y, scale, 'king', outfit, mood, time, reducedMotion);
  drawRoyal(ctx, x + spread, y, scale, 'queen', outfit, mood, time + 0.4, reducedMotion);
}

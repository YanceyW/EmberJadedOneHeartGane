import { ProfileBuild } from '../../core/profile';
import { drawPetal, drawStar, drawText } from '../../shared/design-system/draw';
import {
  inkEllipse,
  inkLine,
  inkRoundRect,
  softShadow,
} from '../../shared/design-system/paint';
import { drawRoyalPair, RoyalMood, RoyalOutfitId } from '../../shared/design-system/royals';
import { COLORS } from '../../shared/design-system/tokens';
import { platform } from '../../shared/platform/wx';
import { TownArt } from './town-art';
import { ResidentPath, TownBuildingLayout, TownFacilityLayout, TownLayout } from './town-layout';
import { drawBuildingOverlay, drawFacilityOverlay } from './town-buildings';
import { TownCamera, worldToScreen } from './town-camera';
import { TownPalette, TownPhase } from './town-palette';

export interface TownViewState {
  palette: TownPalette;
  phase: TownPhase;
  style: string;
  camera: TownCamera;
  art: TownArt;
  time: number;
  reducedMotion: boolean;
  quality: 'high' | 'mid' | 'low';
  sceneMotion: boolean;
  textureDetail: boolean;
  iconStyle: string;
  outfit: RoyalOutfitId;
  mood: RoyalMood;
  build: ProfileBuild;
  residentCount: number;
}

interface ResidentPosition {
  x: number;
  y: number;
  scale: number;
  facing: number;
}

function pathPoint(path: ResidentPath, time: number): ResidentPosition {
  const total = path.points.length - 1;
  const raw = ((time * path.speed + path.phase) % 1) * total;
  const index = Math.min(total - 1, Math.floor(raw));
  const t = raw - index;
  const a = path.points[index];
  const b = path.points[index + 1];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    scale: path.scale,
    facing: b.x >= a.x ? 1 : -1,
  };
}

let vignetteCanvas: any = null;
function getVignette(): any {
  if (vignetteCanvas) return vignetteCanvas;
  const size = 64;
  const canvas = platform.createOffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.52);
  gradient.addColorStop(0, 'rgba(58,46,42,0)');
  gradient.addColorStop(0.7, 'rgba(58,46,42,0.03)');
  gradient.addColorStop(1, 'rgba(58,46,42,0.16)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  vignetteCanvas = canvas;
  return canvas;
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const canvas = getVignette();
  if (!canvas) return;
  ctx.drawImage(canvas, 0, 0, width, height);
}

function drawBuildingWithOverlay(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
  building: TownBuildingLayout,
): void {
  const screen = worldToScreen(
    state.camera,
    building.base.x,
    building.base.y,
    layout.width,
    layout.focusY,
  );
  if (screen.x < -260 || screen.x > layout.width + 260) return;
  state.art.drawBuilding(ctx, layout, state.camera, building, state.phase);
  const scale = building.scale * state.camera.zoom;
  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.scale(scale, scale);
  // 动态层：招牌摆动、窗光、烟雾、可游玩丝带。
  // 保持和烘焙 body 同一局部坐标系。
  drawBuildingOverlay(
    ctx,
    building,
    state.palette,
    state.time,
    state.iconStyle,
    !state.sceneMotion,
    state.build.garden,
  );
  ctx.restore();
}

function drawFountain(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  const { camera, palette } = state;
  const p = worldToScreen(camera, layout.fountain.x, layout.fountain.y, layout.width, layout.focusY);
  const level = Math.max(0, Math.min(3, state.build.fountain));
  const zoom = camera.zoom;
  const pulse = state.sceneMotion ? Math.sin(state.time * 2.2) * 1.6 : 0;
  const height = (30 + level * 12 + pulse) * zoom;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(zoom * 1.12, zoom * 1.12);
  softShadow(ctx, 0, 34, 112, 26, 0.18, 4);
  inkEllipse(ctx, 0, 18, 108, 32, palette.stone, {
    stroke: palette.stoneDeep,
    width: 2.4,
    seed: 501,
  });
  inkEllipse(ctx, 0, 10, 98, 26, palette.water, {
    stroke: palette.waterDeep,
    width: 2,
    seed: 503,
  });
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.ellipse(0, 8, 62, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i += 1) {
    const r = (34 + i * 18) * (1 + (state.sceneMotion ? Math.sin(state.time * 1.6 + i) * 0.03 : 0));
    ctx.beginPath();
    ctx.ellipse(0, 4, r, r * 0.22, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.5 - i * 0.13})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  inkRoundRect(ctx, -13, -60, 26, 72, 8, palette.stone, {
    stroke: palette.stoneDeep,
    width: 2,
    seed: 509,
  });
  inkEllipse(ctx, 0, -68, 54, 16, palette.stone, {
    stroke: palette.stoneDeep,
    width: 2.2,
    seed: 511,
  });
  inkEllipse(ctx, 0, -72, 46, 11, palette.water, {
    stroke: palette.waterDeep,
    width: 1.6,
    seed: 513,
  });
  inkRoundRect(ctx, -6, -114, 12, 48, 5, palette.stone, {
    stroke: palette.stoneDeep,
    width: 1.8,
    seed: 517,
  });
  drawStar(ctx, 0, -124, 13, 6, COLORS.gold);
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      points.push({
        x: side * (8 + 78 * t),
        y: -114 + 78 * t - 56 * Math.sin(t * Math.PI) - height * 0.18 * Math.sin(t * Math.PI),
      });
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = palette.water;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (level >= 2) {
    drawPetal(ctx, -44, -26, 8, COLORS.petal);
    drawPetal(ctx, 46, -18, 7, COLORS.honey);
  }
  if (level >= 3) {
    drawStar(ctx, 0, -148, 9, 4, COLORS.starlight);
    drawStar(ctx, -40, -128, 6, 2.6, COLORS.starlight);
    drawStar(ctx, 38, -122, 6, 2.6, COLORS.starlight);
  }
  inkRoundRect(ctx, -40, 28, 80, 16, 6, palette.wood, {
    stroke: palette.woodDeep,
    width: 1.5,
    seed: 521,
  });
  drawText(ctx, '王都广场', 0, 36, {
    size: 8.5,
    weight: '700',
    color: COLORS.paper,
    align: 'center',
  });
  ctx.restore();
}

function drawResident(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
  path: ResidentPath,
): void {
  const p = pathPoint(path, state.time);
  const screen = worldToScreen(state.camera, p.x, p.y, layout.width, layout.focusY);
  if (screen.x < -80 || screen.x > layout.width + 80) return;
  const colors = [COLORS.peach, COLORS.mint, COLORS.sky, COLORS.petal, COLORS.honey, COLORS.lilac];
  const fill = colors[path.palette % colors.length];
  const s = p.scale * state.camera.zoom;
  const walk = state.sceneMotion ? Math.sin(state.time * 5 + path.phase * 9) : 0;
  const bob = state.sceneMotion ? Math.abs(walk) * 1.6 : 0;
  ctx.save();
  ctx.translate(screen.x, screen.y - bob);
  ctx.scale(s * p.facing, s);
  softShadow(ctx, 0, 2, 14, 4, 0.14, 3);
  inkLine(ctx, [{ x: -5, y: -12 }, { x: -7 + walk * 4, y: 0 }], {
    stroke: COLORS.inkSoft,
    width: 3,
    seed: 531 + path.palette,
    wobble: 0.2,
  });
  inkLine(ctx, [{ x: 5, y: -12 }, { x: 7 - walk * 4, y: 0 }], {
    stroke: COLORS.inkSoft,
    width: 3,
    seed: 533 + path.palette,
    wobble: 0.2,
  });
  inkRoundRect(ctx, -9, -36, 18, 26, 8, fill, {
    stroke: 'rgba(58,46,42,0.28)',
    width: 1.8,
    seed: 537 + path.palette,
  });
  inkLine(ctx, [{ x: -9, y: -30 }, { x: -15, y: -20 - walk * 2 }], {
    stroke: fill,
    width: 3,
    seed: 541 + path.palette,
    wobble: 0.2,
  });
  inkLine(ctx, [{ x: 9, y: -30 }, { x: 15, y: -20 + walk * 2 }], {
    stroke: fill,
    width: 3,
    seed: 543 + path.palette,
    wobble: 0.2,
  });
  inkEllipse(ctx, 0, -44, 14, 14, COLORS.skin, {
    stroke: 'rgba(58,46,42,0.24)',
    width: 1.8,
    seed: 547,
  });
  ctx.beginPath();
  ctx.ellipse(0, -50, 14, 9, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(-4.5, -45, 1.6, 0, Math.PI * 2);
  ctx.arc(4.5, -45, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -41, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  if (path.palette % 3 === 0) {
    ctx.beginPath();
    ctx.ellipse(0, -62, 18, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.honey;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -66, 9, 6, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (path.palette % 3 === 1) {
    ctx.beginPath();
    ctx.arc(0, -61, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, -59, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.berry;
    ctx.fill();
    inkLine(ctx, [{ x: 15, y: -22 }, { x: 28, y: -60 }], {
      stroke: COLORS.inkSoft,
      width: 1.2,
      seed: 551,
      wobble: 0.1,
    });
    ctx.beginPath();
    ctx.ellipse(24, -68, 7, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.petal;
    ctx.fill();
  }
  ctx.restore();
}

function drawForeground(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  const { palette, camera } = state;
  const foregroundCamera: TownCamera = { x: camera.x * 1.04, zoom: camera.zoom };
  const ground = layout.groundTop;
  const u = Math.min(1.05, Math.max(0.74, (layout.townBottom - layout.townTop) / 1100));
  const flower = worldToScreen(foregroundCamera, -262, ground + 474 * u, layout.width, layout.focusY);
  const bench = worldToScreen(foregroundCamera, 282, ground + 600 * u, layout.width, layout.focusY);
  const lampL = worldToScreen(foregroundCamera, -290, ground + 430 * u, layout.width, layout.focusY);
  const lampR = worldToScreen(foregroundCamera, 308, ground + 398 * u, layout.width, layout.focusY);

  // 左下花车
  if (state.quality !== 'low') {
    ctx.save();
    ctx.translate(flower.x, flower.y);
    ctx.scale(camera.zoom, camera.zoom);
    softShadow(ctx, 0, 18, 48, 11, 0.16, 3);
    inkRoundRect(ctx, -42, -30, 84, 40, 10, palette.wood, {
      stroke: palette.woodDeep,
      width: 2.4,
      seed: 601,
    });
    ctx.beginPath();
    ctx.arc(-28, 16, 13, 0, Math.PI * 2);
    ctx.arc(28, 16, 13, 0, Math.PI * 2);
    ctx.fillStyle = palette.woodDeep;
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      inkRoundRect(ctx, -40 + i * 24, -50, 20, 22, 5, palette.pathDeep, {
        stroke: 'rgba(58,46,42,0.20)',
        width: 1.5,
        seed: 603 + i,
      });
      inkLine(ctx, [{ x: -30 + i * 24, y: -50 }, { x: -30 + i * 24, y: -32 }], {
        stroke: COLORS.leaf,
        width: 2,
        seed: 607 + i,
        wobble: 0.2,
      });
      drawPetal(ctx, -30 + i * 24, -56, 7, [COLORS.petal, COLORS.honey, COLORS.berry][i]);
    }
    ctx.restore();
  }

  // 右下长椅 + 猫
  ctx.save();
  ctx.translate(bench.x, bench.y);
  ctx.scale(camera.zoom, camera.zoom);
  softShadow(ctx, 0, 16, 70, 14, 0.16, 3);
  // 椅背
  inkRoundRect(ctx, -64, -58, 128, 34, 12, palette.wood, {
    stroke: palette.woodDeep,
    width: 2.2,
    seed: 611,
  });
  for (const x of [-40, 0, 40]) {
    inkRoundRect(ctx, x - 7, -52, 14, 24, 6, palette.woodDeep, { width: 0 });
    ctx.globalAlpha = 0.35;
    inkRoundRect(ctx, x - 4, -49, 8, 18, 4, palette.pathDeep, { width: 0 });
    ctx.globalAlpha = 1;
  }
  // 坐垫与椅腿
  inkRoundRect(ctx, -64, -26, 128, 18, 8, palette.wood, {
    stroke: palette.woodDeep,
    width: 2.2,
    seed: 613,
  });
  inkRoundRect(ctx, -58, -24, 116, 10, 5, COLORS.cream, { width: 0 });
  for (const x of [-56, 44]) {
    inkRoundRect(ctx, x, -10, 13, 34, 5, palette.woodDeep, { width: 0 });
    ctx.globalAlpha = 0.25;
    inkRoundRect(ctx, x + 2, -8, 5, 28, 3, COLORS.inkSoft, { width: 0 });
    ctx.globalAlpha = 1;
  }
  // 猫：坐姿、闭眼、铃铛项圈
  ctx.beginPath();
  ctx.ellipse(-8, -32, 25, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.honey;
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,46,42,0.28)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-9, -24, 13, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.cream;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(16, -49, 13, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.honey;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, -59);
  ctx.lineTo(3, -71);
  ctx.lineTo(15, -61);
  ctx.moveTo(25, -60);
  ctx.lineTo(31, -70);
  ctx.lineTo(31, -57);
  ctx.fillStyle = COLORS.honey;
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, -51);
  ctx.quadraticCurveTo(14, -48, 17, -51);
  ctx.moveTo(22, -51);
  ctx.quadraticCurveTo(24, -48, 27, -51);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(19, -45, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.petalDeep;
  ctx.fill();
  ctx.strokeStyle = palette.woodDeep;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-34, -34, 13, Math.PI * 0.86, Math.PI * 1.42);
  ctx.stroke();
  const tail = state.sceneMotion ? Math.sin(state.time * 2.2) * 2.5 : 0;
  ctx.beginPath();
  ctx.arc(-33, -58 + tail, 15, Math.PI * 0.35, Math.PI * 1.15);
  ctx.strokeStyle = COLORS.honey;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(10, -36, 4, 0, Math.PI * 2);
  ctx.fillStyle = palette.lamp;
  ctx.fill();
  ctx.restore();

  // 路灯
  for (const lamp of [lampL, lampR]) {
    ctx.save();
    ctx.translate(lamp.x, lamp.y);
    ctx.scale(camera.zoom, camera.zoom);
    inkRoundRect(ctx, -16, -4, 32, 9, 4, palette.woodDeep, { width: 0 });
    inkLine(ctx, [{ x: 0, y: 0 }, { x: 0, y: -96 }], {
      stroke: COLORS.inkSoft,
      width: 4,
      seed: 621,
      wobble: 0.2,
    });
    inkLine(ctx, [{ x: -10, y: -78 }, { x: 10, y: -78 }], {
      stroke: COLORS.inkSoft,
      width: 2,
      seed: 623,
      wobble: 0.2,
    });
    if (state.palette.night || state.phase === 'dusk') {
      for (let i = 4; i > 0; i -= 1) {
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = palette.lamp;
        ctx.beginPath();
        ctx.arc(0, -104, i * 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    inkEllipse(ctx, 0, -104, 12, 12, palette.lamp, {
      stroke: COLORS.inkSoft,
      width: 1.6,
      seed: 627,
    });
    inkRoundRect(ctx, -16, -122, 32, 8, 4, palette.woodDeep, { width: 0 });
    ctx.restore();
  }

  // 街灯等级：解锁后在两盏路灯之间挂一串暖灯。
  const lightLevel = Math.max(0, Math.min(3, state.build.lights));
  if (lightLevel > 0) {
    const y = lampL.y - (112 + lightLevel * 8) * camera.zoom;
    const x1 = lampL.x;
    const x2 = lampR.x;
    ctx.save();
    ctx.strokeStyle = palette.woodDeep;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.quadraticCurveTo((x1 + x2) / 2, y + 20, x2, y);
    ctx.stroke();
    const bulbs = 4 + lightLevel * 2;
    for (let i = 0; i < bulbs; i += 1) {
      const t = (i + 0.5) / bulbs;
      const bx = x1 + (x2 - x1) * t;
      const by = y + Math.sin(t * Math.PI) * 20;
      if (palette.night || state.phase === 'dusk') {
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = palette.lamp;
        ctx.beginPath();
        ctx.arc(bx, by + 8, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = palette.lamp;
      ctx.beginPath();
      ctx.arc(bx, by + 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.woodDeep;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 左下花圃
  if (state.quality !== 'low') {
    const base = worldToScreen(foregroundCamera, -300, ground + 650 * u, layout.width, layout.focusY);
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.scale(camera.zoom, camera.zoom);
    for (let i = 0; i < 6; i += 1) {
      const x = i * 44;
      const y = (i % 2) * 18;
      inkLine(ctx, [{ x, y: y + 46 }, { x, y: y + 10 }], {
        stroke: COLORS.leaf,
        width: 4,
        seed: 631 + i,
        wobble: 0.3,
      });
      drawPetal(ctx, x, y, 14 + (i % 3) * 4, [COLORS.petal, COLORS.honey, COLORS.berry][i % 3]);
    }
    ctx.restore();
  }

  // 底部草叶，框住 Dock
  ctx.save();
  ctx.strokeStyle = palette.grassDeep;
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 16; i += 1) {
    const x = 20 + i * 46;
    ctx.beginPath();
    ctx.moveTo(x, layout.height);
    ctx.lineTo(x + Math.sin(i * 1.7) * 6, layout.height - 18 - (i % 3) * 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStyleDecor(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  if (state.style === 'classic') return;
  const ground = layout.groundTop;
  const u = Math.min(1.05, Math.max(0.74, (layout.townBottom - layout.townTop) / 1100));

  if (state.style === 'lantern') {
    const left = worldToScreen(state.camera, -260, ground - 300 * u, layout.width, layout.focusY);
    const right = worldToScreen(state.camera, 260, ground - 300 * u, layout.width, layout.focusY);
    ctx.save();
    ctx.strokeStyle = state.palette.wood;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.quadraticCurveTo((left.x + right.x) / 2, left.y + 28, right.x, right.y);
    ctx.stroke();
    for (let i = 0; i < 7; i += 1) {
      const t = i / 6;
      const x = left.x + (right.x - left.x) * t;
      const y = left.y + Math.sin(t * Math.PI) * 28;
      if (state.palette.night) {
        for (let ring = 2; ring > 0; ring -= 1) {
          ctx.globalAlpha = ring === 2 ? 0.1 : 0.18;
          ctx.fillStyle = state.palette.lamp;
          ctx.beginPath();
          ctx.arc(x, y + 14, 10 + ring * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      inkLine(ctx, [{ x, y }, { x, y: y + 8 }], {
        stroke: state.palette.woodDeep,
        width: 1.5,
        seed: 701 + i,
        wobble: 0.1,
      });
      inkRoundRect(ctx, x - 9, y + 8, 18, 20, 8, COLORS.berry, {
        stroke: state.palette.woodDeep,
        width: 1.8,
        seed: 711 + i,
      });
      inkRoundRect(ctx, x - 7, y + 8, 14, 4, 2, COLORS.gold, { width: 0 });
      inkRoundRect(ctx, x - 7, y + 24, 14, 4, 2, COLORS.gold, { width: 0 });
      ctx.globalAlpha = 0.7;
      drawPetal(ctx, x, y + 16, 3, COLORS.honey);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  if (state.style === 'spring') {
    for (const [wx, scale] of [
      [-290, 1],
      [300, 0.9],
    ] as const) {
      const p = worldToScreen(state.camera, wx, ground + 540 * u, layout.width, layout.focusY);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale * state.camera.zoom, scale * state.camera.zoom);
      inkLine(ctx, [{ x: 0, y: 0 }, { x: 0, y: -62 }], {
        stroke: state.palette.woodDeep,
        width: 7,
        seed: 721 + wx,
        wobble: 0.4,
      });
      for (let i = 0; i < 5; i += 1) {
        drawPetal(ctx, -30 + i * 15, -64 - (i % 2) * 12, 13 + (i % 3) * 3, COLORS.petal);
      }
      ctx.restore();
    }
  }

  if (state.style === 'harvest') {
    for (const [wx, scale] of [
      [-245, 1],
      [255, 0.9],
    ] as const) {
      const p = worldToScreen(state.camera, wx, ground + 575 * u, layout.width, layout.focusY);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale * state.camera.zoom, scale * state.camera.zoom);
      inkEllipse(ctx, 0, 0, 24, 16, COLORS.honeyDeep, {
        stroke: state.palette.woodDeep,
        width: 2,
        seed: 731 + wx,
      });
      inkEllipse(ctx, 0, -8, 20, 13, COLORS.honey, { width: 0 });
      inkLine(ctx, [{ x: 0, y: -18 }, { x: 0, y: -30 }], {
        stroke: state.palette.grassDeep,
        width: 3,
        seed: 741 + wx,
        wobble: 0.2,
      });
      ctx.restore();
    }
  }

  if (state.style === 'frost') {
    for (const [wx, color] of [
      [-230, COLORS.berry],
      [240, COLORS.mint],
    ] as const) {
      const p = worldToScreen(state.camera, wx, ground + 590 * u, layout.width, layout.focusY);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(state.camera.zoom, state.camera.zoom);
      inkRoundRect(ctx, -18, -22, 36, 30, 6, color, {
        stroke: state.palette.woodDeep,
        width: 2,
        seed: 751 + wx,
      });
      inkLine(ctx, [{ x: -12, y: -22 }, { x: 0, y: -8 }, { x: 12, y: -22 }], {
        stroke: COLORS.gold,
        width: 2.4,
        seed: 761 + wx,
        wobble: 0.1,
      });
      ctx.restore();
    }
  }
}

function drawFacilityWithOverlay(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
  facility: TownFacilityLayout,
): void {
  const screen = worldToScreen(
    state.camera,
    facility.base.x,
    facility.base.y,
    layout.width,
    layout.focusY,
  );
  if (screen.x < -260 || screen.x > layout.width + 260) return;
  state.art.drawFacility(ctx, layout, state.camera, facility, state.phase);
  const scale = facility.scale * state.camera.zoom;
  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.scale(scale, scale);
  // 库房没有「可游玩」徽章，只有招牌、夜灯与纸纹。
  drawFacilityOverlay(ctx, facility, state.palette, state.time, !state.sceneMotion);
  ctx.restore();
}

export function drawTown(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  state.art.drawSky(ctx, layout, state.phase);
  state.art.drawGround(ctx, layout, state.camera, state.phase);

  const structures = [...layout.structures].sort((a, b) => a.depth - b.depth);
  for (const structure of structures) {
    if (structure.kind === 'venue') drawBuildingWithOverlay(ctx, layout, state, structure);
    else drawFacilityWithOverlay(ctx, layout, state, structure);
  }

  drawFountain(ctx, layout, state);

  const royal = worldToScreen(
    state.camera,
    layout.royal.x,
    layout.royal.y,
    layout.width,
    layout.focusY,
  );
  drawRoyalPair(
    ctx,
    royal.x,
    royal.y,
    layout.royal.scale * state.camera.zoom,
    state.outfit,
    state.mood,
    state.time,
    !state.sceneMotion,
  );

  const residents =
    state.quality === 'low' ? layout.residents.slice(0, 1) : layout.residents;
  for (const resident of residents.slice(0, Math.max(1, state.residentCount))) {
    drawResident(ctx, layout, state, resident);
  }

  drawStyleDecor(ctx, layout, state);
  drawForeground(ctx, layout, state);

  if (state.palette.night) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = COLORS.nightDeep;
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.restore();
  }
  drawVignette(ctx, layout.width, layout.height);
}

import { ProfileBuild } from '../../core/profile';
import { drawPetal, drawStar, drawText } from '../../shared/design-system/draw';
import {
  inkEllipse,
  inkLine,
  inkRoundRect,
  softShadow,
} from '../../shared/design-system/paint';
import { drawRoyalPair, RoyalMood, RoyalOutfitId } from '../../shared/design-system/royals';
import { COLORS, TOWN_COLORS } from '../../shared/design-system/tokens';
import { platform } from '../../shared/platform/wx';
import { TownArt } from './town-art';
import { TownBuildingLayout, TownFacilityLayout, TownLayout } from './town-layout';
import { BUILDING_ANCHORS, drawBuildingOverlay, drawFacilityOverlay } from './town-buildings';
import { ResidentActor } from './town-residents';
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
  residents: readonly ResidentActor[];
  /** 按下中的建筑/设施 id：整体下沉几像素，给出点击反馈。 */
  pressedId: string | null;
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
  const pressed = state.pressedId === building.id;
  const sink = pressed ? 3 * state.camera.zoom : 0;
  state.art.drawBuilding(ctx, layout, state.camera, building, state.phase);
  const scale = building.scale * state.camera.zoom;
  ctx.save();
  ctx.translate(screen.x, screen.y + sink);
  ctx.scale(scale, scale);
  // 动态层：招牌摆动、窗光、烟雾、门口吊牌。
  // 保持和烘焙 body 同一局部坐标系。
  drawBuildingOverlay(
    ctx,
    building,
    state.palette,
    state.time,
    state.iconStyle,
    !state.sceneMotion,
  );
  if (pressed) {
    ctx.globalAlpha = 0.16;
    inkRoundRect(ctx, -104, -236, 208, 240, 24, COLORS.paper, { width: 0 });
    ctx.globalAlpha = 1;
  }
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
  const height = (30 + level * 14 + pulse) * zoom;
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
  const spoutTop = level >= 2 ? -134 : -114;
  inkRoundRect(ctx, -6, spoutTop, 12, -66 - spoutTop, 5, palette.stone, {
    stroke: palette.stoneDeep,
    width: 1.8,
    seed: 517,
  });
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
  // Lv1 花瓣泉：池沿花环 + 两层水面浮花瓣。
  if (level >= 1) {
    for (const x of [-94, 94]) {
      inkLine(ctx, [{ x, y: 6 }, { x, y: 13 }], {
        stroke: palette.grassDeep,
        width: 2,
        seed: 523,
        wobble: 0.2,
      });
      drawPetal(ctx, x, 4, 6.2, COLORS.honey);
      drawPetal(ctx, x - 5, 10, 3.4, COLORS.petal);
    }
    for (let i = 0; i < 4; i += 1) {
      const a = Math.PI * (0.16 + i * 0.23);
      drawPetal(
        ctx,
        Math.cos(a) * 84,
        15 + Math.sin(a) * 22,
        5.4,
        i % 2 === 0 ? COLORS.petal : COLORS.honey,
      );
    }
    for (let i = 0; i < 3; i += 1) {
      const a = Math.PI * (0.3 + i * 0.3);
      drawPetal(ctx, Math.cos(a) * 26, -72 + Math.sin(a) * 5, 4.2, i % 2 === 0 ? COLORS.petal : COLORS.cream);
    }
  }
  // Lv2 星光泉：金边水钵 + 环绕光点。
  if (level >= 2) {
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, -68, 54, 16, 0, Math.PI * 1.04, Math.PI * 1.96);
    ctx.stroke();
    for (let i = 0; i < 4; i += 1) {
      const a = state.time * 0.9 + (i * Math.PI) / 2;
      const ox = Math.cos(a) * 34;
      const oy = -94 + Math.sin(a) * 10;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = COLORS.starlight;
      ctx.beginPath();
      ctx.arc(ox, oy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawStar(ctx, ox, oy, 4.6, 2, COLORS.starlight);
    }
  }
  drawStar(ctx, 0, spoutTop - 10, 13, 6, COLORS.gold);
  // Lv3 王都之泉：金冠 + 光晕 + 环绕星芒。
  if (level >= 3) {
    for (let i = 4; i > 0; i -= 1) {
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(0, spoutTop - 12, 18 + i * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(-15, spoutTop - 18);
    ctx.lineTo(-15, spoutTop - 27);
    ctx.lineTo(-7, spoutTop - 20);
    ctx.lineTo(0, spoutTop - 30);
    ctx.lineTo(7, spoutTop - 20);
    ctx.lineTo(15, spoutTop - 27);
    ctx.lineTo(15, spoutTop - 18);
    ctx.closePath();
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.strokeStyle = COLORS.honeyDeep;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      const a = state.time * 1.1 + (i * Math.PI * 2) / 3;
      drawStar(ctx, Math.cos(a) * 58, -94 + Math.sin(a) * 16, 5, 2, COLORS.starlight);
    }
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

const VILLAGER_OUTFITS = [
  { fill: COLORS.peach, deep: COLORS.coral },
  { fill: COLORS.mint, deep: COLORS.mintDeep },
  { fill: COLORS.sky, deep: COLORS.waterDeep },
  { fill: COLORS.petal, deep: COLORS.petalDeep },
  { fill: COLORS.honey, deep: COLORS.honeyDeep },
  { fill: COLORS.lilac, deep: COLORS.lilacDeep },
] as const;

function drawVillagerHat(
  ctx: CanvasRenderingContext2D,
  role: ResidentActor['role'],
  headY: number,
  headR: number,
  deep: string,
): void {
  const topY = headY - headR;
  if (role === 'farmer' || role === 'gardener') {
    // 斗笠：锥形帽顶 + 收窄的帽檐，贴在头顶而不是悬空。
    const half = headR * 1.16;
    ctx.beginPath();
    ctx.moveTo(-half, topY + 2);
    ctx.lineTo(half, topY + 2);
    ctx.lineTo(half, topY + 5);
    ctx.quadraticCurveTo(0, topY + 8.5, -half, topY + 5);
    ctx.closePath();
    ctx.fillStyle = COLORS.honeyDeep;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.26)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-half * 0.8, topY + 2.5);
    ctx.quadraticCurveTo(-half * 0.22, topY - 6, 0, topY - 12);
    ctx.quadraticCurveTo(half * 0.22, topY - 6, half * 0.8, topY + 2.5);
    ctx.closePath();
    ctx.fillStyle = COLORS.honey;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.26)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = COLORS.honeyDeep;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-half * 0.7, topY + 1.5);
    ctx.quadraticCurveTo(0, topY - 1, half * 0.7, topY + 1.5);
    ctx.stroke();
    return;
  }
  if (role === 'keeper' || role === 'clerk') {
    // 圆顶布帽：帽身贴着头发，前面加一小片帽檐。
    ctx.beginPath();
    ctx.ellipse(0, headY - headR * 0.5, headR * 0.95, headR * 0.64, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = deep;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.24)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, headY - headR * 0.5, headR * 1.04, 2.8, 0, 0, Math.PI);
    ctx.fillStyle = deep;
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (role === 'granny') {
    // 布巾包头：浅色软布 + 后脑的结，和衣服颜色区分开。
    ctx.beginPath();
    ctx.ellipse(0, headY - 1, headR + 0.6, headR * 1.02, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.2)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(58,46,42,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-headR * 0.5, headY - headR * 0.7);
    ctx.lineTo(-headR * 0.15, headY - headR * 0.95);
    ctx.moveTo(headR * 0.2, headY - headR * 0.95);
    ctx.lineTo(headR * 0.55, headY - headR * 0.66);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-headR * 0.92, headY + 1, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.2)';
    ctx.stroke();
    // 两鬓灰发
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * (headR - 0.4), headY + 2.5, 2.2, 4.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = TOWN_COLORS.stoneDeep;
      ctx.fill();
    }
    return;
  }
  if (role === 'child') {
    ctx.beginPath();
    ctx.arc(0, headY - headR - 1.2, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fill();
    ctx.strokeStyle = COLORS.berry;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3.4, headY - headR + 0.6);
    ctx.lineTo(3.4, headY - headR + 0.6);
    ctx.stroke();
    return;
  }
  if (role === 'youth') {
    ctx.strokeStyle = COLORS.berry;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-headR, headY - headR * 0.42);
    ctx.quadraticCurveTo(0, headY - headR * 0.66, headR, headY - headR * 0.42);
    ctx.stroke();
    return;
  }
  // girl：双丸子 + 发簪
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * headR * 0.82, headY - headR * 0.72, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fill();
  }
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(headR * 0.32, headY - headR * 0.92);
  ctx.lineTo(headR * 0.72, headY - headR * 1.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(headR * 0.76, headY - headR * 1.12, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
}

function drawVillager(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
  actor: ResidentActor,
): void {
  const screen = worldToScreen(state.camera, actor.x, actor.y, layout.width, layout.focusY);
  if (screen.x < -80 || screen.x > layout.width + 80) return;
  if (actor.alpha <= 0.02) return;

  const outfit = VILLAGER_OUTFITS[actor.palette % VILLAGER_OUTFITS.length];
  const s = actor.scale * state.camera.zoom;
  const motion = state.sceneMotion;
  const walking = actor.activity === 'walk';
  const swing = walking && motion ? Math.sin(actor.stride * 0.24) : 0;
  const bob = walking && motion ? Math.abs(swing) * 1.4 : motion ? Math.sin(state.time * 1.6 + actor.phase) * 0.5 : 0;
  const blink = ((state.time * 1.6 + actor.phase) % 3.4) > 3.26;
  const child = actor.role === 'child';
  const bodyTop = child ? -28 : -34;
  const bodyBottom = child ? -9 : -12;
  const headY = child ? -40 : -47;
  const headR = child ? 12.5 : 12;
  const apron =
    actor.role === 'keeper' || actor.role === 'gardener' || actor.role === 'clerk' || actor.role === 'granny';
  const skirt = actor.role === 'girl' || actor.role === 'granny';
  const basket = actor.role === 'farmer' || actor.role === 'granny';

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, actor.alpha));
  ctx.translate(screen.x, screen.y - bob);
  ctx.scale(s * (actor.facing < 0 ? -1 : 1), s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.ellipse(0, 1, 13, 4.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74,58,48,0.16)';
  ctx.fill();

  // 腿
  ctx.strokeStyle = COLORS.inkSoft;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-4.4, bodyBottom);
  ctx.lineTo(-5.4 + swing * 4, -1);
  ctx.moveTo(4.4, bodyBottom);
  ctx.lineTo(5.4 - swing * 4, -1);
  ctx.stroke();

  // 身体
  inkRoundRect(ctx, -9, bodyTop, 18, bodyBottom - bodyTop, 7, outfit.fill, {
    stroke: 'rgba(58,46,42,0.26)',
    width: 1.6,
    seed: 537 + actor.palette,
  });
  if (skirt) {
    ctx.beginPath();
    ctx.moveTo(-9, bodyBottom - 6);
    ctx.lineTo(9, bodyBottom - 6);
    ctx.lineTo(11, bodyBottom + 2);
    ctx.lineTo(-11, bodyBottom + 2);
    ctx.closePath();
    ctx.fillStyle = outfit.fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.24)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  if (apron) {
    inkRoundRect(ctx, -5.5, bodyTop + 8, 11, bodyBottom - bodyTop - 8, 4, COLORS.cream, {
      stroke: 'rgba(58,46,42,0.16)',
      width: 1.1,
      seed: 539 + actor.palette,
    });
    ctx.strokeStyle = 'rgba(58,46,42,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, bodyTop + 12);
    ctx.lineTo(5, bodyTop + 12);
    ctx.stroke();
  }
  // 领口滚边：唯一的一处纹样，够小但能看出中式对襟。
  ctx.strokeStyle = outfit.deep;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-5.5, bodyTop + 2.4);
  ctx.lineTo(0, bodyTop + 5.6);
  ctx.lineTo(5.5, bodyTop + 2.4);
  ctx.stroke();

  // 手臂
  ctx.strokeStyle = outfit.fill;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-8, bodyTop + 5);
  ctx.lineTo(-11.5, bodyTop + 14 - swing * 2.4);
  ctx.moveTo(8, bodyTop + 5);
  ctx.lineTo(11.5, bodyTop + 14 + swing * 2.4);
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 11.5, bodyTop + 14 + side * swing * 2.4, 2.1, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.skin;
    ctx.fill();
  }

  if (basket) {
    inkRoundRect(ctx, 11, bodyTop + 11, 10, 8, 3, COLORS.honey, {
      stroke: COLORS.honeyDeep,
      width: 1.2,
      seed: 541 + actor.palette,
    });
    ctx.strokeStyle = TOWN_COLORS.woodDeep;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(16, bodyTop + 11, 4, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  if (actor.role === 'granny') {
    // 拐杖：阿婆的剪影一眼能认出来。
    ctx.strokeStyle = TOWN_COLORS.woodDeep;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-12, bodyTop + 16);
    ctx.lineTo(-15, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-13.4, bodyTop + 15, 2.6, Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();
  }

  // 头
  inkEllipse(ctx, 0, headY, headR, headR, COLORS.skin, {
    stroke: 'rgba(58,46,42,0.22)',
    width: 1.6,
    seed: 543 + actor.palette,
  });
  // 头发：贴着头的半圆，不再是悬空帽檐。阿婆用灰白头发。
  ctx.beginPath();
  ctx.ellipse(0, headY - 1.5, headR + 0.4, headR * 0.92, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = actor.role === 'granny' ? TOWN_COLORS.stoneDeep : COLORS.inkSoft;
  ctx.fill();

  // 腮红
  ctx.fillStyle = 'rgba(240,140,126,0.42)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 6.2, headY + 5, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 眼睛 + 微笑
  ctx.fillStyle = COLORS.ink;
  if (blink) {
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6.2, headY + 0.4);
    ctx.lineTo(-3.2, headY + 0.4);
    ctx.moveTo(3.2, headY + 0.4);
    ctx.lineTo(6.2, headY + 0.4);
    ctx.stroke();
  } else {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 4.6, headY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, headY + 3.4, 3.2, 0.25, Math.PI - 0.25);
  ctx.stroke();

  drawVillagerHat(ctx, actor.role, headY, headR, outfit.deep);

  ctx.restore();
}

/** 街灯等级：木灯 → 暖灯串 → 萤火灯 → 星光街。画在建筑之后、国王王后之前。 */
function drawStreetLights(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  const lightLevel = Math.max(0, Math.min(3, state.build.lights));
  if (lightLevel <= 0) return;
  const { palette, camera } = state;
  const foregroundCamera: TownCamera = { x: camera.x * 1.04, zoom: camera.zoom };
  const ground = layout.groundTop;
  const u = layout.unit;
  const lampL = worldToScreen(foregroundCamera, -290, ground + 430 * u, layout.width, layout.focusY);
  const lampR = worldToScreen(foregroundCamera, 308, ground + 398 * u, layout.width, layout.focusY);
  const lit = palette.night || state.phase === 'dusk';
  const zoom = camera.zoom;
  const x1 = lampL.x;
  const x2 = lampR.x;

  if (lit) {
    for (const lamp of [lampL, lampR]) {
      for (let i = 3; i > 0; i -= 1) {
        ctx.globalAlpha = 0.03 + (3 - i) * 0.025;
        ctx.fillStyle = palette.lamp;
        ctx.beginPath();
        ctx.ellipse(lamp.x, lamp.y + 6 * zoom, (40 + i * 26) * zoom, (12 + i * 8) * zoom, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  const y = lampL.y - (96 + lightLevel * 6) * zoom;
  ctx.save();
  ctx.strokeStyle = palette.woodDeep;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.quadraticCurveTo((x1 + x2) / 2, y + 20 * zoom, x2, y);
  ctx.stroke();
  const bulbs = 4 + lightLevel * 2;
  for (let i = 0; i < bulbs; i += 1) {
    const t = (i + 0.5) / bulbs;
    const bx = x1 + (x2 - x1) * t;
    const by = y + Math.sin(t * Math.PI) * 20 * zoom;
    if (lit) {
      ctx.globalAlpha = 0.12 + (lightLevel >= 2 ? 0.06 : 0);
      ctx.fillStyle = palette.lamp;
      ctx.beginPath();
      ctx.arc(bx, by + 8 * zoom, (12 + lightLevel * 2) * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (lightLevel >= 2 && i % 3 === 1) {
      drawChineseLantern(ctx, bx, by + 16 * zoom, 0.52 * zoom, lit, 631 + i);
    } else {
      ctx.fillStyle = palette.lamp;
      ctx.beginPath();
      ctx.arc(bx, by + 8 * zoom, 3.6 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.woodDeep;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // 星光街：中央挂一颗大星。
  if (lightLevel >= 3) {
    const cx = (x1 + x2) / 2;
    const cy = y + 46 * zoom;
    if (lit) {
      for (let i = 3; i > 0; i -= 1) {
        ctx.globalAlpha = 0.06 + (3 - i) * 0.04;
        ctx.fillStyle = COLORS.starlight;
        ctx.beginPath();
        ctx.arc(cx, cy, (10 + i * 7) * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    drawStar(ctx, cx, cy, 11 * zoom, 5 * zoom, COLORS.gold);
    drawStar(ctx, cx, cy, 5 * zoom, 2.2 * zoom, COLORS.starlight);
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

const CLOUD_PUFFS: ReadonlyArray<readonly [number, number, number, number]> = [
  [-70, 16, 58, 34],
  [-18, 0, 72, 46],
  [46, 10, 62, 38],
  [92, 24, 40, 26],
  [10, 30, 70, 28],
];

const CLOUDS: ReadonlyArray<{ x: number; y: number; scale: number; speed: number }> = [
  { x: 90, y: 152, scale: 1, speed: 1 },
  { x: 520, y: 198, scale: 0.78, speed: 0.72 },
  { x: 300, y: 98, scale: 0.56, speed: 1.26 },
  { x: 660, y: 60, scale: 0.42, speed: 0.9 },
];

function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}

/** 云从天烘焙里拆出来：缓慢漂移 + 轻微视差，天空不再是一张静止图。 */
function drawClouds(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  const { palette, camera } = state;
  const alpha = palette.night ? 0.42 : 0.78;
  const drift = state.sceneMotion ? state.time * 2.4 : 0;
  const span = layout.width + 320;
  const total = state.quality === 'low' ? 2 : CLOUDS.length;
  ctx.save();
  for (let i = 0; i < total; i += 1) {
    const cloud = CLOUDS[i];
    const x = wrap(cloud.x - camera.x * 0.22 + drift * cloud.speed, span) - 160;
    const y = layout.groundTop - cloud.y;
    const s = cloud.scale;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette.cloud;
    for (const [dx, dy, rx, ry] of CLOUD_PUFFS) {
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = palette.cloudShade;
    ctx.beginPath();
    ctx.ellipse(x, y + 42 * s, 116 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 天空层的节日装饰：春天的纸鸢放在地面之前画，不会被建筑盖住。 */
function drawSkyStyleDecor(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  if (state.style !== 'spring') return;
  const t = state.sceneMotion ? state.time : 0;
  const kites = [
    { x: layout.width * 0.16, y: 128, scale: 1, fill: COLORS.petal },
    { x: layout.width * 0.76, y: 74, scale: 0.78, fill: COLORS.honey },
  ];
  ctx.save();
  for (let i = 0; i < kites.length; i += 1) {
    const kite = kites[i];
    const x = kite.x - state.camera.x * 0.12 + Math.sin(t * 0.6 + i) * 4;
    const y = kite.y + Math.sin(t * 0.9 + i * 2) * 3;
    const s = kite.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.7 + i) * 0.14);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 26);
    ctx.lineTo(-16, 0);
    ctx.closePath();
    ctx.fillStyle = kite.fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.28)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 26);
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(58,46,42,0.32)';
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.quadraticCurveTo(-10, 44, 4, 60);
    ctx.stroke();
    for (let k = 0; k < 3; k += 1) {
      ctx.beginPath();
      ctx.ellipse(-2 + k * 3, 38 + k * 9, 4, 2.2, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = k % 2 === 0 ? COLORS.berry : COLORS.mint;
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawChineseLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  lit: boolean,
  seed: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (lit) {
    for (let ring = 3; ring > 0; ring -= 1) {
      ctx.globalAlpha = 0.05 + (3 - ring) * 0.04;
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(0, 0, 12 + ring * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  inkEllipse(ctx, 0, 0, 9, 11, COLORS.berry, {
    stroke: TOWN_COLORS.woodDeep,
    width: 1.6,
    seed,
  });
  ctx.strokeStyle = 'rgba(255,246,233,0.55)';
  ctx.lineWidth = 1;
  for (const dx of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.ellipse(dx * 0.5, 0, Math.abs(9 - Math.abs(dx)) * 0.35 + 2.5, 10.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  inkRoundRect(ctx, -7, -14, 14, 4, 2, COLORS.gold, { width: 0 });
  inkRoundRect(ctx, -7, 10, 14, 4, 2, COLORS.gold, { width: 0 });
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(0, 22);
  ctx.moveTo(-3, 22);
  ctx.lineTo(3, 22);
  ctx.stroke();
  ctx.restore();
}

function drawBlossomTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: TownPalette,
  time: number,
  motion: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 2, 30, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74,58,48,0.12)';
  ctx.fill();
  inkLine(ctx, [{ x: 0, y: 0 }, { x: -3, y: -36 }, { x: 0, y: -60 }], {
    stroke: palette.woodDeep,
    width: 7,
    seed: 811,
    wobble: 0.35,
  });
  inkLine(ctx, [{ x: -2, y: -42 }, { x: -22, y: -58 }], {
    stroke: palette.woodDeep,
    width: 4,
    seed: 813,
    wobble: 0.3,
  });
  inkLine(ctx, [{ x: 0, y: -52 }, { x: 21, y: -68 }], {
    stroke: palette.woodDeep,
    width: 4,
    seed: 815,
    wobble: 0.3,
  });
  const sway = motion ? Math.sin(time * 1.2 + x * 0.01) * 1.6 : 0;
  for (const [dx, dy, rx, ry, color] of [
    [-24, -72, 25, 18, COLORS.petal],
    [6, -86, 29, 21, COLORS.petal],
    [30, -68, 22, 16, COLORS.peach],
    [-2, -60, 21, 15, COLORS.petalDeep],
  ] as Array<[number, number, number, number, string]>) {
    ctx.beginPath();
    ctx.ellipse(dx + sway, dy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  for (let i = 0; i < 7; i += 1) {
    drawPetal(ctx, -32 + i * 10 + sway, -78 + (i % 3) * 11, 4.2, COLORS.cream);
  }
  ctx.restore();
}

function drawOilUmbrella(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: TownPalette,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 2, 20, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74,58,48,0.12)';
  ctx.fill();
  inkLine(ctx, [{ x: 0, y: 0 }, { x: 2, y: -62 }], {
    stroke: palette.woodDeep,
    width: 3,
    seed: 821,
    wobble: 0.2,
  });
  ctx.beginPath();
  ctx.moveTo(-34, -52);
  ctx.quadraticCurveTo(2, -94, 38, -50);
  ctx.quadraticCurveTo(2, -40, -34, -52);
  ctx.closePath();
  ctx.fillStyle = COLORS.berry;
  ctx.fill();
  ctx.strokeStyle = palette.woodDeep;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,246,233,0.6)';
  ctx.lineWidth = 1.2;
  for (const dx of [-20, -8, 6, 20]) {
    ctx.beginPath();
    ctx.moveTo(2, -88);
    ctx.lineTo(dx, -48);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(2, -88, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.restore();
}

function drawRiceSheaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: TownPalette,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 2, 20, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74,58,48,0.12)';
  ctx.fill();
  ctx.strokeStyle = COLORS.honey;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 2, 0);
    ctx.quadraticCurveTo(i * 4, -28, i * 6, -48 - Math.abs(i) * 3);
    ctx.stroke();
  }
  for (let i = -3; i <= 3; i += 1) {
    drawPetal(ctx, i * 6, -52 - Math.abs(i) * 3, 3.2, COLORS.honeyDeep);
  }
  inkRoundRect(ctx, -10, -26, 20, 7, 3, COLORS.berry, {
    stroke: palette.woodDeep,
    width: 1.4,
    seed: 841,
  });
  ctx.restore();
}

function drawPumpkin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: TownPalette,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  inkEllipse(ctx, 0, -13, 20, 15, COLORS.honeyDeep, {
    stroke: palette.woodDeep,
    width: 2,
    seed: 851,
  });
  ctx.strokeStyle = 'rgba(185,134,47,0.55)';
  ctx.lineWidth = 1.6;
  for (const dx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.ellipse(dx, -13, 5, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  inkLine(ctx, [{ x: 0, y: -28 }, { x: 2, y: -36 }], {
    stroke: COLORS.leaf,
    width: 3,
    seed: 853,
    wobble: 0.2,
  });
  ctx.restore();
}

function drawWineJar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: TownPalette,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  inkEllipse(ctx, 0, -20, 17, 21, palette.stone, {
    stroke: palette.stoneDeep,
    width: 2,
    seed: 861,
  });
  inkEllipse(ctx, 0, -40, 11, 6, COLORS.berry, {
    stroke: palette.woodDeep,
    width: 1.4,
    seed: 863,
  });
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-11, -37);
  ctx.quadraticCurveTo(0, -31, 11, -37);
  ctx.stroke();
  drawText(ctx, '酒', 0, -17, {
    size: 12,
    weight: '700',
    color: palette.inkSoft,
    align: 'center',
  });
  ctx.restore();
}

function drawHangingProduce(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: TownPalette,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = palette.woodDeep;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -26);
  ctx.stroke();
  for (let i = 0; i < 2; i += 1) {
    inkEllipse(ctx, -7 + i * 13, 8 + i * 14, 5, 12, COLORS.honey, {
      stroke: COLORS.honeyDeep,
      width: 1.2,
      seed: 871 + i,
    });
  }
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(10 - i * 9, 26 + i * 12, 3.2, 7.5, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.coral;
    ctx.fill();
  }
  ctx.restore();
}

function drawPlumBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  palette: TownPalette,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  inkLine(ctx, [{ x: 0, y: 0 }, { x: -6, y: -30 }, { x: -2, y: -58 }], {
    stroke: palette.woodDeep,
    width: 5,
    seed: 881,
    wobble: 0.4,
  });
  inkLine(ctx, [{ x: -4, y: -34 }, { x: -28, y: -50 }], {
    stroke: palette.woodDeep,
    width: 3,
    seed: 883,
    wobble: 0.3,
  });
  inkLine(ctx, [{ x: -2, y: -48 }, { x: 20, y: -62 }], {
    stroke: palette.woodDeep,
    width: 3,
    seed: 885,
    wobble: 0.3,
  });
  for (const [dx, dy] of [
    [-30, -52],
    [-12, -62],
    [4, -66],
    [22, -66],
    [-2, -46],
  ] as Array<[number, number]>) {
    drawPetal(ctx, dx, dy, 4.6, COLORS.petal);
  }
  ctx.restore();
}

function drawTanghulu(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = TOWN_COLORS.woodDeep;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(3, -44);
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(1 + i * 1, -14 - i * 12, 5.4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.coral;
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,46,42,0.24)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-0.6 + i, -15.6 - i * 12, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,253,248,0.8)';
    ctx.fill();
  }
  ctx.restore();
}

function drawButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  phase: number,
  fill: string,
): void {
  const flap = Math.abs(Math.sin(time * 7 + phase));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * (3 + flap * 3), -2, 4.5 * (0.5 + flap * 0.5), 5.5, side * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(58,46,42,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 4);
  ctx.stroke();
  ctx.restore();
}

function drawStyleDecor(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  if (state.style === 'classic') return;
  const ground = layout.groundTop;
  const u = layout.unit;
  const camera = state.camera;
  const at = (wx: number, wy: number) => worldToScreen(camera, wx, wy, layout.width, layout.focusY);
  const lit = state.palette.night || state.phase === 'dusk';

  if (state.style === 'spring') {
    const left = at(-352, ground + 512 * u);
    const right = at(366, ground + 556 * u);
    drawBlossomTree(ctx, left.x, left.y, 1.05 * camera.zoom, state.palette, state.time, state.sceneMotion);
    drawBlossomTree(ctx, right.x, right.y, 0.88 * camera.zoom, state.palette, state.time, state.sceneMotion);
    const umbrella = at(214, ground + 470 * u);
    drawOilUmbrella(ctx, umbrella.x, umbrella.y, 0.9 * camera.zoom, state.palette);
    for (let i = 0; i < 7; i += 1) {
      const p = at(-140 + i * 46, ground + 470 * u + (i % 3) * 26 * u);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 5.5 * camera.zoom, 3 * camera.zoom, i * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? COLORS.petal : COLORS.petalDeep;
      ctx.fill();
    }
  }

  if (state.style === 'lantern') {
    const rows = [
      { y: ground - 300 * u, sag: 30, count: 7, scale: 1.15 },
      { y: ground + 176 * u, sag: 24, count: 9, scale: 1 },
    ];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const left = at(-300, row.y);
      const right = at(300, row.y);
      ctx.strokeStyle = state.palette.wood;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.quadraticCurveTo((left.x + right.x) / 2, left.y + row.sag, right.x, right.y);
      ctx.stroke();
      for (let i = 0; i < row.count; i += 1) {
        const t = (i + 0.5) / row.count;
        const x = left.x + (right.x - left.x) * t;
        const y = left.y + Math.sin(t * Math.PI) * row.sag;
        drawChineseLantern(ctx, x, y + 12 * camera.zoom, row.scale * camera.zoom, lit, 701 + rowIndex * 13 + i);
        if (rowIndex === 1 && (i === 2 || i === 6)) {
          // 灯谜木牌：只画木牌和两笔竖纹，不写具体字。
          inkRoundRect(ctx, x - 13, y + 34 * camera.zoom, 26, 20, 5, COLORS.paper, {
            stroke: state.palette.woodDeep,
            width: 1.4,
            seed: 741 + i,
          });
          ctx.strokeStyle = state.palette.inkSoft;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x - 4, y + 39 * camera.zoom);
          ctx.lineTo(x - 4, y + 49 * camera.zoom);
          ctx.moveTo(x + 4, y + 39 * camera.zoom);
          ctx.lineTo(x + 4, y + 49 * camera.zoom);
          ctx.stroke();
        }
      }
    }
    // 灯会：招牌两侧各挂一只小红灯笼（低端机省掉，保留两串主灯）。
    if (state.quality !== 'low') {
      for (const structure of layout.structures) {
        const anchor = structure.kind === 'venue' ? BUILDING_ANCHORS[structure.id] : null;
        if (!anchor) continue;
        const p = at(structure.base.x, structure.base.y + (anchor.signY + 26) * structure.scale);
        if (p.x < -60 || p.x > layout.width + 60) continue;
        for (const side of [-1, 1]) {
          drawChineseLantern(
            ctx,
            p.x + side * 80 * structure.scale * camera.zoom,
            p.y,
            0.62 * camera.zoom,
            lit,
            761 + side,
          );
        }
      }
    }
    const wheel = at(-168, ground + 190 * u);
    drawChineseLantern(ctx, wheel.x, wheel.y, 1.5 * camera.zoom, lit, 781);
    ctx.save();
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(state.sceneMotion ? state.time * 0.6 : 0);
    ctx.strokeStyle = 'rgba(242,193,78,0.75)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i += 1) {
      const a = (Math.PI * i) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
      ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (state.style === 'harvest') {
    const sheafL = at(-330, ground + 508 * u);
    const sheafR = at(342, ground + 534 * u);
    drawRiceSheaf(ctx, sheafL.x, sheafL.y, 1.2 * camera.zoom, state.palette);
    drawRiceSheaf(ctx, sheafR.x, sheafR.y, 1 * camera.zoom, state.palette);
    const pumpkin = at(-224, ground + 566 * u);
    drawPumpkin(ctx, pumpkin.x, pumpkin.y, 1.35 * camera.zoom, state.palette);
    drawPumpkin(ctx, pumpkin.x + 44 * camera.zoom, pumpkin.y + 8 * camera.zoom, 0.95 * camera.zoom, state.palette);
    const jars = at(258, ground + 572 * u);
    drawWineJar(ctx, jars.x, jars.y, 1.15 * camera.zoom, state.palette);
    drawWineJar(ctx, jars.x + 38 * camera.zoom, jars.y + 6 * camera.zoom, 0.95 * camera.zoom, state.palette);
    const produceL = at(-250, ground + 250 * u);
    const produceR = at(256, ground + 236 * u);
    drawHangingProduce(ctx, produceL.x, produceL.y, 1.15 * camera.zoom, state.palette);
    drawHangingProduce(ctx, produceR.x, produceR.y, 1 * camera.zoom, state.palette);
  }

  if (state.style === 'frost') {
    // 草地上的积雪斑 + 屋檐下的小雪堆，让暖冬不是「只是变蓝」。
    for (let i = 0; i < 6; i += 1) {
      const p = at(-336 + i * 134, ground + (470 + (i % 3) * 44) * u);
      for (const [dx, dy, rx, ry] of [
        [0, 0, 54, 12],
        [-24, 4, 34, 9],
        [26, 3, 30, 8],
      ] as Array<[number, number, number, number]>) {
        ctx.beginPath();
        ctx.ellipse(p.x + dx * camera.zoom, p.y + dy * camera.zoom, rx * camera.zoom, ry * camera.zoom, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,253,248,0.6)';
        ctx.fill();
      }
    }
    for (const structure of layout.structures) {
      const p = at(structure.base.x, structure.base.y);
      if (p.x < -180 || p.x > layout.width + 180) continue;
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        p.y + 2 * camera.zoom,
        structure.art.w * 0.42 * camera.zoom,
        9 * camera.zoom,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = 'rgba(255,253,248,0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(191,227,242,0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    const bankY = layout.dockRect.y - 26;
    const span = layout.width + 260;
    ctx.save();
    for (let i = 0; i < 8; i += 1) {
      const x = wrap(i * 116 - camera.x * camera.zoom * 1.02, span) - 130;
      const y = bankY + Math.sin(i * 1.7) * 6;
      ctx.beginPath();
      ctx.ellipse(x, y, 82 * camera.zoom, 20 * camera.zoom, 0, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.paper;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y + 6 * camera.zoom, 74 * camera.zoom, 12 * camera.zoom, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(191,227,242,0.55)';
      ctx.fill();
    }
    ctx.restore();
    const lanternL = at(-246, ground + 300 * u);
    const lanternR = at(252, ground + 286 * u);
    drawChineseLantern(ctx, lanternL.x, lanternL.y, 0.95 * camera.zoom, lit, 791);
    drawChineseLantern(ctx, lanternR.x, lanternR.y, 0.8 * camera.zoom, lit, 793);
    const plum = at(-300, ground + 548 * u);
    drawPlumBranch(ctx, plum.x, plum.y, 1.1 * camera.zoom, state.palette);
    const tang = at(196, ground + 556 * u);
    drawTanghulu(ctx, tang.x, tang.y, 1 * camera.zoom);
  }
}

/** 花圃建设等级：几盆花 → 小花圃 → 花瓣路 → 王都花园。 */
function drawGardenDecor(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  const level = Math.max(0, Math.min(3, state.build.garden));
  if (level <= 0) return;
  const ground = layout.groundTop;
  const u = layout.unit;
  const zoom = state.camera.zoom;
  const at = (wx: number, wy: number) =>
    worldToScreen(state.camera, wx, wy, layout.width, layout.focusY);
  const time = state.sceneMotion ? state.time : 0;

  // 花盆 / 花圃：两侧对称，跟着相机走。
  for (const side of [-1, 1] as const) {
    const base = at(side * 178, ground + 452 * u);
    if (base.x < -120 || base.x > layout.width + 120) continue;
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.scale(zoom, zoom);
    if (level >= 2) {
      inkRoundRect(ctx, -46, -14, 92, 20, 8, state.palette.wood, {
        stroke: state.palette.woodDeep,
        width: 1.8,
        seed: 901 + side,
      });
      for (let i = 0; i < 5; i += 1) {
        inkLine(ctx, [{ x: -34 + i * 17, y: -10 }, { x: -34 + i * 17, y: -24 }], {
          stroke: COLORS.leaf,
          width: 2.2,
          seed: 903 + i + side,
          wobble: 0.2,
        });
        drawPetal(ctx, -34 + i * 17, -30, 7, i % 2 === 0 ? COLORS.petal : COLORS.honey);
      }
    } else {
      for (let i = 0; i < 3; i += 1) {
        inkRoundRect(ctx, -26 + i * 20, -14, 18, 16, 5, state.palette.wood, {
          stroke: state.palette.woodDeep,
          width: 1.4,
          seed: 907 + i + side,
        });
        inkLine(ctx, [{ x: -17 + i * 20, y: -12 }, { x: -17 + i * 20, y: -22 }], {
          stroke: COLORS.leaf,
          width: 2,
          seed: 909 + i + side,
          wobble: 0.2,
        });
        drawPetal(ctx, -17 + i * 20, -26, 5.6, [COLORS.petal, COLORS.honey, COLORS.berry][i % 3]);
      }
    }
    ctx.restore();
  }

  if (level >= 2) {
    // 花瓣路：主街上固定的落花，不逐帧随机。
    for (let i = 0; i < 12; i += 1) {
      const p = at(-34 + ((i * 37) % 68), ground + 400 * u + i * 18 * u);
      if (p.y > layout.dockRect.y - 10) break;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4.4 * zoom, 2.4 * zoom, i * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? COLORS.honey : COLORS.petal;
      ctx.fill();
    }
  }

  if (level >= 3) {
    // 花门：立在主街入口，村民从下面走过。
    const arch = at(0, ground + 606 * u);
    ctx.save();
    ctx.translate(arch.x, arch.y);
    ctx.scale(zoom, zoom);
    for (const side of [-1, 1]) {
      inkLine(ctx, [{ x: side * 62, y: 0 }, { x: side * 62, y: -104 }], {
        stroke: state.palette.woodDeep,
        width: 5,
        seed: 921 + side,
        wobble: 0.4,
      });
      for (let i = 0; i < 4; i += 1) {
        drawPetal(ctx, side * 62 + (i % 2 === 0 ? -6 : 6), -18 - i * 24, 6.4, i % 2 === 0 ? COLORS.petal : COLORS.honey);
      }
    }
    ctx.strokeStyle = COLORS.leaf;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-62, -104);
    ctx.quadraticCurveTo(0, -150, 62, -104);
    ctx.stroke();
    for (let i = 0; i < 7; i += 1) {
      const t = (i + 0.5) / 7;
      drawPetal(
        ctx,
        -62 + 124 * t,
        -104 - Math.sin(t * Math.PI) * 41,
        6,
        i % 2 === 0 ? COLORS.petal : COLORS.berry,
      );
    }
    ctx.restore();
    // 蝴蝶只在花门附近飞。
    const butterflyA = at(-96 + Math.sin(time * 0.7) * 26, ground + 470 * u + Math.cos(time * 0.9) * 10);
    const butterflyB = at(88 + Math.cos(time * 0.6) * 24, ground + 492 * u + Math.sin(time * 1.1) * 8);
    drawButterfly(ctx, butterflyA.x, butterflyA.y, zoom, time, 0, COLORS.honey);
    drawButterfly(ctx, butterflyB.x, butterflyB.y, zoom, time, 1.7, COLORS.petal);
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
  const pressed = state.pressedId === facility.id;
  const sink = pressed ? 3 * state.camera.zoom : 0;
  state.art.drawFacility(ctx, layout, state.camera, facility, state.phase);
  const scale = facility.scale * state.camera.zoom;
  ctx.save();
  ctx.translate(screen.x, screen.y + sink);
  ctx.scale(scale, scale);
  // 所有场馆/设施门口都不挂「可游玩」徽章，只留招牌、夜灯与纸纹。
  drawFacilityOverlay(ctx, facility, state.palette, state.time, !state.sceneMotion);
  if (pressed) {
    ctx.globalAlpha = 0.16;
    inkRoundRect(ctx, -110, -250, 220, 254, 24, COLORS.paper, { width: 0 });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawTown(
  ctx: CanvasRenderingContext2D,
  layout: TownLayout,
  state: TownViewState,
): void {
  state.art.drawSky(ctx, layout, state.phase);
  drawClouds(ctx, layout, state);
  drawSkyStyleDecor(ctx, layout, state);
  state.art.drawGround(ctx, layout, state.camera, state.phase);

  // 建筑、喷泉、国王王后、小人统一按落地 y 排序，小人会被近处建筑正确遮挡。
  const items: Array<{ depth: number; draw: () => void }> = layout.structures.map((structure) => ({
    depth: structure.depth,
    draw: () => {
      if (structure.kind === 'venue') drawBuildingWithOverlay(ctx, layout, state, structure);
      else drawFacilityWithOverlay(ctx, layout, state, structure);
    },
  }));
  items.push({ depth: layout.fountain.y, draw: () => drawFountain(ctx, layout, state) });
  const lightLevel = Math.max(0, Math.min(3, state.build.lights));
  if (lightLevel > 0) {
    items.push({
      // 灯串挂在路灯之间，深度比国王王后更靠里，人物会挡在灯串前面。
      depth: layout.groundTop + 430 * layout.unit - (96 + lightLevel * 6),
      draw: () => drawStreetLights(ctx, layout, state),
    });
  }
  items.push({
    depth: layout.royal.y,
    draw: () => {
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
    },
  });
  if (state.sceneMotion) {
    for (const actor of state.residents) {
      items.push({ depth: actor.y, draw: () => drawVillager(ctx, layout, state, actor) });
    }
  }
  items.sort((a, b) => a.depth - b.depth);
  for (const item of items) item.draw();

  drawGardenDecor(ctx, layout, state);
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

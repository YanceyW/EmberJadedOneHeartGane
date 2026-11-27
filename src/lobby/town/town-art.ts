import { createRng } from '../../core/rng';
import { QualityTier } from '../../core/quality/quality';
import { platform } from '../../shared/platform/wx';
import { COLORS } from '../../shared/design-system/tokens';
import { drawPetal } from '../../shared/design-system/draw';
import { applyGrainToOpaque, inkLine, softShadow } from '../../shared/design-system/paint';
import { TownBuildingLayout, TownFacilityLayout, TownLayout } from './town-layout';
import { townPalette, TownPalette, TownPhase } from './town-palette';
import { drawBuildingBody, drawFacilityBody } from './town-buildings';
import { TownCamera, worldToScreen } from './town-camera';

interface CanvasEntry {
  canvas: any;
  width: number;
  height: number;
}

const MAX_PHASES = 2;
const BUILD_PAD = 34;

export class TownArt {
  private tier: QualityTier = 'mid';
  private texture = true;
  private style = 'classic';
  private readonly sky = new Map<TownPhase, CanvasEntry>();
  private readonly ground = new Map<TownPhase, CanvasEntry>();
  private readonly buildings = new Map<string, CanvasEntry>();
  private readonly facilities = new Map<string, CanvasEntry>();

  ensure(
    layout: TownLayout,
    phase: TownPhase,
    tier: QualityTier,
    texture: boolean,
    style = 'classic',
  ): void {
    if (this.tier !== tier || this.texture !== texture || this.style !== style) {
      this.invalidate();
      this.tier = tier;
      this.texture = texture;
      this.style = style;
    }
    if (!this.sky.has(phase)) {
      this.sky.set(phase, this.bakeSky(layout, phase));
      this.trim(this.sky);
    }
    if (!this.ground.has(phase)) {
      this.ground.set(phase, this.bakeGround(layout, phase));
      this.trim(this.ground);
    }
    if (this.tier === 'low' && this.buildings.size > 0) {
      // 低端机按 phase 复用；key 里包含 phase。
      if (!this.buildings.has(`${phase}:match3`)) this.buildings.clear();
    }
    for (const building of layout.buildings) {
      const key = `${phase}:${building.entry.id}`;
      if (!this.buildings.has(key)) {
        this.buildings.set(key, this.bakeBuilding(building, phase));
      }
    }
    for (const facility of layout.facilities) {
      const key = `${phase}:${facility.id}`;
      if (!this.facilities.has(key)) {
        this.facilities.set(key, this.bakeFacility(facility, phase));
      }
    }
  }

  invalidate(): void {
    this.sky.clear();
    this.ground.clear();
    this.buildings.clear();
    this.facilities.clear();
  }

  private trim<T>(map: Map<T, CanvasEntry>): void {
    while (map.size > MAX_PHASES) {
      const first = map.keys().next().value as T | undefined;
      if (first === undefined) break;
      map.delete(first);
    }
  }

  private canvas(width: number, height: number): { canvas: any; ctx: CanvasRenderingContext2D | null } {
    const canvas = platform.createOffscreenCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
    return { canvas, ctx: canvas.getContext('2d') as CanvasRenderingContext2D | null };
  }

  private bakeSky(layout: TownLayout, phase: TownPhase): CanvasEntry {
    const width = layout.width;
    // 缩放 0.85 时地面会向下移动，天空多烘焙一段避免中间露出透明缝。
    const height = Math.ceil(layout.groundTop + 300);
    const { canvas, ctx } = this.canvas(width, height);
    if (!ctx) return { canvas, width, height };
    const palette = townPalette(phase, this.style);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(0.42, palette.skyTop);
    gradient.addColorStop(0.68, palette.skyMid);
    gradient.addColorStop(0.9, palette.skyHorizon);
    gradient.addColorStop(1, palette.skyHorizon);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const sunX = width - 146;
    const sunY = layout.groundTop * 0.5;
    glow(ctx, sunX, sunY, palette.night ? 44 : 150, palette.sunGlow, palette.night ? 0.18 : 0.32);
    ctx.beginPath();
    ctx.arc(sunX, sunY, palette.night ? 30 : 40, 0, Math.PI * 2);
    ctx.fillStyle = palette.sun;
    ctx.fill();

    if (palette.night) {
      const rng = createRng(0x5eed);
      for (let i = 0; i < (this.tier === 'low' ? 18 : 40); i += 1) {
        const x = rng.next() * width;
        const y = rng.next() * layout.groundTop * 0.82;
        const r = 1.2 + rng.next() * 2.2;
        ctx.globalAlpha = 0.45 + rng.next() * 0.5;
        ctx.fillStyle = COLORS.starlight;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 杩滃北
    for (const [base, color, amp] of [
      [layout.groundTop - 34, palette.hillFar, 26],
      [layout.groundTop - 10, palette.hillMid, 18],
    ] as Array<[number, string, number]>) {
      ctx.beginPath();
      ctx.moveTo(-20, height);
      for (let i = 0; i <= 30; i += 1) {
        const x = -20 + ((width + 40) * i) / 30;
        const y = base - Math.sin(i * 0.58) * amp - Math.sin(i * 0.21) * 10;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width + 20, height);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    // 杩滄櫙灞嬮《
    const roofs: Array<[number, number, number, string]> = [
      [width * 0.08, layout.groundTop - 18, 40, palette.roof1],
      [width * 0.16, layout.groundTop - 10, 30, palette.roof2],
      [width * 0.84, layout.groundTop - 22, 44, palette.roof3],
      [width * 0.92, layout.groundTop - 12, 28, palette.roof2],
    ];
    for (const [x, y, w, color] of roofs) {
      ctx.fillStyle = palette.wall;
      ctx.fillRect(x - w / 2, y - 28, w, 28);
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - 6, y - 28);
      ctx.lineTo(x + w / 2 + 6, y - 28);
      ctx.lineTo(x, y - 46);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    // 云由渲染层动态绘制（见 town-view 的 drawClouds），烘焙层只留天空/山/远景屋顶。
    if (this.tier !== 'low') {
      this.bunting(ctx, width, layout.groundTop - 96, palette);
    }

    if (this.texture) applyGrainToOpaque(ctx, width, height, 0.5);
    return { canvas, width, height };
  }

  private bunting(ctx: CanvasRenderingContext2D, width: number, y: number, palette: TownPalette): void {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      points.push({
        x: -10 + (width + 20) * t,
        y: y + Math.sin(t * Math.PI) * 26 + Math.sin(t * 5) * 4,
      });
    }
    inkLine(ctx, points, { stroke: 'rgba(58,46,42,0.45)', width: 1.5, seed: 419, wobble: 0.3 });
    const colors = [COLORS.petal, COLORS.honey, COLORS.mint, COLORS.lilac, COLORS.berry];
    for (let i = 0; i < 12; i += 1) {
      const t = (i + 0.5) / 12;
      const x = -10 + (width + 20) * t;
      const py = y + Math.sin(t * Math.PI) * 26 + Math.sin(t * 5) * 4;
      ctx.beginPath();
      ctx.moveTo(x, py + 2);
      ctx.lineTo(x + 14, py + 2);
      ctx.lineTo(x + 7, py + 24);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private bakeGround(layout: TownLayout, phase: TownPhase): CanvasEntry {
    const width = layout.worldWidth;
    // 多烘焙一段，保证缩放到 0.85 时地面仍覆盖到屏幕底部。
    const height = Math.ceil(layout.height - layout.groundTop + 280);
    const { canvas, ctx } = this.canvas(width, height);
    if (!ctx) return { canvas, width, height };
    const palette = townPalette(phase, this.style);
    const cx = width / 2;
    const fountainY = layout.fountain.y - layout.groundTop;
    const baseY = layout.height - layout.groundTop;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, palette.grassLight);
    gradient.addColorStop(0.3, palette.grass);
    gradient.addColorStop(1, palette.grass);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 顶部草地边缘
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0; i <= 40; i += 1) {
      const x = (width * i) / 40;
      const y = Math.sin(i * 0.55) * 5 + Math.sin(i * 0.17) * 3;
      ctx.lineTo(x, y + 8);
    }
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fillStyle = palette.grassDeep;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;

    // 草地色块
    const rng = createRng(0x9a11);
    const patches = this.tier === 'low' ? 12 : 28;
    for (let i = 0; i < patches; i += 1) {
      const x = rng.next() * width;
      const y = 90 + rng.next() * (height - 90);
      const rx = 40 + rng.next() * 110;
      ctx.globalAlpha = 0.16 + rng.next() * 0.1;
      ctx.fillStyle = i % 3 === 0 ? palette.grassLight : palette.grassDeep;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 草丛：烘焙进地面，运行时零成本。
    const trng = createRng(0x51a3);
    const tufts = this.tier === 'low' ? 40 : 110;
    for (let i = 0; i < tufts; i += 1) {
      const x = 18 + trng.next() * (width - 36);
      const y = 40 + trng.next() * (height - 80);
      const s = 0.7 + trng.next() * 0.8;
      ctx.globalAlpha = 0.28 + trng.next() * 0.18;
      ctx.strokeStyle = palette.grassDeep;
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      for (let b = -1; b <= 1; b += 1) {
        ctx.moveTo(x + b * 4 * s, y);
        ctx.quadraticCurveTo(x + b * 7 * s, y - 9 * s, x + b * 12 * s, y - 13 * s);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 左右延伸的街道
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 18; i += 1) {
        const t = i / 18;
        const x = cx + side * (190 + (width / 2 - 120) * t);
        const y = fountainY + 84 + Math.sin(t * 2.2) * 28 + t * 14;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = palette.path;
      ctx.lineWidth = 40;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = palette.pathDeep;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 广场
    ctx.beginPath();
    ctx.ellipse(cx, fountainY + 34, 200, 112, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.path;
    ctx.fill();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = COLORS.paper;
    ctx.beginPath();
    ctx.ellipse(cx, fountainY + 30, 164, 92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.pathDeep;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, fountainY + 34, 200, 112, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 12; i += 1) {
      const a = (Math.PI * 2 * i) / 12;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 42, fountainY + 34 + Math.sin(a) * 24);
      ctx.lineTo(cx + Math.cos(a) * 196, fountainY + 34 + Math.sin(a) * 108);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 主街踏步石
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      const y = fountainY + 126 + t * (baseY - fountainY - 140);
      const x = cx + Math.sin(t * 2.2) * 20;
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = COLORS.paper;
      ctx.beginPath();
      ctx.ellipse(x, y, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 主街
    ctx.beginPath();
    ctx.moveTo(cx - 62, fountainY + 110);
    ctx.quadraticCurveTo(cx - 24, fountainY + 300, cx - 70, baseY);
    ctx.lineTo(cx + 70, baseY);
    ctx.quadraticCurveTo(cx + 24, fountainY + 300, cx + 62, fountainY + 110);
    ctx.closePath();
    ctx.fillStyle = palette.path;
    ctx.fill();
    ctx.strokeStyle = palette.pathDeep;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 通往每座建筑的支路
    for (const building of layout.structures) {
      const bx = cx + building.base.x;
      const by = building.base.y - layout.groundTop;
      ctx.beginPath();
      ctx.moveTo(cx, fountainY + 30);
      ctx.quadraticCurveTo((cx + bx) / 2, (fountainY + by) / 2 + 28, bx, by - 8);
      ctx.strokeStyle = palette.path;
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = palette.pathDeep;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 广场绿篱
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i += 1) {
        const x = cx + side * (176 - i * 10);
        const y = fountainY + 54 + i * 2;
        ctx.beginPath();
        ctx.ellipse(x, y, 24, 15, 0, 0, Math.PI * 2);
        ctx.fillStyle = palette.grassDeep;
        ctx.fill();
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x - 9, y - 7, 12, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = palette.grass;
        ctx.fill();
      }
    }

    // 后方篱笆
    if (this.tier !== 'low') {
      ctx.strokeStyle = palette.wood;
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 20; i += 1) {
        const x = 30 + i * 74;
        ctx.beginPath();
        ctx.moveTo(x, 16);
        ctx.lineTo(x, 42);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(20, 26);
      ctx.lineTo(width - 20, 26);
      ctx.stroke();
    }

    // 后方灌木/树
    for (const [x, y, s] of [
      [120, 80, 1.0],
      [width - 130, 70, 0.9],
      [280, 46, 0.7],
      [width - 300, 50, 0.7],
    ] as Array<[number, number, number]>) {
      ctx.strokeStyle = palette.woodDeep;
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(x, y + 40 * s);
      ctx.lineTo(x, y + 6 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y, 28 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette.grassDeep;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - 16 * s, y - 10 * s, 16 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette.grass;
      ctx.fill();
    }

    // 零散花丛
    const flowers = this.tier === 'low' ? 10 : 24;
    const frng = createRng(0xf10a);
    for (let i = 0; i < flowers; i += 1) {
      const x = frng.next() * width;
      const y = 70 + frng.next() * (height - 110);
      const color = [COLORS.petal, COLORS.honey, COLORS.berry, COLORS.lilac][i % 4];
      drawPetal(ctx, x, y, 4 + frng.next() * 3, color);
    }

    if (this.texture) applyGrainToOpaque(ctx, width, height, 0.45);
    return { canvas, width, height };
  }

  private bakeBuilding(building: TownBuildingLayout, phase: TownPhase): CanvasEntry {
    const localW = Math.ceil(building.art.w / Math.max(0.001, building.scale));
    const localH = Math.ceil(building.art.h / Math.max(0.001, building.scale));
    const width = localW + BUILD_PAD * 2;
    const height = localH + BUILD_PAD * 2;
    const { canvas, ctx } = this.canvas(width, height);
    if (!ctx) return { canvas, width, height };
    ctx.translate(BUILD_PAD + localW / 2, BUILD_PAD + localH);
    drawBuildingBody(ctx, building, townPalette(phase, this.style));
    if (this.texture) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      applyGrainToOpaque(ctx, width, height, 0.5);
    }
    return { canvas, width, height };
  }

  private bakeFacility(facility: TownFacilityLayout, phase: TownPhase): CanvasEntry {
    const localW = Math.ceil(facility.art.w / Math.max(0.001, facility.scale));
    const localH = Math.ceil(facility.art.h / Math.max(0.001, facility.scale));
    const width = localW + BUILD_PAD * 2;
    const height = localH + BUILD_PAD * 2;
    const { canvas, ctx } = this.canvas(width, height);
    if (!ctx) return { canvas, width, height };
    ctx.translate(BUILD_PAD + localW / 2, BUILD_PAD + localH);
    drawFacilityBody(ctx, facility, townPalette(phase, this.style));
    if (this.texture) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      applyGrainToOpaque(ctx, width, height, 0.5);
    }
    return { canvas, width, height };
  }

  drawFacility(
    ctx: CanvasRenderingContext2D,
    layout: TownLayout,
    camera: TownCamera,
    facility: TownFacilityLayout,
    phase: TownPhase,
    alpha = 1,
  ): void {
    const entry = this.facilities.get(`${phase}:${facility.id}`);
    if (!entry) return;
    const base = worldToScreen(camera, facility.base.x, facility.base.y, layout.width, layout.focusY);
    const scale = facility.scale * camera.zoom;
    const localW = Math.ceil(facility.art.w / Math.max(0.001, facility.scale));
    const localH = Math.ceil(facility.art.h / Math.max(0.001, facility.scale));
    const dx = base.x - (BUILD_PAD + localW / 2) * scale;
    const dy = base.y - (BUILD_PAD + localH) * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(entry.canvas, dx, dy, entry.width * scale, entry.height * scale);
    ctx.restore();
  }

  drawSky(
    ctx: CanvasRenderingContext2D,
    _layout: TownLayout,
    phase: TownPhase,
    alpha = 1,
  ): void {
    const entry = this.sky.get(phase);
    if (!entry) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(entry.canvas, 0, 0, entry.width, entry.height);
    ctx.restore();
  }

  drawGround(
    ctx: CanvasRenderingContext2D,
    layout: TownLayout,
    camera: TownCamera,
    phase: TownPhase,
    alpha = 1,
  ): void {
    const entry = this.ground.get(phase);
    if (!entry) return;
    const topLeft = worldToScreen(camera, -layout.worldWidth / 2, layout.groundTop, layout.width, layout.focusY);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      entry.canvas,
      topLeft.x,
      topLeft.y,
      layout.worldWidth * camera.zoom,
      entry.height * camera.zoom,
    );
    ctx.restore();
  }

  drawBuilding(
    ctx: CanvasRenderingContext2D,
    layout: TownLayout,
    camera: TownCamera,
    building: TownBuildingLayout,
    phase: TownPhase,
    alpha = 1,
  ): void {
    const entry = this.buildings.get(`${phase}:${building.entry.id}`);
    if (!entry) return;
    const base = worldToScreen(camera, building.base.x, building.base.y, layout.width, layout.focusY);
    const scale = building.scale * camera.zoom;
    const localW = Math.ceil(building.art.w / Math.max(0.001, building.scale));
    const localH = Math.ceil(building.art.h / Math.max(0.001, building.scale));
    const dx = base.x - (BUILD_PAD + localW / 2) * scale;
    const dy = base.y - (BUILD_PAD + localH) * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(entry.canvas, dx, dy, entry.width * scale, entry.height * scale);
    ctx.restore();
  }

  drawForegroundShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number,
  ): void {
    softShadow(ctx, x, y, rx, ry, 0.16, 4);
  }
}

function glow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  strength: number,
): void {
  for (let i = 6; i > 0; i -= 1) {
    const f = i / 6;
    ctx.globalAlpha = strength * (1 - f) ** 1.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * f, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}


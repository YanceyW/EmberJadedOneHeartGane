import { COLORS } from '../shared/design-system/tokens';
import { WeatherId } from './themes';

export interface WeatherState {
  weather: WeatherId;
  width: number;
  height: number;
  /** 地平线（屏幕 y）：雨溅/积雪只落在地面侧。 */
  groundTop: number;
  /** Dock 顶边（屏幕 y）：雪堆停在这里，不会被 UI 压住。 */
  dockTop: number;
  time: number;
  quality: 'high' | 'mid' | 'low';
  reducedMotion: boolean;
  night: boolean;
}

const DENSITY: Record<'high' | 'mid' | 'low', number> = { high: 92, mid: 64, low: 36 };

const veilCache = new Map<string, CanvasGradient>();
let veilOwner: CanvasRenderingContext2D | null = null;

function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}

/**
 * 全屏氛围渐变：不同天气给出不同的明暗与冷暖，夜间再压暗一档。
 * 渐变按 (天气, 昼夜, 高度) 缓存，不逐帧重建；换画布时重新建。
 */
function veilFor(
  ctx: CanvasRenderingContext2D,
  weather: WeatherId,
  night: boolean,
  height: number,
): CanvasGradient {
  if (veilOwner !== ctx) {
    veilCache.clear();
    veilOwner = ctx;
  }
  const key = `${weather}:${night ? 1 : 0}:${Math.round(height)}`;
  const cached = veilCache.get(key);
  if (cached) return cached;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (weather === 'rain') {
    gradient.addColorStop(0, night ? 'rgba(38,52,78,0.34)' : 'rgba(70,92,120,0.26)');
    gradient.addColorStop(0.55, night ? 'rgba(46,62,88,0.20)' : 'rgba(88,112,142,0.14)');
    gradient.addColorStop(1, night ? 'rgba(32,44,66,0.26)' : 'rgba(108,130,156,0.10)');
  } else if (weather === 'snow') {
    gradient.addColorStop(0, night ? 'rgba(120,150,190,0.22)' : 'rgba(226,240,255,0.20)');
    gradient.addColorStop(0.6, night ? 'rgba(140,168,204,0.12)' : 'rgba(240,248,255,0.10)');
    gradient.addColorStop(1, night ? 'rgba(150,176,206,0.16)' : 'rgba(255,255,255,0.10)');
  } else {
    gradient.addColorStop(0, night ? 'rgba(120,80,96,0.16)' : 'rgba(255,196,214,0.16)');
    gradient.addColorStop(0.6, night ? 'rgba(150,100,110,0.10)' : 'rgba(255,214,226,0.08)');
    gradient.addColorStop(1, night ? 'rgba(110,74,88,0.12)' : 'rgba(255,232,238,0.06)');
  }
  veilCache.set(key, gradient);
  return gradient;
}

/** 几层横向雾带：不用渐变也能做出软边。 */
function drawMistBand(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  color: string,
  strength: number,
): void {
  for (let i = 0; i < 4; i += 1) {
    ctx.globalAlpha = strength * (0.34 - i * 0.07);
    ctx.fillStyle = color;
    ctx.fillRect(0, y - i * 9, width, 26 + i * 18);
  }
  ctx.globalAlpha = 1;
}

function drawRain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  count: number,
): void {
  const layers = [
    { share: 0.3, alpha: 0.24, lineWidth: 1, length: 10, speed: 420, drift: 26 },
    { share: 0.36, alpha: 0.34, lineWidth: 1.6, length: 18, speed: 560, drift: 34 },
    { share: 0.34, alpha: 0.48, lineWidth: 2.4, length: 30, speed: 740, drift: 46 },
  ];
  ctx.lineCap = 'round';
  let index = 0;
  for (let layer = 0; layer < layers.length; layer += 1) {
    const spec = layers[layer];
    const drops = Math.max(4, Math.round(count * spec.share));
    for (let i = 0; i < drops; i += 1) {
      const seed = index + 1;
      const speed = spec.speed + (seed % 5) * 60;
      const y = wrap(seed * 97 + time * speed, height + 90) - 45;
      const x =
        wrap(seed * 211 + time * spec.drift + Math.sin(seed * 1.7) * 12, width + 60) - 30;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - spec.length * 0.34, y + spec.length);
      if (layer > 0) {
        // 深色描边打底，浅色雨丝压在中间：在亮天空和暗建筑上都能看清。
        ctx.strokeStyle = `rgba(92,118,152,${spec.alpha * 0.55})`;
        ctx.lineWidth = spec.lineWidth + 1.1;
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(232,244,255,${spec.alpha + 0.2})`;
      ctx.lineWidth = spec.lineWidth;
      ctx.stroke();
      index += 1;
    }
  }
}

/** 地面水花圈：固定槽位 + 周期，不随机分配对象。 */
function drawSplashes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  groundTop: number,
  time: number,
  slots: number,
): void {
  const cycle = 0.55;
  ctx.strokeStyle = 'rgba(232,244,255,0.9)';
  for (let i = 0; i < slots; i += 1) {
    const raw = time / cycle + i * 0.37;
    const step = Math.floor(raw);
    const phase = raw - step;
    const h1 = Math.abs(Math.sin(i * 12.9898 + step * 78.233) * 43758.5453);
    const h2 = Math.abs(Math.sin(i * 4.581 + step * 21.71) * 24634.6345);
    const x = (h1 - Math.floor(h1)) * width;
    const span = Math.max(60, height - groundTop - 70);
    const y = groundTop + 46 + (h2 - Math.floor(h2)) * span;
    const radius = 3 + phase * 13;
    ctx.globalAlpha = (1 - phase) * 0.45;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSnow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  count: number,
  tier: 'high' | 'mid' | 'low',
): void {
  const layers = [
    { share: 0.34, radius: 1.6, alpha: 0.55, speed: 32, drift: 8 },
    { share: 0.34, radius: 3, alpha: 0.78, speed: 48, drift: 14 },
    { share: 0.32, radius: 4.6, alpha: 0.95, speed: 68, drift: 22 },
  ];
  let index = 0;
  for (let layer = 0; layer < layers.length; layer += 1) {
    const spec = layers[layer];
    if (tier === 'low' && layer === 2) continue;
    const flakes = Math.max(4, Math.round(count * spec.share));
    for (let i = 0; i < flakes; i += 1) {
      const seed = index + 1;
      const x =
        wrap(seed * 157 + time * spec.drift * 0.6 + Math.sin(time * 0.7 + seed) * 16, width + 44) - 22;
      const y = wrap(seed * 83 + time * spec.speed, height + 60) - 30;
      const color = seed % 5 === 0 ? COLORS.starlight : seed % 7 === 0 ? COLORS.sky : COLORS.paper;
      if (layer === 2) {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = 'rgba(140,170,205,1)';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1.5, spec.radius * 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = spec.alpha * (0.6 + (seed % 5) * 0.08);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, spec.radius, 0, Math.PI * 2);
      ctx.fill();
      index += 1;
    }
  }
  ctx.globalAlpha = 1;
}

function drawSnowBank(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
): void {
  ctx.fillStyle = 'rgba(255,253,248,0.88)';
  ctx.beginPath();
  ctx.moveTo(-12, baseY + 54);
  for (let i = 0; i <= 14; i += 1) {
    const x = -12 + ((width + 24) * i) / 14;
    const y = baseY - 8 - Math.sin(i * 1.3) * 8 - (i % 3) * 5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width + 12, baseY + 54);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(191,227,242,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 14; i += 1) {
    const x = -12 + ((width + 24) * i) / 14;
    const y = baseY - 4 - Math.sin(i * 1.3) * 8 - (i % 3) * 5;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawPetalWind(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  count: number,
  tier: 'high' | 'mid' | 'low',
): void {
  const layers = [
    { share: 0.4, radius: 2.2, alpha: 0.55, speed: 40, gust: 26 },
    { share: 0.34, radius: 3.6, alpha: 0.72, speed: 62, gust: 34 },
    { share: 0.26, radius: 5.6, alpha: 0.85, speed: 86, gust: 44 },
  ];
  const colors = [COLORS.petal, COLORS.berry, COLORS.peach, COLORS.honey];
  let index = 0;
  for (let layer = 0; layer < layers.length; layer += 1) {
    const spec = layers[layer];
    if (tier === 'low' && layer === 2) continue;
    const petals = Math.max(4, Math.round(count * spec.share));
    for (let i = 0; i < petals; i += 1) {
      const seed = index + 1;
      const gust = Math.sin(time * 0.9 + seed * 0.7) * spec.gust;
      const x = wrap(seed * 173 + time * spec.gust * 0.8 + gust, width + 60) - 30;
      const y = wrap(seed * 61 + time * spec.speed, height + 60) - 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 0.8 + seed * 0.9);
      ctx.globalAlpha = spec.alpha * (0.7 + (seed % 4) * 0.08);
      ctx.fillStyle = colors[seed % colors.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, spec.radius, spec.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      index += 1;
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * 天气是屏幕空间覆盖：只画在场景之上、UI 之下，
 * 不参与建筑烘焙，也不改变命中/经济。
 */
export function drawWeather(ctx: CanvasRenderingContext2D, state: WeatherState): void {
  const { weather, width, height, groundTop, dockTop, time, quality, reducedMotion, night } = state;
  if (weather === 'clear') return;

  ctx.save();
  ctx.fillStyle = veilFor(ctx, weather, night, height);
  ctx.fillRect(0, 0, width, height);

  if (reducedMotion) {
    ctx.restore();
    return;
  }

  const count = DENSITY[quality];

  if (weather === 'rain') {
    drawMistBand(
      ctx,
      width,
      groundTop + 10,
      night ? 'rgba(120,144,176,1)' : 'rgba(214,228,244,1)',
      0.22,
    );
    drawRain(ctx, width, height, time, count);
    if (quality !== 'low') {
      drawSplashes(ctx, width, height, groundTop, time, quality === 'high' ? 12 : 8);
    }
  } else if (weather === 'snow') {
    drawMistBand(
      ctx,
      width,
      groundTop - 6,
      night ? 'rgba(160,186,216,1)' : 'rgba(255,255,255,1)',
      0.26,
    );
    drawSnow(ctx, width, height, time, count, quality);
    drawSnowBank(ctx, width, dockTop - 34);
  } else {
    drawPetalWind(ctx, width, height, time, count, quality);
  }

  ctx.restore();
}

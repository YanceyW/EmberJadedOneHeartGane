import { COLORS } from '../shared/design-system/tokens';
import { WeatherId } from './themes';

export interface WeatherState {
  weather: WeatherId;
  width: number;
  height: number;
  time: number;
  quality: 'high' | 'mid' | 'low';
  reducedMotion: boolean;
}

function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}

/**
 * 天气是纯前景覆盖：不参与建筑烘焙，也不改变命中/经济。
 * 所有数量按画质档位收缩，减少动效时只保留色调。
 */
export function drawWeather(ctx: CanvasRenderingContext2D, state: WeatherState): void {
  const { weather, width, height, time, quality, reducedMotion } = state;
  if (weather === 'clear') return;

  const tint =
    weather === 'rain'
      ? 'rgba(80,105,140,0.10)'
      : weather === 'snow'
        ? 'rgba(220,240,255,0.07)'
        : 'rgba(255,190,210,0.05)';
  ctx.save();
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, width, height);

  if (reducedMotion) {
    ctx.restore();
    return;
  }

  const base = quality === 'low' ? 36 : quality === 'mid' ? 64 : 92;
  ctx.lineCap = 'round';

  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(214,232,250,0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < base; i += 1) {
      const speed = 520 + (i % 5) * 70;
      const y = wrap(i * 97 + time * speed, height + 60) - 30;
      const x = wrap(i * 211 + time * 36 + Math.sin(i * 1.7) * 18, width + 40) - 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 16);
      ctx.stroke();
    }
  } else if (weather === 'snow') {
    for (let i = 0; i < base; i += 1) {
      const speed = 42 + (i % 6) * 9;
      const y = wrap(i * 83 + time * speed, height + 40) - 20;
      const x =
        wrap(i * 157 + time * 12, width + 30) - 15 + Math.sin(time * 0.7 + i * 1.3) * 14;
      const radius = 1.4 + (i % 3) * 0.7;
      ctx.globalAlpha = 0.55 + (i % 4) * 0.08;
      ctx.fillStyle = i % 7 === 0 ? COLORS.starlight : COLORS.paper;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    for (let i = 0; i < base; i += 1) {
      const speed = 46 + (i % 5) * 11;
      const y = wrap(i * 61 + time * speed, height + 40) - 20;
      const x = wrap(i * 173 + time * 22 + Math.sin(time * 0.6 + i) * 26, width + 50) - 25;
      const angle = time * 0.9 + i * 0.7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = [COLORS.petal, COLORS.berry, COLORS.peach][i % 3];
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

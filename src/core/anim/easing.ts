export type Easing = (t: number) => number;

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export const Easing: Record<string, Easing> = {
  linear: (t) => clamp01(t),
  inQuad: (t) => clamp01(t) ** 2,
  outQuad: (t) => 1 - (1 - clamp01(t)) ** 2,
  inOutQuad: (t) => {
    const x = clamp01(t);
    return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  },
  outCubic: (t) => 1 - (1 - clamp01(t)) ** 3,
  inOutCubic: (t) => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
  },
  // 只用于奖励：允许 >1 的过冲
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const x = clamp01(t);
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
  outElastic: (t) => {
    const x = clamp01(t);
    if (x === 0 || x === 1) return x;
    const c4 = (2 * Math.PI) / 3;
    return 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  },
  outBounce: (t) => {
    const x = clamp01(t);
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x - 1.5 / d1) ** 2 + 0.75;
    if (x < 2.5 / d1) return n1 * (x - 2.25 / d1) ** 2 + 0.9375;
    return n1 * (x - 2.625 / d1) ** 2 + 0.984375;
  },
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

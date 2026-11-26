import { Easing } from '../../core/anim/easing';

/**
 * 全项目统一的动效/特效 token。
 * 规则：只允许使用这里的时长与预设，游戏内不得自造时间曲线或粒子形状。
 */

export const DURATION = {
  instant: 0.06,
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
  reward: 0.32,
  /** 结算等仪式性演出，允许更长 */
  ceremony: 0.6,
} as const;

export const EASE = {
  standard: Easing.outCubic,
  enter: Easing.outCubic,
  exit: Easing.inQuad,
  pop: Easing.outBack,
  bounce: Easing.outElastic,
  drop: Easing.outBounce,
  linear: Easing.linear,
} as const;

export interface BurstPreset {
  sprite: 'p-star' | 'p-petal' | 'p-bubble' | 'p-dust' | 'p-coin' | 'p-sugar' | 'p-ring';
  count: number;
  lifespan: [number, number];
  speed: [number, number];
  angle: [number, number];
  gravity?: number;
  drag?: number;
  scale?: [number, number];
  alpha?: [number, number];
  spin?: [number, number];
  blend?: 'normal' | 'add';
  size?: number;
  spread?: number;
}

const FULL_CIRCLE: [number, number] = [0, Math.PI * 2];
const UP_FAN: [number, number] = [-Math.PI * 0.85, -Math.PI * 0.15];

export type BurstId =
  | 'sparkle'
  | 'petal'
  | 'bubble'
  | 'dust'
  | 'coin'
  | 'sugar'
  | 'ring'
  | 'confetti';

export const BURSTS: Record<BurstId, BurstPreset> = {
  sparkle: {
    sprite: 'p-star',
    count: 9,
    lifespan: [0.28, 0.5],
    speed: [90, 210],
    angle: FULL_CIRCLE,
    gravity: 320,
    drag: 1.6,
    scale: [1, 0.25],
    alpha: [1, 0],
    spin: [-6, 6],
    blend: 'add',
    size: 30,
    spread: 6,
  },
  petal: {
    sprite: 'p-petal',
    count: 7,
    lifespan: [0.5, 0.9],
    speed: [40, 110],
    angle: UP_FAN,
    gravity: 160,
    drag: 0.9,
    scale: [1, 0.7],
    alpha: [0.95, 0],
    spin: [-3, 3],
    size: 28,
    spread: 10,
  },
  bubble: {
    sprite: 'p-bubble',
    count: 6,
    lifespan: [0.45, 0.8],
    speed: [30, 80],
    angle: [-Math.PI * 0.7, -Math.PI * 0.3],
    gravity: -60,
    drag: 0.6,
    scale: [0.8, 1.1],
    alpha: [0.9, 0],
    size: 24,
    spread: 12,
  },
  dust: {
    sprite: 'p-dust',
    count: 5,
    lifespan: [0.2, 0.36],
    speed: [20, 70],
    angle: FULL_CIRCLE,
    gravity: 90,
    drag: 2.4,
    scale: [0.9, 1.4],
    alpha: [0.5, 0],
    size: 22,
    spread: 14,
  },
  coin: {
    sprite: 'p-coin',
    count: 6,
    lifespan: [0.35, 0.6],
    speed: [70, 160],
    angle: UP_FAN,
    gravity: 420,
    drag: 0.4,
    scale: [1, 0.6],
    alpha: [1, 0],
    spin: [-8, 8],
    size: 26,
    spread: 8,
  },
  sugar: {
    sprite: 'p-sugar',
    count: 8,
    lifespan: [0.3, 0.55],
    speed: [60, 150],
    angle: FULL_CIRCLE,
    gravity: 260,
    drag: 1.2,
    scale: [1, 0.3],
    alpha: [1, 0],
    spin: [-5, 5],
    size: 22,
    spread: 8,
  },
  ring: {
    sprite: 'p-ring',
    count: 1,
    lifespan: [0.34, 0.34],
    speed: [0, 0],
    angle: [0, 0],
    scale: [0.5, 1.9],
    alpha: [0.85, 0],
    blend: 'add',
    size: 60,
  },
  confetti: {
    sprite: 'p-star',
    count: 22,
    lifespan: [0.7, 1.2],
    speed: [140, 320],
    angle: UP_FAN,
    gravity: 520,
    drag: 0.5,
    scale: [1, 0.5],
    alpha: [1, 0],
    spin: [-9, 9],
    blend: 'add',
    size: 30,
    spread: 40,
  },
};

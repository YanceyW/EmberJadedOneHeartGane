import { clamp } from './easing';
import { Easing } from './easing';

export interface TweenOptions {
  duration: number;
  delay?: number;
  easing?: (t: number) => number;
  onUpdate: (t: number) => void;
  onComplete?: () => void;
}

interface TweenState extends TweenOptions {
  elapsed: number;
  playing: boolean;
}

export interface TweenHandle {
  cancel(): void;
  finish(): void;
  readonly done: boolean;
}

export class TweenManager {
  private readonly tweens: TweenState[] = [];
  private timeScale = 1;

  to(options: TweenOptions): TweenHandle {
    const tween: TweenState = {
      ...options,
      duration: Math.max(0.0001, options.duration),
      easing: options.easing ?? Easing.outCubic,
      elapsed: options.delay && options.delay > 0 ? -options.delay : 0,
      playing: true,
    };
    this.tweens.push(tween);

    return {
      cancel: () => {
        tween.playing = false;
      },
      finish: () => {
        if (!tween.playing) return;
        tween.playing = false;
        tween.onUpdate(1);
        tween.onComplete?.();
      },
      get done() {
        return !tween.playing;
      },
    };
  }

  update(dt: number): void {
    if (this.tweens.length === 0) return;
    const step = dt * this.timeScale;

    for (let i = this.tweens.length - 1; i >= 0; i -= 1) {
      const tween = this.tweens[i];
      if (!tween.playing) {
        this.tweens.splice(i, 1);
        continue;
      }

      tween.elapsed += step;
      if (tween.elapsed < 0) continue;

      const raw = clamp(tween.elapsed / tween.duration, 0, 1);
      tween.onUpdate(tween.easing!(raw));

      if (raw >= 1) {
        tween.playing = false;
        this.tweens.splice(i, 1);
        tween.onComplete?.();
      }
    }
  }

  skipAll(): void {
    for (const tween of this.tweens) {
      if (!tween.playing) continue;
      tween.playing = false;
      tween.onUpdate(1);
      tween.onComplete?.();
    }
    this.tweens.length = 0;
  }

  clear(): void {
    this.tweens.length = 0;
  }

  setTimeScale(value: number): void {
    this.timeScale = clamp(value, 0.25, 3);
  }

  get timeScaleValue(): number {
    return this.timeScale;
  }

  get activeCount(): number {
    return this.tweens.length;
  }
}

// 阻尼弹簧：用于按钮回弹、方块落地挤压（目标值固定为 1，靠 toward 重新起振）。
export class Spring {
  private velocity = 0;

  constructor(
    public value = 1,
    private readonly stiffness = 220,
    private readonly damping = 18,
  ) {}

  toward(target: number): void {
    this.value = target;
    this.velocity = 0;
  }

  set(target: number): void {
    this.value = target;
    this.velocity = 0;
  }

  update(dt: number): number {
    const step = Math.min(dt, 1 / 30);
    const force = -this.stiffness * (this.value - 1);
    const damp = -this.damping * this.velocity;
    this.velocity += (force + damp) * step;
    this.value += this.velocity * step;
    if (Math.abs(this.value - 1) < 0.001 && Math.abs(this.velocity) < 0.001) {
      this.value = 1;
      this.velocity = 0;
    }
    return this.value;
  }
}

// 很轻的屏幕抖动。用确定性正弦叠加，保证测试可复现。
export class Shake {
  private remaining = 0;
  private duration = 0;
  private amplitude = 0;
  private phase = 0;

  trigger(amplitude: number, duration: number): void {
    this.amplitude = amplitude;
    this.duration = Math.max(0.0001, duration);
    this.remaining = this.duration;
    this.phase = 0;
  }

  update(dt: number): void {
    if (this.remaining <= 0) return;
    this.remaining = Math.max(0, this.remaining - dt);
    this.phase += dt * 60;
  }

  get offset(): { x: number; y: number; rotate: number } {
    if (this.remaining <= 0) return { x: 0, y: 0, rotate: 0 };
    const decay = this.remaining / this.duration;
    const a = this.amplitude * decay;
    return {
      x: Math.sin(this.phase * 1.7) * a,
      y: Math.cos(this.phase * 2.3) * a * 0.8,
      rotate: Math.sin(this.phase * 1.1) * a * 0.002,
    };
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  clear(): void {
    this.remaining = 0;
  }
}

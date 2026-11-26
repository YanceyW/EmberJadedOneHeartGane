import { AudioService } from '../../core/audio/audio';
import { HapticsService } from '../../core/haptics/haptics';
import { ParticleSystem } from '../../core/particles/particles';
import { QualityService } from '../../core/quality/quality';
import { BURSTS, BurstId } from '../design-system/motion';

export interface FeedbackDeps {
  audio: AudioService;
  haptics: HapticsService;
  particles: ParticleSystem;
  quality: QualityService;
}

/**
 * 全项目唯一的反馈入口。
 *
 * 视觉、听觉、触觉在这里一次性对齐，游戏内不得绕过它直接播放音效或造粒子，
 * 这样四款游戏的手感才会一致。
 */
export class Feedback {
  private comboPitch = 0;

  constructor(private readonly deps: FeedbackDeps) {}

  private get reduced(): boolean {
    return this.deps.quality.reducedMotion;
  }

  tap(): void {
    this.deps.audio.playSfx('tap');
  }

  select(): void {
    this.deps.audio.playSfx('select');
    if (this.reduced) return;
  }

  /** 按下棋盘格：比 tap 更轻，滑动开局不吵。 */
  press(): void {
    this.deps.audio.playSfx('select', { volume: 0.5 });
  }

  /** 倒计时最后 10 秒的秒针提示。 */
  tick(): void {
    this.deps.audio.playSfx('tick', { volume: 0.6 });
  }

  /** 非法操作：低音 + 极轻震动，不做红屏。 */
  invalid(x?: number, y?: number): void {
    this.deps.audio.playSfx('invalid');
    this.deps.haptics.fail();
    if (x !== undefined && y !== undefined && !this.reduced) {
      this.burst('dust', x, y, 0.6);
    }
  }

  /**
   * 消除：音高随连锁递增；tempoStep 是跨操作的节奏档位（1–6），
   * 与连锁叠加后封顶 +12 半音，粒子同步放大。
   */
  match(comboIndex: number, x?: number, y?: number, tempoStep = 1): void {
    const cascade = Math.min(Math.max(comboIndex - 1, 0), 6);
    const tempo = Math.min(Math.max(tempoStep - 1, 0), 5);
    const pitch = Math.min(12, (cascade + tempo) * 2);
    const name = comboIndex > 1 ? 'combo' : 'match';
    this.deps.audio.playSfx(name, { pitch });
    this.deps.haptics.light();
    if (x === undefined || y === undefined || this.reduced) return;
    this.burst('sparkle', x, y, Math.min(1 + cascade * 0.15 + tempo * 0.12, 2.2));
  }

  pop(x: number, y: number): void {
    this.deps.audio.playSfx('pop');
    if (this.reduced) return;
    this.burst('sugar', x, y, 0.7);
  }

  drop(x: number, y: number): void {
    this.deps.audio.playSfx('drop');
    if (this.reduced) return;
    this.burst('dust', x, y, 0.5);
  }

  reward(x?: number, y?: number): void {
    this.deps.audio.playSfx('reward');
    this.deps.haptics.success();
    if (x === undefined || y === undefined || this.reduced) return;
    this.burst('coin', x, y, 1);
  }

  coin(x: number, y: number): void {
    this.deps.audio.playSfx('coin');
    if (this.reduced) return;
    this.burst('coin', x, y, 0.8);
  }

  /** 过关：琶音 + 礼花，唯一允许「用力」的时机。 */
  win(x?: number, y?: number): void {
    this.deps.audio.playSfx('win');
    this.deps.haptics.success();
    if (this.reduced) return;
    if (x !== undefined && y !== undefined) this.burst('confetti', x, y, 1);
  }

  fail(): void {
    this.deps.audio.playSfx('fail');
    this.deps.haptics.fail();
  }

  transition(): void {
    this.deps.audio.playSfx('whoosh', { volume: 0.6 });
  }

  /** 通用粒子爆发，游戏自定义位置时用。 */
  burst(kind: BurstId, x: number, y: number, scale = 1): void {
    if (this.reduced) return;
    const preset = BURSTS[kind];
    if (!preset) return;
    this.deps.particles.burst(preset, x, y, scale);
  }

  /** 连击结束或换局时重置音高阶梯。 */
  resetCombo(): void {
    this.comboPitch = 0;
  }

  get comboStep(): number {
    return this.comboPitch;
  }
}

export function createFeedback(deps: FeedbackDeps): Feedback {
  deps.particles.setBudget(deps.quality.particleBudget);
  return new Feedback(deps);
}

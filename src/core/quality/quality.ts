import { platform, WindowMetrics } from '../../shared/platform/wx';

export type QualityTier = 'high' | 'mid' | 'low';
export type QualityPreference = 'auto' | QualityTier;

export interface QualityProfile {
  tier: QualityTier;
  particleBudget: number;
  maxDpr: number;
  sfxVoices: number;
  allowShake: boolean;
}

export interface EffectSettings {
  ambientEffects: boolean;
  sceneMotion: boolean;
  textureDetail: boolean;
  screenShake: boolean;
}

const PROFILES: Record<QualityTier, QualityProfile> = {
  high: { tier: 'high', particleBudget: 400, maxDpr: 3, sfxVoices: 6, allowShake: true },
  mid: { tier: 'mid', particleBudget: 240, maxDpr: 2, sfxVoices: 5, allowShake: true },
  low: { tier: 'low', particleBudget: 120, maxDpr: 1.5, sfxVoices: 3, allowShake: false },
};

export class QualityService {
  private current: QualityTier = 'mid';
  private preference: QualityPreference = 'auto';
  private slowFrames = 0;
  private effects: EffectSettings = {
    ambientEffects: true,
    sceneMotion: true,
    textureDetail: true,
    screenShake: true,
  };
  reducedMotion = false;

  constructor(metrics: WindowMetrics) {
    this.detect(metrics);
  }

  private detect(metrics: WindowMetrics): void {
    const info = platform.getDeviceInfo();
    const level = typeof info.benchmarkLevel === 'number' ? info.benchmarkLevel : -1;

    if (level >= 30) this.current = 'high';
    else if (level >= 10) this.current = 'mid';
    else if (level >= 0) this.current = 'low';
    // 没有 benchmarkLevel（iOS / 开发者工具）时按设备尺寸保守估计
    else this.current = metrics.height >= 700 ? 'mid' : 'mid';
  }

  get profile(): QualityProfile {
    return PROFILES[this.current];
  }

  get tier(): QualityTier {
    return this.current;
  }

  setPreference(preference: QualityPreference | 'reduced'): void {
    if (preference === 'reduced') {
      this.reducedMotion = true;
      return;
    }
    this.reducedMotion = false;
    this.preference = preference;
    if (preference !== 'auto') this.current = preference;
  }

  get preferenceValue(): QualityPreference {
    return this.preference;
  }

  // 连续 90 帧偏慢就降一档，只降不升，避免抖动。
  reportFrame(ms: number): void {
    if (this.preference !== 'auto') return;
    if (ms > 22) this.slowFrames += 1;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);

    if (this.slowFrames >= 90) {
      this.slowFrames = 0;
      if (this.current === 'high') this.current = 'mid';
      else if (this.current === 'mid') this.current = 'low';
    }
  }

  get particleBudget(): number {
    if (this.reducedMotion) return 0;
    return this.profile.particleBudget;
  }

  get effectSettings(): EffectSettings {
    return this.effects;
  }

  setEffects(patch: Partial<EffectSettings>): void {
    this.effects = { ...this.effects, ...patch };
  }

  /** 首页环境粒子单独限额，避免和点击爆发抢光预算。 */
  get lobbyParticleBudget(): number {
    if (this.reducedMotion || !this.effects.ambientEffects) return 0;
    return Math.round(this.profile.particleBudget * 0.4);
  }

  get allowSceneMotion(): boolean {
    return !this.reducedMotion && this.effects.sceneMotion;
  }

  get allowTextureDetail(): boolean {
    return !this.reducedMotion && this.effects.textureDetail;
  }

  get allowScreenShake(): boolean {
    return !this.reducedMotion && this.effects.screenShake && this.profile.allowShake;
  }
}

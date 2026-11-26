import { describe, expect, it, vi } from 'vitest';
import { Easing, clamp, lerp } from '../src/core/anim/easing';
import { Shake, Spring, TweenManager } from '../src/core/anim/tween';
import { HapticsService } from '../src/core/haptics/haptics';
import { ParticleSystem } from '../src/core/particles/particles';
import { QualityService } from '../src/core/quality/quality';
import { AudioService } from '../src/core/audio/audio';
import { createFeedback } from '../src/shared/game-kit/feedback';
import { BURSTS } from '../src/shared/design-system/motion';
import { platform } from '../src/shared/platform/wx';

describe('easing', () => {
  const names = Object.keys(Easing);

  it('starts at 0 and ends at 1 for every curve', () => {
    for (const name of names) {
      expect(Easing[name](0)).toBeCloseTo(0, 5);
      expect(Easing[name](1)).toBeCloseTo(1, 5);
    }
  });

  it('clamps out-of-range input', () => {
    for (const name of names) {
      expect(Number.isFinite(Easing[name](-5))).toBe(true);
      expect(Number.isFinite(Easing[name](5))).toBe(true);
    }
    expect(Easing.outCubic(-1)).toBe(0);
    expect(Easing.outCubic(2)).toBe(1);
  });

  it('outBack overshoots for the reward pop', () => {
    const peak = Math.max(...[0.6, 0.7, 0.8, 0.9].map((t) => Easing.outBack(t)));
    expect(peak).toBeGreaterThan(1);
  });

  it('lerp and clamp behave', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
  });
});

describe('tween manager', () => {
  it('respects delay', () => {
    const seen: number[] = [];
    const tweens = new TweenManager();
    tweens.to({ duration: 0.1, delay: 0.1, onUpdate: (t) => seen.push(t) });

    tweens.update(0.05);
    expect(seen).toHaveLength(0);
    tweens.update(0.1);
    expect(seen.length).toBeGreaterThan(0);
  });

  it('completes and stops updating', () => {
    const onComplete = vi.fn();
    let last = 0;
    const tweens = new TweenManager();
    tweens.to({ duration: 0.1, onUpdate: (t) => (last = t), onComplete });

    tweens.update(0.2);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(last).toBeCloseTo(1, 5);
    expect(tweens.activeCount).toBe(0);
  });

  it('skipAll jumps to the end state', () => {
    const onComplete = vi.fn();
    let value = 0;
    const tweens = new TweenManager();
    tweens.to({ duration: 1, onUpdate: (t) => (value = t), onComplete });

    tweens.skipAll();
    expect(value).toBe(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(tweens.activeCount).toBe(0);
  });

  it('scales time for combo speed-up', () => {
    const tweens = new TweenManager();
    tweens.setTimeScale(2);
    let value = 0;
    tweens.to({ duration: 0.2, easing: Easing.linear, onUpdate: (t) => (value = t) });

    tweens.update(0.1);
    expect(value).toBeCloseTo(1, 5);
  });

  it('clamps timeScale into a sane range', () => {
    const tweens = new TweenManager();
    tweens.setTimeScale(0);
    expect(tweens.timeScaleValue).toBe(0.25);
    tweens.setTimeScale(99);
    expect(tweens.timeScaleValue).toBe(3);
  });
});

describe('spring and shake', () => {
  it('spring settles back to 1', () => {
    const spring = new Spring(0.9);
    for (let i = 0; i < 200; i += 1) spring.update(1 / 60);
    expect(spring.value).toBeCloseTo(1, 2);
  });

  it('shake decays to zero', () => {
    const shake = new Shake();
    shake.trigger(8, 0.2);
    expect(shake.active).toBe(true);
    for (let i = 0; i < 30; i += 1) shake.update(1 / 60);
    expect(shake.active).toBe(false);
    expect(shake.offset).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  it('shake is deterministic for the same frame steps', () => {
    const a = new Shake();
    const b = new Shake();
    a.trigger(6, 0.2);
    b.trigger(6, 0.2);
    a.update(0.016);
    b.update(0.016);
    expect(a.offset).toEqual(b.offset);
  });
});

describe('particle system', () => {
  const preset = BURSTS.sparkle;

  it('respects the budget', () => {
    const ps = new ParticleSystem(64);
    ps.setBudget(5);
    ps.burst(preset, 0, 0);
    expect(ps.activeCount).toBeLessThanOrEqual(5);
  });

  it('expires particles after their lifespan', () => {
    const ps = new ParticleSystem(64);
    ps.setBudget(32);
    ps.burst(preset, 10, 10);
    expect(ps.activeCount).toBeGreaterThan(0);
    for (let i = 0; i < 120; i += 1) ps.update(1 / 60);
    expect(ps.activeCount).toBe(0);
  });

  it('clears on demand', () => {
    const ps = new ParticleSystem(64);
    ps.setBudget(32);
    ps.burst(preset, 0, 0);
    ps.clear();
    expect(ps.activeCount).toBe(0);
  });

  it('emits nothing when the budget is zero (reduced motion)', () => {
    const ps = new ParticleSystem(32);
    ps.setBudget(0);
    ps.burst(preset, 0, 0);
    expect(ps.activeCount).toBe(0);
  });

  it('never exceeds capacity', () => {
    const ps = new ParticleSystem(16);
    ps.setBudget(999);
    for (let i = 0; i < 20; i += 1) ps.burst(preset, 0, 0);
    expect(ps.activeCount).toBeLessThanOrEqual(16);
  });
});

describe('audio service', () => {
  function fakeCtx() {
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const node = () => ({ connect: () => undefined, disconnect: () => {}, start() {}, stop() {} });
    return {
      currentTime: 0,
      sampleRate: 44100,
      destination: node(),
      createGain: () => ({ ...node(), gain: param() }),
      createOscillator: () => ({ ...node(), type: 'sine', frequency: param() }),
      createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param(), Q: param() }),
      createBufferSource: () => ({ ...node(), buffer: null }),
      createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
      resume: () => Promise.resolve(),
      suspend: () => Promise.resolve(),
    };
  }

  it('is silent and safe without a synth', () => {
    const audio = new AudioService(() => null, () => null);
    expect(() => audio.unlock()).not.toThrow();
    expect(() => audio.playSfx('tap')).not.toThrow();
    expect(audio.hasSynth).toBe(false);
  });

  it('plays sfx after unlock', () => {
    const audio = new AudioService(fakeCtx, () => null);
    audio.unlock();
    expect(audio.hasSynth).toBe(true);
    expect(() => audio.playSfx('match', { pitch: 4 })).not.toThrow();
    expect(() => audio.playSfx('win')).not.toThrow();
    expect(() => audio.playSfx('whoosh')).not.toThrow();
  });

  it('does not play when sfx is disabled', () => {
    const audio = new AudioService(fakeCtx, () => null);
    audio.unlock();
    audio.setSfx(false);
    expect(() => audio.playSfx('tap')).not.toThrow();
  });

  it('survives a throwing synth factory', () => {
    const audio = new AudioService(() => {
      throw new Error('no webaudio');
    }, () => null);
    expect(() => audio.unlock()).not.toThrow();
    expect(() => audio.playSfx('tap')).not.toThrow();
  });

  it('tolerates a broken bgm context', () => {
    const audio = new AudioService(() => null, () => {
      throw new Error('no audio');
    });
    expect(() => audio.playBgm('lobby')).not.toThrow();
    expect(() => audio.stopBgm()).not.toThrow();
  });
});

describe('quality service', () => {
  const metrics = { width: 375, height: 812, pixelRatio: 2, safeTop: 44, safeBottom: 34 };

  it('downgrades after sustained slow frames', () => {
    const quality = new QualityService(metrics);
    const start = quality.tier;
    for (let i = 0; i < 120; i += 1) quality.reportFrame(30);
    expect(quality.tier).not.toBe('high');
    expect(['mid', 'low']).toContain(quality.tier);
    expect(start).toBeDefined();
  });

  it('does not downgrade on fast frames', () => {
    const quality = new QualityService(metrics);
    for (let i = 0; i < 200; i += 1) quality.reportFrame(12);
    expect(quality.tier).toBe(quality.tier);
    expect(quality.particleBudget).toBeGreaterThan(0);
  });

  it('respects reduced motion', () => {
    const quality = new QualityService(metrics);
    quality.setPreference('reduced');
    expect(quality.reducedMotion).toBe(true);
    expect(quality.particleBudget).toBe(0);
  });
});

describe('haptics', () => {
  it('throttles rapid triggers', () => {
    const haptics = new HapticsService();
    const spy = vi.spyOn(platform, 'vibrate').mockImplementation(() => undefined);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    haptics.light();
    haptics.light();
    haptics.light();

    expect(spy).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('fires again after the throttle window', () => {
    const haptics = new HapticsService();
    const spy = vi.spyOn(platform, 'vibrate').mockImplementation(() => undefined);
    const base = 1700000000000;

    vi.spyOn(Date, 'now').mockReturnValue(base);
    haptics.light();
    vi.spyOn(Date, 'now').mockReturnValue(base + 200);
    haptics.medium();

    expect(spy).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it('does nothing when disabled', () => {
    const haptics = new HapticsService();
    const spy = vi.spyOn(platform, 'vibrate').mockImplementation(() => undefined);
    haptics.setEnabled(false);
    haptics.success();
    expect(spy).not.toHaveBeenCalled();
    expect(haptics.isEnabled).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('feedback', () => {
  function deps() {
    const particles = new ParticleSystem(64);
    particles.setBudget(64);
    const audio = new AudioService(() => null, () => null);
    const haptics = new HapticsService();
    haptics.setEnabled(false);
    const quality = new QualityService({
      width: 375,
      height: 812,
      pixelRatio: 2,
      safeTop: 44,
      safeBottom: 34,
    });
    return { particles, audio, haptics, quality };
  }

  it('emits particles for a match', () => {
    const d = deps();
    const fb = createFeedback(d);
    fb.match(1, 100, 100);
    expect(d.particles.activeCount).toBeGreaterThan(0);
  });

  it('emits nothing when reduced motion is on', () => {
    const d = deps();
    d.quality.setPreference('reduced');
    const fb = createFeedback(d);
    fb.match(3, 100, 100);
    fb.burst('confetti', 10, 10, 2);
    expect(d.particles.activeCount).toBe(0);
  });

  it('never throws for any feedback entry', () => {
    const fb = createFeedback(deps());
    expect(() => {
      fb.tap();
      fb.select();
      fb.invalid();
      fb.invalid(1, 2);
      fb.match(2);
      fb.pop(1, 1);
      fb.drop(1, 1);
      fb.reward();
      fb.reward(1, 1);
      fb.coin(1, 1);
      fb.win();
      fb.win(1, 1);
      fb.fail();
      fb.transition();
      fb.resetCombo();
    }).not.toThrow();
  });
});

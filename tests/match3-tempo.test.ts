import { describe, expect, it } from 'vitest';
import {
  TEMPO_MAX,
  TEMPO_WINDOW,
  createTempo,
  createTimer,
  formatClock,
  registerMatch,
  startTimer,
  tempoLabel,
  tempoMultiplier,
  tempoPitch,
  tickTimer,
  timerExpired,
  timerUrgency,
  updateTempo,
} from '../src/games/match3/systems/tempo';

describe('match3 tempo', () => {
  it('starts at step 1 and multiplies nothing', () => {
    const tempo = createTempo();
    expect(registerMatch(tempo, 0)).toBe(1);
    expect(tempoMultiplier(1)).toBe(1);
    expect(tempoPitch(1)).toBe(0);
    expect(tempoLabel(1)).toBe('节奏 ×1');
  });

  it('chains matches inside the 2 second window', () => {
    const tempo = createTempo();
    registerMatch(tempo, 0);
    expect(registerMatch(tempo, TEMPO_WINDOW - 0.1)).toBe(2);
    expect(tempoMultiplier(2)).toBeCloseTo(1.15, 5);
    expect(tempoPitch(2)).toBe(2);
    expect(registerMatch(tempo, TEMPO_WINDOW * 2 - 0.2)).toBe(3);
  });

  it('resets after the window expires', () => {
    const tempo = createTempo();
    registerMatch(tempo, 0);
    updateTempo(tempo, TEMPO_WINDOW + 0.01);
    expect(tempo.streak).toBe(0);
    expect(tempo.windowLeft).toBe(0);
    expect(registerMatch(tempo, TEMPO_WINDOW + 0.02)).toBe(1);
  });

  it('caps the streak and the multiplier', () => {
    const tempo = createTempo();
    let now = 0;
    for (let i = 1; i <= 10; i += 1) {
      now += 0.5;
      registerMatch(tempo, now);
    }
    expect(tempo.streak).toBe(TEMPO_MAX);
    expect(tempoMultiplier(tempo.streak)).toBeCloseTo(1.75, 5);
    expect(tempoPitch(tempo.streak)).toBe(10);
  });

  it('tracks the remaining window each frame', () => {
    const tempo = createTempo();
    registerMatch(tempo, 1);
    updateTempo(tempo, 2);
    expect(tempo.windowLeft).toBeCloseTo(1, 5);
    updateTempo(tempo, 3);
    expect(tempo.windowLeft).toBe(0);
  });
});

describe('match3 timer', () => {
  it('counts down only while running', () => {
    const timer = createTimer(10);
    tickTimer(timer, 2);
    expect(timer.remaining).toBe(10);

    startTimer(timer);
    tickTimer(timer, 2);
    expect(timer.remaining).toBe(8);
    expect(timer.elapsed).toBe(2);
    expect(timerExpired(timer)).toBe(false);
  });

  it('stops at zero and reports expiry', () => {
    const timer = createTimer(3);
    startTimer(timer);
    tickTimer(timer, 5);
    expect(timer.remaining).toBe(0);
    expect(timer.running).toBe(false);
    expect(timerExpired(timer)).toBe(true);
  });

  it('formats a ceiling clock', () => {
    expect(formatClock(180)).toBe('03:00');
    expect(formatClock(179.2)).toBe('03:00');
    expect(formatClock(9.2)).toBe('00:10');
    expect(formatClock(0)).toBe('00:00');
  });

  it('maps urgency thresholds', () => {
    expect(timerUrgency(31)).toBe('normal');
    expect(timerUrgency(30)).toBe('low');
    expect(timerUrgency(11)).toBe('low');
    expect(timerUrgency(10)).toBe('critical');
    expect(timerUrgency(0)).toBe('critical');
  });
});

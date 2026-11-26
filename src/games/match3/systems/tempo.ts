/**
 * 三消的「节奏」与倒计时纯逻辑。
 *
 * 与棋盘系统分开：棋盘只负责消除与连锁，这里只负责
 * 「跨操作 2 秒窗口」的倍率、音高，以及一局的倒计时状态，
 * 便于无头测试与调参。
 */

export const TEMPO_WINDOW = 2;
export const TEMPO_MAX = 6;
export const TEMPO_STEP = 0.15;
export const TEMPO_PITCH_STEP = 2;
export const TEMPO_PITCH_MAX = 12;

export interface TempoState {
  streak: number;
  lastMatchAt: number;
  windowLeft: number;
}

export type TimerUrgency = 'normal' | 'low' | 'critical';

export interface RoundTimer {
  total: number;
  remaining: number;
  elapsed: number;
  running: boolean;
}

export function createTempo(): TempoState {
  return { streak: 0, lastMatchAt: 0, windowLeft: 0 };
}

export function clearTempo(state: TempoState): void {
  state.streak = 0;
  state.lastMatchAt = 0;
  state.windowLeft = 0;
}

/**
 * 成功交换时调用：距离上次成功交换 ≤ TEMPO_WINDOW 就升一档。
 * 返回本次生效的档位（1–6）。
 */
export function registerMatch(state: TempoState, now: number): number {
  const chained = state.streak > 0 && now - state.lastMatchAt <= TEMPO_WINDOW;
  state.streak = chained ? Math.min(state.streak + 1, TEMPO_MAX) : 1;
  state.lastMatchAt = now;
  state.windowLeft = TEMPO_WINDOW;
  return state.streak;
}

/** 每帧推进窗口；超过 2 秒后档位归零。 */
export function updateTempo(state: TempoState, now: number): void {
  if (state.streak <= 0) {
    state.windowLeft = 0;
    return;
  }
  state.windowLeft = Math.max(0, TEMPO_WINDOW - (now - state.lastMatchAt));
  if (state.windowLeft <= 0) state.streak = 0;
}

export function tempoMultiplier(streak: number): number {
  const clamped = Math.min(Math.max(streak, 1), TEMPO_MAX);
  return 1 + TEMPO_STEP * (clamped - 1);
}

export function tempoPitch(streak: number): number {
  const clamped = Math.min(Math.max(streak, 1), TEMPO_MAX);
  return Math.min(TEMPO_PITCH_MAX, (clamped - 1) * TEMPO_PITCH_STEP);
}

export function tempoLabel(streak: number): string {
  return `节奏 ×${Number(tempoMultiplier(streak).toFixed(2))}`;
}

export function createTimer(total: number): RoundTimer {
  const safeTotal = Math.max(1, Math.round(total));
  return { total: safeTotal, remaining: safeTotal, elapsed: 0, running: false };
}

export function startTimer(timer: RoundTimer): void {
  timer.running = true;
}

export function stopTimer(timer: RoundTimer): void {
  timer.running = false;
}

/** 只在 running 时递减；归零后自动停止。 */
export function tickTimer(timer: RoundTimer, dt: number): void {
  if (!timer.running) return;
  const step = Math.max(0, dt);
  timer.elapsed += step;
  timer.remaining = Math.max(0, timer.remaining - step);
  if (timer.remaining <= 0) timer.running = false;
}

export function timerExpired(timer: RoundTimer): boolean {
  return timer.remaining <= 0;
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function timerUrgency(seconds: number): TimerUrgency {
  if (seconds <= 10) return 'critical';
  if (seconds <= 30) return 'low';
  return 'normal';
}

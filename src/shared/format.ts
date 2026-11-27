/**
 * 展示层的数字格式：玩法数值本身不动，只在 UI 上压缩位数，
 * 避免「无时间限制」打一小时后分数把卡片撑爆。
 */

const WAN = 10_000;
const YI = 100_000_000;

function oneDecimal(value: number): string {
  if (value >= 100) return `${Math.round(value)}`;
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

/** 9999 → 9999；12 345 → 1.2万；1 234 567 → 123万；1.2e9 → 12亿。 */
export function compactNumber(value: number): string {
  const amount = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  if (amount >= YI) return `${oneDecimal(amount / YI)}亿`;
  if (amount >= WAN) return `${oneDecimal(amount / WAN)}万`;
  return `${amount}`;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/** 秒数 → 03:07 / 1:03:07。 */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(rest)}`;
  return `${pad2(minutes)}:${pad2(rest)}`;
}

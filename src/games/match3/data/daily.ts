import { hashString } from '../../../core/rng';

export const DAILY_MOVES = 20;
export const DAILY_TARGET = 1500;

export function dailySeed(date: string): number {
  return hashString(`${date}:match3:daily`);
}

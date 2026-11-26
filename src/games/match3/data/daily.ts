import { hashString } from '../../../core/rng';

export const DAILY_SECONDS = 180;
export const DAILY_TARGET = 4000;

export function dailySeed(date: string): number {
  return hashString(`${date}:match3:daily`);
}

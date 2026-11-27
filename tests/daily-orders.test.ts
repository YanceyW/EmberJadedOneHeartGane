import { describe, expect, it } from 'vitest';
import {
  DAILY_ORDER_COUNT,
  DAILY_ORDERS,
  DAILY_CLEAR_COINS,
  dailyOrderValue,
  dayKey,
  findDailyOrder,
  pickDailyOrders,
} from '../src/shared/content/daily-orders';
import { ProfileService, ProfileStorage } from '../src/core/profile';

class MemoryStorage implements ProfileStorage {
  private readonly map = new Map<string, unknown>();
  get<T>(key: string, fallback: T): T {
    return (this.map.has(key) ? this.map.get(key) : fallback) as T;
  }
  set<T>(key: string, value: T): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
}

describe('daily orders', () => {
  it('formats a stable local day key', () => {
    expect(dayKey(new Date(2026, 10, 27, 9, 30).getTime())).toBe('2026-11-27');
  });

  it('picks the same three orders for the same day', () => {
    const first = pickDailyOrders('2026-11-27').map((order) => order.id);
    const second = pickDailyOrders('2026-11-27').map((order) => order.id);
    expect(first).toEqual(second);
    expect(first).toHaveLength(DAILY_ORDER_COUNT);
    expect(new Set(first).size).toBe(DAILY_ORDER_COUNT);
  });

  it('changes the lineup between days', () => {
    const a = pickDailyOrders('2026-11-27').map((order) => order.id);
    const b = pickDailyOrders('2026-11-28').map((order) => order.id);
    expect(a.join(',')).not.toBe(b.join(','));
  });

  it('keeps rewards close to the goods value', () => {
    for (const order of DAILY_ORDERS) {
      const value = dailyOrderValue(order);
      expect(order.coins).toBeGreaterThanOrEqual(value);
      expect(order.coins).toBeLessThanOrEqual(value * 1.5);
      for (const need of order.needs) {
        expect(findDailyOrder(order.id)).toBe(order);
        expect(need.amount).toBeGreaterThan(0);
      }
    }
  });
});

describe('daily claim state', () => {
  const now = new Date(2026, 10, 27, 10, 0).getTime();

  it('refuses nothing until the player claims, and resets on a new day', () => {
    const profile = new ProfileService(new MemoryStorage());
    const state = profile.dailySync(now);
    expect(state.date).toBe('2026-11-27');
    expect(state.claimed).toEqual([]);

    profile.markDailyClaimed('market-greens', now);
    expect(profile.dailySync(now).claimed).toEqual(['market-greens']);

    const nextDay = new Date(2026, 10, 28, 10, 0).getTime();
    expect(profile.dailySync(nextDay).claimed).toEqual([]);
  });

  it('counts a streak only after clearing all three orders', () => {
    const profile = new ProfileService(new MemoryStorage());
    const orders = pickDailyOrders('2026-11-27');
    profile.markDailyClaimed(orders[0].id, now);
    expect(profile.dailySync(now).streak).toBe(0);
    profile.markDailyClaimed(orders[1].id, now);
    profile.markDailyClaimed(orders[2].id, now);
    expect(profile.dailySync(now).streak).toBe(1);

    const nextDay = new Date(2026, 10, 28, 10, 0).getTime();
    const nextOrders = pickDailyOrders('2026-11-28');
    profile.markDailyClaimed(nextOrders[0].id, nextDay);
    profile.markDailyClaimed(nextOrders[1].id, nextDay);
    profile.markDailyClaimed(nextOrders[2].id, nextDay);
    expect(profile.dailySync(nextDay).streak).toBe(2);
    expect(DAILY_CLEAR_COINS).toBeGreaterThan(0);
  });
});

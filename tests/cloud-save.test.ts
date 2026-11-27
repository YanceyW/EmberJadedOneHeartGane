import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudSaveService, CloudCaller } from '../src/core/cloud/cloud-save';
import { StorageService } from '../src/core/storage/storage';
import { defaultSave, Match3Save, mergeSaves } from '../src/games/match3/systems/save';

function fakeStorage(): StorageService {
  const data = new Map<string, string>();
  const storage = {
    get<T>(key: string, fallback: T): T {
      const raw = data.get(key);
      if (raw === undefined) return fallback;
      return JSON.parse(raw) as T;
    },
    set<T>(key: string, value: T): void {
      data.set(key, JSON.stringify(value));
    },
    remove(key: string): void {
      data.delete(key);
    },
    clear(): void {
      data.clear();
    },
  };
  return storage as unknown as StorageService;
}

function fakeCloud(online: boolean, responses: unknown[]): CloudCaller & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    online,
    calls,
    async call<T>(_name: string, data?: Record<string, unknown>): Promise<T | null> {
      calls.push(data);
      const next = responses.shift();
      return (next ?? null) as T | null;
    },
  };
}

describe('mergeSaves', () => {
  it('keeps the larger progress from both sides', () => {
    const local: Match3Save = {
      ...defaultSave(),
      bestScore: 900,
      wins: 2,
      unlockedLevel: 3,
      stars: { '1': 3, '2': 1 },
      endlessBest: 2400,
    };
    const remote: Match3Save = {
      ...defaultSave(),
      bestScore: 1200,
      wins: 5,
      unlockedLevel: 4,
      stars: { '1': 2, '2': 3, '3': 3 },
      endlessBest: 3100,
    };

    const merged = mergeSaves(local, remote);

    expect(merged.bestScore).toBe(1200);
    expect(merged.wins).toBe(5);
    expect(merged.unlockedLevel).toBe(4);
    expect(merged.stars).toEqual({ '1': 3, '2': 3, '3': 3 });
    expect(merged.endlessBest).toBe(3100);
  });

  it('keeps the endless best across devices', () => {
    const local: Match3Save = { ...defaultSave(), endlessBest: 2000 };
    const remote: Match3Save = { ...defaultSave(), endlessBest: 1200 };

    const merged = mergeSaves(local, remote);

    expect(merged.endlessBest).toBe(2000);
  });
});

describe('cloud save service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('skips the network when offline', async () => {
    const cloud = fakeCloud(false, []);
    const service = new CloudSaveService(cloud, fakeStorage());

    const outcome = await service.syncGame('match3', defaultSave(), mergeSaves);

    expect(outcome.synced).toBe(false);
    expect(cloud.calls).toHaveLength(0);
  });

  it('stores the revision on a clean push', async () => {
    const storage = fakeStorage();
    const cloud = fakeCloud(true, [{ revision: 4, data: defaultSave() }]);
    const service = new CloudSaveService(cloud, storage);

    const outcome = await service.syncGame('match3', defaultSave(), mergeSaves);

    expect(outcome.synced).toBe(true);
    expect(storage.get('cloud:revision:match3', 0)).toBe(4);
    expect(cloud.calls).toHaveLength(1);
  });

  it('merges and re-pushes when the server reports a conflict', async () => {
    const storage = fakeStorage();
    storage.set('cloud:revision:match3', 2);

    const remote: Match3Save = { ...defaultSave(), bestScore: 1500, unlockedLevel: 5 };
    const cloud = fakeCloud(true, [
      { revision: 7, data: remote, conflict: true },
      { revision: 8, data: remote },
    ]);
    const service = new CloudSaveService(cloud, storage);

    const local: Match3Save = { ...defaultSave(), bestScore: 300, stars: { '1': 3 } };
    const outcome = await service.syncGame('match3', local, mergeSaves);

    expect(outcome.data.bestScore).toBe(1500);
    expect(outcome.data.stars).toEqual({ '1': 3 });
    expect(storage.get('cloud:revision:match3', 0)).toBe(8);
    expect(cloud.calls).toHaveLength(2);
  });

  it('keeps local data when the call fails', async () => {
    const cloud = fakeCloud(true, [{ error: 'invalid data' }]);
    const service = new CloudSaveService(cloud, fakeStorage());
    const local = { ...defaultSave(), bestScore: 42 };

    const outcome = await service.syncGame('match3', local, mergeSaves);

    expect(outcome.synced).toBe(false);
    expect(outcome.data.bestScore).toBe(42);
  });
});

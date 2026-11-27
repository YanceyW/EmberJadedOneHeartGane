import {
  COIN_CAP,
  COIN_INTERVAL_MS,
  FISH_ORDERS,
  FISH_TYPES,
  MATURE_FEEDS,
  TANK_SLOTS,
  findFishType,
} from '../data/fish';

export interface TankFish {
  typeId: string;
  feeds: number;
  lastCollectedAt: number;
}

export interface AquariumSave {
  schemaVersion: 1;
  fish: Array<TankFish | null>;
  orderIndex: number;
  totalFeeds: number;
  totalCoins: number;
}

export function createAquariumSave(): AquariumSave {
  return {
    schemaVersion: 1,
    fish: new Array<TankFish | null>(TANK_SLOTS).fill(null),
    orderIndex: 0,
    totalFeeds: 0,
    totalCoins: 0,
  };
}

export function migrateAquariumSave(input: unknown): AquariumSave {
  const defaults = createAquariumSave();
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;
  const fish = new Array<TankFish | null>(TANK_SLOTS).fill(null);
  if (Array.isArray(raw.fish)) {
    for (let i = 0; i < TANK_SLOTS; i += 1) {
      const item = raw.fish[i];
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      if (typeof entry.typeId !== 'string' || !findFishType(entry.typeId)) continue;
      fish[i] = {
        typeId: entry.typeId,
        feeds:
          typeof entry.feeds === 'number' && Number.isFinite(entry.feeds)
            ? Math.max(0, Math.min(MATURE_FEEDS, Math.floor(entry.feeds)))
            : 0,
        lastCollectedAt:
          typeof entry.lastCollectedAt === 'number' && Number.isFinite(entry.lastCollectedAt)
            ? entry.lastCollectedAt
            : Date.now(),
      };
    }
  }

  return {
    schemaVersion: 1,
    fish,
    orderIndex:
      typeof raw.orderIndex === 'number' && Number.isFinite(raw.orderIndex)
        ? Math.max(0, Math.floor(raw.orderIndex)) % FISH_ORDERS.length
        : 0,
    totalFeeds: finite(raw.totalFeeds),
    totalCoins: finite(raw.totalCoins),
  };
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function isMature(fish: TankFish): boolean {
  return fish.feeds >= MATURE_FEEDS;
}

export function matureCount(save: AquariumSave): number {
  return save.fish.reduce((count, fish) => count + (fish && isMature(fish) ? 1 : 0), 0);
}

export function addFish(save: AquariumSave, typeId: string, now: number): number | null {
  if (!findFishType(typeId)) return null;
  const index = save.fish.findIndex((fish) => fish === null);
  if (index < 0) return null;
  save.fish[index] = { typeId, feeds: 0, lastCollectedAt: now };
  return index;
}

export function feedFish(
  save: AquariumSave,
  index: number,
  now: number,
): 'ok' | 'mature' | 'idle' {
  const fish = save.fish[index];
  if (!fish) return 'idle';
  if (isMature(fish)) return 'idle';
  fish.feeds += 1;
  save.totalFeeds += 1;
  if (isMature(fish)) fish.lastCollectedAt = now;
  return isMature(fish) ? 'mature' : 'ok';
}

/** 成熟鱼每 15 秒产 1 币，最多攒 20 币；离线也按真实时间计算。 */
export function pendingFishCoins(fish: TankFish, now: number): number {
  if (!isMature(fish)) return 0;
  const elapsed = Math.max(0, now - fish.lastCollectedAt);
  return Math.min(COIN_CAP, Math.floor(elapsed / COIN_INTERVAL_MS));
}

export function collectFishCoins(
  save: AquariumSave,
  index: number,
  now: number,
): number {
  const fish = save.fish[index];
  if (!fish) return 0;
  const coins = pendingFishCoins(fish, now);
  if (coins <= 0) return 0;
  fish.lastCollectedAt += coins * COIN_INTERVAL_MS;
  save.totalCoins += coins;
  return coins;
}

export function collectAllCoins(save: AquariumSave, now: number): number {
  let total = 0;
  for (let i = 0; i < save.fish.length; i += 1) total += collectFishCoins(save, i, now);
  return total;
}

export function currentFishOrder(save: AquariumSave) {
  return FISH_ORDERS[save.orderIndex % FISH_ORDERS.length];
}

export function canFulfillFishOrder(save: AquariumSave): boolean {
  return matureCount(save) >= currentFishOrder(save).mature;
}

export function fulfillFishOrder(
  save: AquariumSave,
): { coins: number; prosperity: number } | null {
  if (!canFulfillFishOrder(save)) return null;
  const order = currentFishOrder(save);
  save.orderIndex = (save.orderIndex + 1) % FISH_ORDERS.length;
  save.totalCoins += order.coins;
  return { coins: order.coins, prosperity: order.prosperity };
}

export function fishTypeIds(): string[] {
  return FISH_TYPES.map((fish) => fish.id);
}

export function aquariumScore(save: AquariumSave): number {
  return save.totalFeeds * 5 + save.totalCoins + matureCount(save) * 40;
}

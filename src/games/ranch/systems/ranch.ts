import { findIngredient } from '../../../shared/content/ingredients';
import {
  FEED_BUY_COST,
  FEED_ID,
  RANCH_MAX_PER_PEN,
  RANCH_SPECIES,
  RanchSpeciesDef,
  findSpecies,
} from '../data/animals';

export type RanchPenState = 'empty' | 'hungry' | 'producing' | 'ready';

export interface RanchPen {
  species: string;
  count: number;
  /** 0 = 待喂食；>0 = 这一时刻产出。 */
  readyAt: number;
}

export interface RanchSave {
  schemaVersion: 2;
  pens: RanchPen[];
  totalProducts: number;
  totalFeeds: number;
  totalCoins: number;
  /** 第一次进牧场送 2 份饲料，避免 0 币 0 饲料时无计可施。 */
  starterFeedGiven: boolean;
}

export type RanchStore = Record<string, number>;

function defaultPens(): RanchPen[] {
  return RANCH_SPECIES.map((species) => ({
    species: species.id,
    count: species.id === 'chicken' ? 1 : 0,
    readyAt: 0,
  }));
}

export function createRanchSave(): RanchSave {
  return {
    schemaVersion: 2,
    pens: defaultPens(),
    totalProducts: 0,
    totalFeeds: 0,
    totalCoins: 0,
    starterFeedGiven: false,
  };
}

export function migrateRanchSave(input: unknown): RanchSave {
  const defaults = createRanchSave();
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;
  const rawPens = Array.isArray(raw.pens) ? raw.pens : [];
  const pens = defaultPens();
  for (const item of rawPens) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    if (typeof value.species !== 'string') continue;
    const species = findSpecies(value.species);
    if (!species) continue;
    const pen = pens.find((entry) => entry.species === species.id);
    if (!pen) continue;
    const count =
      typeof value.count === 'number' && Number.isFinite(value.count)
        ? Math.max(0, Math.min(RANCH_MAX_PER_PEN, Math.floor(value.count)))
        : pen.count;
    const readyAt =
      typeof value.readyAt === 'number' && Number.isFinite(value.readyAt)
        ? Math.max(0, Math.floor(value.readyAt))
        : 0;
    pen.count = count;
    pen.readyAt = count > 0 ? readyAt : 0;
  }

  const totalFeeds = finite(raw.totalFeeds);
  return {
    schemaVersion: 2,
    pens,
    totalProducts: finite(raw.totalProducts),
    totalFeeds,
    totalCoins: finite(raw.totalCoins),
    // v1 里已经喂过食的存档不再补送，避免重复领。
    starterFeedGiven: raw.starterFeedGiven === true || totalFeeds > 0,
  };
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export function penState(save: RanchSave, index: number, now: number): RanchPenState {
  const pen = save.pens[index];
  if (!pen || pen.count <= 0) return 'empty';
  if (pen.readyAt <= 0) return 'hungry';
  return now >= pen.readyAt ? 'ready' : 'producing';
}

export function remainingSeconds(save: RanchSave, index: number, now: number): number {
  const pen = save.pens[index];
  if (!pen || pen.readyAt <= 0) return 0;
  return Math.max(0, Math.ceil((pen.readyAt - now) / 1000));
}

export function feedNeed(save: RanchSave, index: number): number {
  return Math.max(0, save.pens[index]?.count ?? 0);
}

export function feedBuyCost(save: RanchSave, index: number): number {
  return feedNeed(save, index) * FEED_BUY_COST;
}

export type FeedResult = 'ok' | 'empty' | 'busy' | 'missing';

/** 用仓库饲料喂整栏动物，开一次产出。 */
export function feedPen(
  save: RanchSave,
  index: number,
  store: RanchStore,
  now: number,
): FeedResult {
  const state = penState(save, index, now);
  if (state === 'empty') return 'empty';
  if (state !== 'hungry') return 'busy';
  const count = feedNeed(save, index);
  if ((store[FEED_ID] ?? 0) < count) return 'missing';
  store[FEED_ID] = Math.max(0, (store[FEED_ID] ?? 0) - count);
  save.pens[index].readyAt = now + productionMs(save, index);
  save.totalFeeds += count;
  return 'ok';
}

/** 没有饲料时花币应急，直接开产出。 */
export function startWithCoins(save: RanchSave, index: number, now: number): boolean {
  if (penState(save, index, now) !== 'hungry') return false;
  save.pens[index].readyAt = now + productionMs(save, index);
  save.totalFeeds += feedNeed(save, index);
  return true;
}

function productionMs(save: RanchSave, index: number): number {
  const species = findSpecies(save.pens[index]?.species ?? '');
  return (species?.produceSeconds ?? 30) * 1000;
}

export interface RanchCollect {
  species: RanchSpeciesDef;
  product: string;
  amount: number;
  coins: number;
}

/** 收取整栏产物，动物回到待喂食状态。 */
export function collectPen(
  save: RanchSave,
  index: number,
  store: RanchStore,
  now: number,
): RanchCollect | null {
  if (penState(save, index, now) !== 'ready') return null;
  const pen = save.pens[index];
  const species = findSpecies(pen.species);
  if (!species) return null;
  const amount = Math.max(1, pen.count);
  store[species.product] = Math.min(999, (store[species.product] ?? 0) + amount);
  pen.readyAt = 0;
  save.totalProducts += amount;
  const coins = (findIngredient(species.product)?.sellPrice ?? 0) * amount;
  save.totalCoins += coins;
  return { species, product: species.product, amount, coins };
}

export type BuyAnimalResult = 'ok' | 'full' | 'missing';

export function buyAnimal(save: RanchSave, index: number): BuyAnimalResult {
  const pen = save.pens[index];
  if (!pen || !findSpecies(pen.species)) return 'missing';
  if (pen.count >= RANCH_MAX_PER_PEN) return 'full';
  pen.count += 1;
  return 'ok';
}

export function animalCost(save: RanchSave, index: number): number | null {
  const pen = save.pens[index];
  const species = pen ? findSpecies(pen.species) : undefined;
  if (!species || pen.count >= RANCH_MAX_PER_PEN) return null;
  // 同栏每多一只，价格略涨，避免一口气把栏塞满。
  return species.buyCost + pen.count * Math.round(species.buyCost * 0.15);
}

export function ranchScore(save: RanchSave): number {
  return save.totalProducts * 25 + save.totalFeeds * 2;
}

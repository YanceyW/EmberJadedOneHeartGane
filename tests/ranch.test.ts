import { describe, expect, it } from 'vitest';
import {
  FEED_ID,
  RANCH_MAX_PER_PEN,
  RANCH_SPECIES,
} from '../src/games/ranch/data/animals';
import {
  animalCost,
  buyAnimal,
  collectPen,
  createRanchSave,
  feedBuyCost,
  feedPen,
  migrateRanchSave,
  penState,
  ranchScore,
  remainingSeconds,
  startWithCoins,
} from '../src/games/ranch/systems/ranch';

describe('ranch systems', () => {
  it('migrates invalid saves into four safe pens', () => {
    const save = migrateRanchSave({ pens: [{ species: 'ghost', count: 99 }], totalProducts: -1 });
    expect(save.schemaVersion).toBe(2);
    expect(save.starterFeedGiven).toBe(false);
    expect(save.pens).toHaveLength(RANCH_SPECIES.length);
    expect(save.pens[0]).toEqual({ species: 'chicken', count: 1, readyAt: 0 });
    expect(save.pens[1].count).toBe(0);
    expect(save.totalProducts).toBe(0);
  });

  it('clamps saved pens to the max herd size', () => {
    const save = migrateRanchSave({
      pens: [{ species: 'pig', count: 99, readyAt: 123 }],
    });
    const pig = save.pens.find((pen) => pen.species === 'pig');
    expect(pig?.count).toBe(RANCH_MAX_PER_PEN);
    expect(pig?.readyAt).toBe(123);
  });

  it('feeds a herd, waits, then collects products into the pantry', () => {
    const save = createRanchSave();
    const store: Record<string, number> = { [FEED_ID]: 2 };
    const now = 1_700_000_000_000;
    expect(penState(save, 0, now)).toBe('hungry');
    expect(collectPen(save, 0, store, now)).toBeNull();
    expect(feedPen(save, 0, store, now)).toBe('ok');
    expect(store[FEED_ID]).toBe(1);
    expect(penState(save, 0, now)).toBe('producing');
    expect(remainingSeconds(save, 0, now)).toBe(26);
    expect(collectPen(save, 0, store, now + 10_000)).toBeNull();
    const result = collectPen(save, 0, store, now + 30_000);
    expect(result?.product).toBe('egg');
    expect(result?.amount).toBe(1);
    expect(store.egg).toBe(1);
    expect(penState(save, 0, now + 30_000)).toBe('hungry');
    expect(save.totalProducts).toBe(1);
    expect(save.totalFeeds).toBe(1);
  });

  it('does not re-grant starter feed to a progressed v1 save', () => {
    const save = migrateRanchSave({ totalFeeds: 3, totalProducts: 2 });
    expect(save.starterFeedGiven).toBe(true);
    const fresh = migrateRanchSave({});
    expect(fresh.starterFeedGiven).toBe(false);
  });

  it('reports missing feed and supports the coin emergency path', () => {
    const save = createRanchSave();
    const store: Record<string, number> = {};
    const now = 1_700_000_000_000;
    expect(feedPen(save, 0, store, now)).toBe('missing');
    expect(feedBuyCost(save, 0)).toBeGreaterThan(0);
    expect(startWithCoins(save, 0, now)).toBe(true);
    expect(penState(save, 0, now)).toBe('producing');
    expect(startWithCoins(save, 0, now)).toBe(false);
  });

  it('sells more animals up to the pen cap and raises the price', () => {
    const save = createRanchSave();
    const first = animalCost(save, 1);
    expect(first).toBe(260);
    expect(buyAnimal(save, 1)).toBe('ok');
    expect(save.pens[1].count).toBe(1);
    const second = animalCost(save, 1);
    expect(second).toBeGreaterThan(first!);
    while (save.pens[1].count < RANCH_MAX_PER_PEN) {
      expect(buyAnimal(save, 1)).toBe('ok');
    }
    expect(buyAnimal(save, 1)).toBe('full');
    expect(animalCost(save, 1)).toBeNull();
    save.totalProducts = 3;
    expect(ranchScore(save)).toBeGreaterThan(0);
  });

  it('starts with one chicken and keeps one pen per species', () => {
    const save = createRanchSave();
    expect(save.pens.map((pen) => pen.species)).toEqual(
      RANCH_SPECIES.map((species) => species.id),
    );
    expect(save.pens.filter((pen) => pen.count > 0)).toHaveLength(1);
    expect(save.pens[0].species).toBe('chicken');
  });
});

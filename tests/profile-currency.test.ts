import { describe, expect, it } from 'vitest';
import {
  ProfileService,
  ProfileStorage,
  createDefaultProfile,
  migrateProfile,
} from '../src/core/profile';
import {
  buyOrEquipIcon,
  buyOrEquipOutfit,
  buyOrEquipStyle,
  buyOrEquipTile,
  nextBuildCost,
  selectBuildTrackLevel,
  selectWeather,
  upgradeBuildTrack,
  BUILD_TRACKS,
} from '../src/lobby/shop';
import { PLAYER_NAME_PREFIX } from '../src/shared/content/player-names';

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

describe('profile v8', () => {
  it('creates a default unique-style name and starting cosmetics', () => {
    const profile = createDefaultProfile(1700000000000, 'player-test');
    expect(profile.schemaVersion).toBe(8);
    expect(profile.displayName.startsWith(PLAYER_NAME_PREFIX)).toBe(true);
    expect(profile.coins).toBe(0);
    expect(profile.ingredientUnlocks).toEqual([]);
    expect(profile.cosmetics.ownedIcons).toContain('candy');
    expect(profile.cosmetics.ownedOutfits).toContain('classic');
    expect(profile.cosmetics.weather).toBe('clear');
    expect(profile.cosmetics.style).toBe('classic');
    expect(profile.cosmetics.ownedStyles).toContain('classic');
    expect(profile.cosmetics.tileStyle).toBe('sweets');
    expect(profile.cosmetics.ownedTiles).toEqual(['sweets']);
    expect(profile.cosmetics.buildMax.fountain).toBe(0);
    expect(profile.settings.quality).toBe('auto');
    expect(profile.settings.ambientEffects).toBe(true);
    expect(profile.settings.performanceMode).toBe(false);
  });

  it('migrates stardust to coins and preserves progress', () => {
    const profile = migrateProfile({
      schemaVersion: 1,
      stardust: 345,
      prosperity: 12,
      settings: { music: false, quality: 'low', ambientEffects: false },
    });
    expect(profile.schemaVersion).toBe(8);
    expect(profile.coins).toBe(345);
    expect(profile.prosperity).toBe(12);
    expect(profile.settings.music).toBe(false);
    expect(profile.settings.quality).toBe('low');
    expect(profile.settings.ambientEffects).toBe(false);
    expect(profile.settings.sceneMotion).toBe(true);
    expect(profile.displayName.startsWith(PLAYER_NAME_PREFIX)).toBe(true);
  });

  it('falls back to safe visual defaults for unknown settings', () => {
    const profile = migrateProfile({ schemaVersion: 2, settings: { quality: 'ultra' } });
    expect(profile.settings.quality).toBe('auto');
    expect(profile.settings.textureDetail).toBe(true);
    expect(profile.settings.screenShake).toBe(true);
  });

  it('migrates old build levels into owned levels and defaults the new cosmetics', () => {
    const profile = migrateProfile({
      schemaVersion: 3,
      cosmetics: { build: { fountain: 2, lights: 1, garden: 3 } },
    });
    expect(profile.cosmetics.build).toEqual({ fountain: 2, lights: 1, garden: 3 });
    expect(profile.cosmetics.buildMax).toEqual({ fountain: 2, lights: 1, garden: 3 });
    expect(profile.cosmetics.weather).toBe('clear');
    expect(profile.cosmetics.style).toBe('classic');
    expect(profile.cosmetics.ownedStyles).toEqual(['classic']);
    expect(profile.cosmetics.tileStyle).toBe('sweets');
    expect(profile.cosmetics.ownedTiles).toEqual(['sweets']);
  });

  it('adds and spends coins without going negative', () => {
    const service = new ProfileService(new MemoryStorage());
    service.addCoins(100);
    expect(service.get().coins).toBe(100);
    expect(service.spendCoins(30)).toBe(true);
    expect(service.get().coins).toBe(70);
    expect(service.spendCoins(999)).toBe(false);
    expect(service.get().coins).toBe(70);

    expect(service.loseCoins(25)).toBe(25);
    expect(service.get().coins).toBe(45);
    expect(service.loseCoins(999)).toBe(45);
    expect(service.get().coins).toBe(0);
    expect(service.loseCoins(-5)).toBe(0);
  });

  it('records ingredient unlocks when goods enter the shared pantry', () => {
    const service = new ProfileService(new MemoryStorage());
    expect(service.ingredientUnlocked('wheat')).toBe(false);
    service.addPantry('wheat', 1);
    expect(service.ingredientUnlocked('wheat')).toBe(true);
    service.markIngredient('egg');
    expect(service.ingredientUnlocked('egg')).toBe(true);
    expect(service.get().ingredientUnlocks).toEqual(['wheat', 'egg']);
    service.addPantry('wheat', 3);
    expect(service.get().ingredientUnlocks).toEqual(['wheat', 'egg']);
    service.markIngredient('unknown');
    expect(service.get().ingredientUnlocks).toEqual(['wheat', 'egg']);
  });

  it('migrates pantry and old ranch progress into ingredient unlocks', () => {
    const fromPantry = migrateProfile({
      schemaVersion: 7,
      pantry: { wheat: 2, tomato: 1, flour: 4 },
    });
    expect(fromPantry.ingredientUnlocks).toEqual(['wheat', 'tomato', 'flour']);

    const fromRanch = migrateProfile({
      schemaVersion: 7,
      cosmetics: { ownedTiles: ['sweets', 'ranch'] },
    });
    expect(fromRanch.ingredientUnlocks).toEqual(['egg', 'milk']);

    const explicit = migrateProfile({
      schemaVersion: 7,
      ingredientUnlocks: ['wheat', 'ghost', 'wheat'],
    });
    expect(explicit.ingredientUnlocks).toEqual(['wheat']);
  });

  it('keeps one shared pantry for every venue', () => {
    const service = new ProfileService(new MemoryStorage());
    service.addPantry('wheat', 2);
    service.addPantry('wheat', 1);
    expect(service.pantryCount('wheat')).toBe(3);
    service.addPantry('unknown', 5);
    expect(service.pantryCount('unknown')).toBe(0);

    expect(service.takePantry([{ id: 'wheat', amount: 4 }])).toBe(false);
    expect(service.pantryCount('wheat')).toBe(3);
    expect(service.takePantry([{ id: 'wheat', amount: 2 }])).toBe(true);
    expect(service.pantryCount('wheat')).toBe(1);

    for (let i = 0; i < 1200; i += 1) service.addPantry('flour', 1);
    expect(service.pantryCount('flour')).toBe(999);
  });

  it('sanitizes pantry data from old saves', () => {
    const profile = migrateProfile({
      schemaVersion: 5,
      pantry: { wheat: 4, flour: -2, mystery: 9, bread: '3' },
    });
    expect(profile.pantry).toEqual({ wheat: 4 });
  });

  it('upgrades build tracks up to level 3 and lets players switch owned levels', () => {
    const service = new ProfileService(new MemoryStorage());
    service.addCoins(2000);
    const track = BUILD_TRACKS[0];
    for (let i = 0; i < 3; i += 1) {
      expect(upgradeBuildTrack(service, track.id)).toBe('bought');
    }
    expect(service.get().cosmetics.build.fountain).toBe(3);
    expect(service.get().cosmetics.buildMax.fountain).toBe(3);
    expect(upgradeBuildTrack(service, track.id)).toBe('maxed');
    expect(nextBuildCost(track, 3)).toBeNull();

    expect(selectBuildTrackLevel(service, track.id, 0)).toBe('equipped');
    expect(service.get().cosmetics.build.fountain).toBe(0);
    expect(service.get().cosmetics.buildMax.fountain).toBe(3);
    expect(selectBuildTrackLevel(service, track.id, 3)).toBe('equipped');
    expect(service.get().cosmetics.build.fountain).toBe(3);
    expect(selectBuildTrackLevel(service, track.id, 9)).toBe('locked');
  });

  it('selects free weather and buys/equips festival styles', () => {
    const service = new ProfileService(new MemoryStorage());
    expect(selectWeather(service, 'rain')).toBe('equipped');
    expect(service.get().cosmetics.weather).toBe('rain');
    expect(selectWeather(service, 'unknown')).toBe('missing');

    expect(buyOrEquipStyle(service, 'lantern')).toBe('poor');
    service.addCoins(500);
    expect(buyOrEquipStyle(service, 'lantern')).toBe('bought');
    expect(service.get().cosmetics.style).toBe('lantern');
    expect(service.get().cosmetics.ownedStyles).toContain('lantern');
    expect(buyOrEquipStyle(service, 'lantern')).toBe('equipped');
    expect(service.get().coins).toBe(280);
  });

  it('buys and equips match3 tile skins from the shop', () => {
    const service = new ProfileService(new MemoryStorage());
    expect(buyOrEquipTile(service, 'farm')).toBe('poor');
    service.addCoins(500);
    expect(buyOrEquipTile(service, 'farm')).toBe('bought');
    expect(service.get().cosmetics.tileStyle).toBe('farm');
    expect(service.get().cosmetics.ownedTiles).toContain('farm');
    expect(buyOrEquipTile(service, 'farm')).toBe('equipped');
    expect(service.get().coins).toBe(320);
    expect(buyOrEquipTile(service, 'ranch')).toBe('locked');
    service.get().cosmetics.ownedTiles.push('ranch');
    expect(buyOrEquipTile(service, 'ranch')).toBe('equipped');
    expect(buyOrEquipTile(service, 'unknown')).toBe('missing');
  });

  it('buys and equips outfits/icons, and refuses when poor', () => {
    const service = new ProfileService(new MemoryStorage());
    expect(buyOrEquipOutfit(service, 'garden')).toBe('poor');
    service.addCoins(500);
    expect(buyOrEquipOutfit(service, 'garden')).toBe('bought');
    expect(service.get().cosmetics.royalOutfit).toBe('garden');
    expect(buyOrEquipOutfit(service, 'garden')).toBe('equipped');
    expect(buyOrEquipIcon(service, 'swap')).toBe('bought');
    expect(service.get().cosmetics.iconStyle).toBe('swap');
    expect(service.get().coins).toBe(500 - 160 - 120);
  });

  it('keeps at most five residents and never exposes a resident name field', () => {
    const service = new ProfileService(new MemoryStorage());
    for (let i = 0; i < 8; i += 1) {
      service.addResident({ id: `r-${i}`, palette: i, since: '2026-01-01' });
    }
    expect(service.get().residents).toHaveLength(5);
    expect(service.get().residents[0]).not.toHaveProperty('name');
  });

  it('ignores invalid display names', () => {
    const service = new ProfileService(new MemoryStorage());
    const before = service.get().displayName;
    service.setDisplayName('自由输入的名字', true);
    expect(service.get().displayName).toBe(before);
    service.setDisplayName(`${PLAYER_NAME_PREFIX}桃酥`, true);
    expect(service.get().nameClaimed).toBe(true);
  });
});

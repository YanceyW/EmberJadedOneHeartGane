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
  nextBuildCost,
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

describe('profile v3', () => {
  it('creates a default unique-style name and starting cosmetics', () => {
    const profile = createDefaultProfile(1700000000000, 'player-test');
    expect(profile.schemaVersion).toBe(3);
    expect(profile.displayName.startsWith(PLAYER_NAME_PREFIX)).toBe(true);
    expect(profile.coins).toBe(0);
    expect(profile.cosmetics.ownedIcons).toContain('candy');
    expect(profile.cosmetics.ownedOutfits).toContain('classic');
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
    expect(profile.schemaVersion).toBe(3);
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

  it('adds and spends coins without going negative', () => {
    const service = new ProfileService(new MemoryStorage());
    service.addCoins(100);
    expect(service.get().coins).toBe(100);
    expect(service.spendCoins(30)).toBe(true);
    expect(service.get().coins).toBe(70);
    expect(service.spendCoins(999)).toBe(false);
    expect(service.get().coins).toBe(70);
  });

  it('upgrades build tracks up to level 3 and stops at max', () => {
    const service = new ProfileService(new MemoryStorage());
    service.addCoins(2000);
    const track = BUILD_TRACKS[0];
    for (let i = 0; i < 3; i += 1) {
      expect(upgradeBuildTrack(service, track.id)).toBe('bought');
    }
    expect(service.get().cosmetics.build.fountain).toBe(3);
    expect(upgradeBuildTrack(service, track.id)).toBe('maxed');
    expect(nextBuildCost(track, 3)).toBeNull();
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

import { StorageService } from './storage/storage';

export interface ProfileSettings {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  /** 无障碍/省电/低端机：关掉缩放、粒子与震动，只保留必要的位移与淡入淡出 */
  reducedMotion: boolean;
}

export interface Profile {
  schemaVersion: number;
  nickname: string;
  createdAt: number;
  lastLoginAt: number;
  prosperity: number;
  stardust: number;
  unlockedGames: string[];
  settings: ProfileSettings;
}

const KEY = 'profile';

export function createDefaultProfile(): Profile {
  const now = Date.now();
  return {
    schemaVersion: 1,
    nickname: '小国王',
    createdAt: now,
    lastLoginAt: now,
    prosperity: 0,
    stardust: 0,
    unlockedGames: ['match3'],
    settings: { music: true, sfx: true, haptics: true, reducedMotion: false },
  };
}

export class ProfileService {
  private profile: Profile;

  constructor(private readonly storage: StorageService) {
    const defaults = createDefaultProfile();
    const stored = this.storage.get<Partial<Profile>>(KEY, {});
    this.profile = {
      ...defaults,
      ...stored,
      schemaVersion: defaults.schemaVersion,
      unlockedGames: Array.isArray(stored.unlockedGames)
        ? stored.unlockedGames
        : defaults.unlockedGames,
      settings: { ...defaults.settings, ...(stored.settings ?? {}) },
    };
    this.profile.lastLoginAt = Date.now();
    this.save();
  }

  get(): Profile {
    return this.profile;
  }

  save(): void {
    this.storage.set(KEY, this.profile);
  }

  reset(): void {
    this.storage.remove(KEY);
    this.profile = createDefaultProfile();
    this.save();
  }

  addStardust(amount: number): void {
    this.profile.stardust = Math.max(0, this.profile.stardust + amount);
    this.save();
  }

  addProsperity(amount: number): void {
    this.profile.prosperity = Math.max(0, this.profile.prosperity + amount);
    this.save();
  }

  updateSettings(patch: Partial<ProfileSettings>): void {
    this.profile.settings = { ...this.profile.settings, ...patch };
    this.save();
  }
}

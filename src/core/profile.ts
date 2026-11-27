import { generateLocalName, isValidDisplayName } from '../shared/content/player-names';
import { INGREDIENT_IDS, IngredientNeed, PANTRY_CAP } from '../shared/content/ingredients';
import { dayKey, DAILY_ORDER_COUNT } from '../shared/content/daily-orders';

export type ProfileQuality = 'auto' | 'high' | 'mid' | 'low';

export interface ProfileSettings {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  /** 无障碍/省电/低端机：关掉缩放、粒子与震动，只保留必要的位移与淡入淡出 */
  reducedMotion: boolean;
  /** 画面档位；auto 由设备性能自动判断。 */
  quality: ProfileQuality;
  /** 一键低性能模式：低档 + 关闭环境粒子/场景动画/纸纹。 */
  performanceMode: boolean;
  ambientEffects: boolean;
  sceneMotion: boolean;
  textureDetail: boolean;
  screenShake: boolean;
}

export interface ProfileBuild {
  fountain: number;
  lights: number;
  garden: number;
}

export interface ProfileCosmetics {
  iconStyle: string;
  ownedIcons: string[];
  royalOutfit: string;
  ownedOutfits: string[];
  /** 当前展示的天气；天气免费，仅做外观。 */
  weather: string;
  /** 当前节日风格。 */
  style: string;
  ownedStyles: string[];
  /** 当前三消方块皮肤（王都小铺购买）。 */
  tileStyle: string;
  ownedTiles: string[];
  /** 当前选择展示的建设等级（可低于已解锁等级）。 */
  build: ProfileBuild;
  /** 已购买的最高建设等级。 */
  buildMax: ProfileBuild;
}

/** 只做无名环境 NPC：不显示名字、不可交互、不可换装。 */
export interface Resident {
  id: string;
  palette: number;
  since: string;
}

/** 每日委托进度：跨日只重置 claimed，连续天数靠 lastClear 记。 */
export interface ProfileDaily {
  date: string;
  claimed: string[];
  streak: number;
  lastClear: string;
}

export interface Profile {
  schemaVersion: 7;
  playerId: string;
  displayName: string;
  /** 是否已经在云端领取过唯一名字；离线兜底名为 false。 */
  nameClaimed: boolean;
  createdAt: number;
  lastLoginAt: number;
  prosperity: number;
  coins: number;
  /** 王都仓库：作物/花卉/半成品/茶饮/成菜共用的唯一库存。 */
  pantry: Record<string, number>;
  daily: ProfileDaily;
  unlockedGames: string[];
  cosmetics: ProfileCosmetics;
  residents: Resident[];
  lastResidentDate: string;
  settings: ProfileSettings;
}

/** Profile 只需要这三个存储能力，测试里可以注入内存实现。 */
export interface ProfileStorage {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

const KEY = 'profile';
const MAX_RESIDENTS = 5;

function makePlayerId(now: number): string {
  // 只用于本地区分玩家/选择兜底名，不参与玩法随机。
  return `p-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function finiteFloor(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function uniqueStrings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string')));
}

function validBuild(value: unknown): ProfileBuild {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    fountain: Math.min(3, finiteFloor(raw.fountain, 0)),
    lights: Math.min(3, finiteFloor(raw.lights, 0)),
    garden: Math.min(3, finiteFloor(raw.garden, 0)),
  };
}

function validPantry(value: unknown): Record<string, number> {
  const pantry: Record<string, number> = {};
  if (!value || typeof value !== 'object') return pantry;
  const raw = value as Record<string, unknown>;
  for (const id of INGREDIENT_IDS) {
    const amount = raw[id];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) continue;
    pantry[id] = Math.min(PANTRY_CAP, Math.floor(amount));
  }
  return pantry;
}

function validDaily(value: unknown): ProfileDaily {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    date: typeof raw.date === 'string' ? raw.date : '',
    claimed: uniqueStrings(raw.claimed, []),
    streak: finiteFloor(raw.streak, 0),
    lastClear: typeof raw.lastClear === 'string' ? raw.lastClear : '',
  };
}

function validResidents(value: unknown): Resident[] {
  if (!Array.isArray(value)) return [];
  const residents: Resident[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.id !== 'string' || !raw.id) continue;
    residents.push({
      id: raw.id,
      palette: finiteFloor(raw.palette, 0) % 6,
      since: typeof raw.since === 'string' ? raw.since : '',
    });
    if (residents.length >= MAX_RESIDENTS) break;
  }
  return residents;
}

export function createDefaultProfile(now = Date.now(), playerId = makePlayerId(now)): Profile {
  return {
    schemaVersion: 7,
    playerId,
    displayName: generateLocalName(playerId),
    nameClaimed: false,
    createdAt: now,
    lastLoginAt: now,
    prosperity: 0,
    coins: 0,
    pantry: {},
    daily: { date: dayKey(now), claimed: [], streak: 0, lastClear: '' },
    unlockedGames: ['match3'],
    cosmetics: {
      iconStyle: 'candy',
      ownedIcons: ['candy'],
      royalOutfit: 'classic',
      ownedOutfits: ['classic'],
      weather: 'clear',
      style: 'classic',
      ownedStyles: ['classic'],
      tileStyle: 'sweets',
      ownedTiles: ['sweets'],
      build: { fountain: 0, lights: 0, garden: 0 },
      buildMax: { fountain: 0, lights: 0, garden: 0 },
    },
    residents: [],
    lastResidentDate: '',
    settings: {
      music: true,
      sfx: true,
      haptics: true,
      reducedMotion: false,
      quality: 'auto',
      performanceMode: false,
      ambientEffects: true,
      sceneMotion: true,
      textureDetail: true,
      screenShake: true,
    },
  };
}

export function migrateProfile(input: unknown, now = Date.now()): Profile {
  const defaults = createDefaultProfile(now);
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;

  const playerId =
    typeof raw.playerId === 'string' && raw.playerId ? raw.playerId : defaults.playerId;
  const displayName = isValidDisplayName(raw.displayName)
    ? raw.displayName
    : generateLocalName(playerId);
  const nameClaimed = raw.nameClaimed === true;
  const cosmeticRaw =
    raw.cosmetics && typeof raw.cosmetics === 'object'
      ? (raw.cosmetics as Record<string, unknown>)
      : {};
  const settingsRaw =
    raw.settings && typeof raw.settings === 'object'
      ? (raw.settings as Record<string, unknown>)
      : {};

  const ownedIcons = uniqueStrings(cosmeticRaw.ownedIcons, ['candy']);
  if (!ownedIcons.includes('candy')) ownedIcons.push('candy');
  const ownedOutfits = uniqueStrings(cosmeticRaw.ownedOutfits, ['classic']);
  if (!ownedOutfits.includes('classic')) ownedOutfits.push('classic');
  const iconStyle =
    typeof cosmeticRaw.iconStyle === 'string' && ownedIcons.includes(cosmeticRaw.iconStyle)
      ? cosmeticRaw.iconStyle
      : 'candy';
  const royalOutfit =
    typeof cosmeticRaw.royalOutfit === 'string' && ownedOutfits.includes(cosmeticRaw.royalOutfit)
      ? cosmeticRaw.royalOutfit
      : 'classic';

  const ownedStyles = uniqueStrings(cosmeticRaw.ownedStyles, ['classic']);
  if (!ownedStyles.includes('classic')) ownedStyles.push('classic');
  const style =
    typeof cosmeticRaw.style === 'string' && ownedStyles.includes(cosmeticRaw.style)
      ? cosmeticRaw.style
      : 'classic';
  const weather = typeof cosmeticRaw.weather === 'string' ? cosmeticRaw.weather : 'clear';
  const ownedTiles = uniqueStrings(cosmeticRaw.ownedTiles, ['sweets']);
  if (!ownedTiles.includes('sweets')) ownedTiles.push('sweets');
  const tileStyle =
    typeof cosmeticRaw.tileStyle === 'string' && ownedTiles.includes(cosmeticRaw.tileStyle)
      ? cosmeticRaw.tileStyle
      : 'sweets';
  const build = validBuild(cosmeticRaw.build);
  const buildMax = validBuild(cosmeticRaw.buildMax);
  buildMax.fountain = Math.max(buildMax.fountain, build.fountain);
  buildMax.lights = Math.max(buildMax.lights, build.lights);
  buildMax.garden = Math.max(buildMax.garden, build.garden);

  return {
    schemaVersion: 7,
    playerId,
    displayName,
    nameClaimed,
    createdAt: finiteFloor(raw.createdAt, defaults.createdAt),
    lastLoginAt: finiteFloor(raw.lastLoginAt, now),
    prosperity: finiteFloor(raw.prosperity, 0),
    coins: finiteFloor(raw.coins, finiteFloor(raw.stardust, 0)),
    pantry: validPantry(raw.pantry),
    daily: validDaily(raw.daily),
    unlockedGames: uniqueStrings(raw.unlockedGames, defaults.unlockedGames),
    cosmetics: {
      iconStyle,
      ownedIcons,
      royalOutfit,
      ownedOutfits,
      weather,
      style,
      ownedStyles,
      tileStyle,
      ownedTiles,
      build,
      buildMax,
    },
    residents: validResidents(raw.residents),
    lastResidentDate: typeof raw.lastResidentDate === 'string' ? raw.lastResidentDate : '',
    settings: {
      music: settingsRaw.music !== false,
      sfx: settingsRaw.sfx !== false,
      haptics: settingsRaw.haptics !== false,
      reducedMotion: settingsRaw.reducedMotion === true,
      quality:
        settingsRaw.quality === 'high' ||
        settingsRaw.quality === 'mid' ||
        settingsRaw.quality === 'low'
          ? settingsRaw.quality
          : 'auto',
      performanceMode: settingsRaw.performanceMode === true,
      ambientEffects: settingsRaw.ambientEffects !== false,
      sceneMotion: settingsRaw.sceneMotion !== false,
      textureDetail: settingsRaw.textureDetail !== false,
      screenShake: settingsRaw.screenShake !== false,
    },
  };
}

export class ProfileService {
  private profile: Profile;

  constructor(private readonly storage: ProfileStorage) {
    const stored = this.storage.get<unknown>(KEY, null);
    this.profile = migrateProfile(stored);
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

  addCoins(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.profile.coins += Math.floor(amount);
    this.save();
  }

  spendCoins(amount: number): boolean {
    const cost = Math.max(0, Math.floor(amount));
    if (!Number.isFinite(cost) || cost <= 0 || this.profile.coins < cost) return false;
    this.profile.coins -= cost;
    this.save();
    return true;
  }

  /** 赔偿等强制扣款：最多扣到 0，返回实际扣掉的金额。 */
  loseCoins(amount: number): number {
    const loss = Math.max(0, Math.floor(amount));
    if (!Number.isFinite(loss) || loss <= 0) return 0;
    const actual = Math.min(this.profile.coins, loss);
    this.profile.coins -= actual;
    this.save();
    return actual;
  }

  /** 王都仓库的实时引用；玩法系统直接在它上面加减。 */
  pantry(): Record<string, number> {
    return this.profile.pantry;
  }

  pantryCount(id: string): number {
    return this.profile.pantry[id] ?? 0;
  }

  addPantry(id: string, amount = 1): void {
    if (!id || !INGREDIENT_IDS.includes(id)) return;
    const add = Math.floor(Number.isFinite(amount) ? amount : 0);
    if (add <= 0) return;
    this.profile.pantry[id] = Math.min(PANTRY_CAP, (this.profile.pantry[id] ?? 0) + add);
    this.save();
  }

  /** 原子扣除：材料不够时一件都不扣。 */
  takePantry(needs: readonly IngredientNeed[]): boolean {
    if (!needs.every((need) => (this.profile.pantry[need.id] ?? 0) >= need.amount)) return false;
    for (const need of needs) {
      const left = (this.profile.pantry[need.id] ?? 0) - need.amount;
      this.profile.pantry[need.id] = Math.max(0, left);
    }
    this.save();
    return true;
  }

  unlockIcon(id: string): void {
    if (!id || this.profile.cosmetics.ownedIcons.includes(id)) return;
    this.profile.cosmetics.ownedIcons.push(id);
    this.save();
  }

  equipIcon(id: string): void {
    if (!this.profile.cosmetics.ownedIcons.includes(id)) return;
    this.profile.cosmetics.iconStyle = id;
    this.save();
  }

  unlockOutfit(id: string): void {
    if (!id || this.profile.cosmetics.ownedOutfits.includes(id)) return;
    this.profile.cosmetics.ownedOutfits.push(id);
    this.save();
  }

  equipOutfit(id: string): void {
    if (!this.profile.cosmetics.ownedOutfits.includes(id)) return;
    this.profile.cosmetics.royalOutfit = id;
    this.save();
  }

  upgradeBuild(track: keyof ProfileBuild): void {
    const level = this.profile.cosmetics.buildMax[track];
    if (level >= 3) return;
    this.profile.cosmetics.buildMax[track] = level + 1;
    this.profile.cosmetics.build[track] = level + 1;
    this.save();
  }

  /** 已购买过的等级可以自由切换，低等级同样可以选。 */
  selectBuildLevel(track: keyof ProfileBuild, level: number): void {
    const max = this.profile.cosmetics.buildMax[track];
    const target = Math.max(0, Math.min(max, Math.floor(level)));
    this.profile.cosmetics.build[track] = target;
    this.save();
  }

  setWeather(id: string): void {
    if (!id) return;
    this.profile.cosmetics.weather = id;
    this.save();
  }

  unlockStyle(id: string): void {
    if (!id || this.profile.cosmetics.ownedStyles.includes(id)) return;
    this.profile.cosmetics.ownedStyles.push(id);
    this.save();
  }

  equipStyle(id: string): void {
    if (!this.profile.cosmetics.ownedStyles.includes(id)) return;
    this.profile.cosmetics.style = id;
    this.save();
  }

  unlockTile(id: string): void {
    if (!id || this.profile.cosmetics.ownedTiles.includes(id)) return;
    this.profile.cosmetics.ownedTiles.push(id);
    this.save();
  }

  equipTile(id: string): void {
    if (!this.profile.cosmetics.ownedTiles.includes(id)) return;
    this.profile.cosmetics.tileStyle = id;
    this.save();
  }

  setDisplayName(name: string, claimed: boolean): void {
    if (!isValidDisplayName(name)) return;
    this.profile.displayName = name;
    this.profile.nameClaimed = claimed;
    this.save();
  }

  addResident(resident: Resident): void {
    if (this.profile.residents.some((item) => item.id === resident.id)) return;
    this.profile.residents.push(resident);
    if (this.profile.residents.length > MAX_RESIDENTS) {
      this.profile.residents.splice(0, this.profile.residents.length - MAX_RESIDENTS);
    }
    this.save();
  }

  markResidentDate(date: string): void {
    this.profile.lastResidentDate = date;
    this.save();
  }

  addProsperity(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.profile.prosperity += Math.floor(amount);
    this.save();
  }

  /** 读每日委托进度；跨日只重置已交付列表（连续天数在交完时算）。 */
  dailySync(now = Date.now()): ProfileDaily {
    const today = dayKey(now);
    if (this.profile.daily.date !== today) {
      this.profile.daily = { ...this.profile.daily, date: today, claimed: [] };
      this.save();
    }
    return this.profile.daily;
  }

  /** 标记一单已交付；三单交齐时顺带累加连续天数。 */
  markDailyClaimed(orderId: string, now = Date.now()): ProfileDaily {
    const state = this.dailySync(now);
    if (!state.claimed.includes(orderId)) state.claimed.push(orderId);
    if (state.claimed.length >= DAILY_ORDER_COUNT) {
      const today = dayKey(now);
      const yesterday = dayKey(now - 24 * 60 * 60 * 1000);
      state.streak = state.lastClear === yesterday ? state.streak + 1 : 1;
      state.lastClear = today;
    }
    this.save();
    return state;
  }

  updateSettings(patch: Partial<ProfileSettings>): void {
    this.profile.settings = { ...this.profile.settings, ...patch };
    this.save();
  }
}

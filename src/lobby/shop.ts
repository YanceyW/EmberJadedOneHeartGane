import { ProfileService } from '../core/profile';
import { findTileSkin } from '../shared/content/tile-skins';
import { findStyle, findWeather } from './themes';

export type BuildTrackId = 'fountain' | 'lights' | 'garden';

export interface BuildTrackDef {
  id: BuildTrackId;
  name: string;
  description: string;
  costs: readonly number[];
  levelNames: readonly string[];
}

export interface OutfitDef {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface IconStyleDef {
  id: string;
  name: string;
  description: string;
  price: number;
}

export const BUILD_TRACKS: readonly BuildTrackDef[] = [
  {
    id: 'fountain',
    name: '喷泉',
    description: '水花更高、夜晚会亮起柔光',
    costs: [80, 160, 260],
    levelNames: ['小水花', '花瓣泉', '星光泉', '王都之泉'],
  },
  {
    id: 'lights',
    name: '街灯',
    description: '暖灯串与萤火虫会逐渐出现',
    costs: [80, 160, 260],
    levelNames: ['木灯', '暖灯串', '萤火灯', '星光街'],
  },
  {
    id: 'garden',
    name: '花圃',
    description: '广场四周的花会越来越繁茂',
    costs: [80, 160, 260],
    levelNames: ['几盆花', '小花圃', '花瓣路', '王都花园'],
  },
] as const;

export const OUTFITS: readonly OutfitDef[] = [
  {
    id: 'classic',
    name: '王都礼服',
    description: '国王与王后的默认礼服',
    price: 0,
  },
  {
    id: 'garden',
    name: '花园漫步',
    description: '草帽、花朵与轻便披肩',
    price: 160,
  },
  {
    id: 'winter',
    name: '暖冬出行',
    description: '围巾、耳罩和毛绒外套',
    price: 220,
  },
  {
    id: 'starlight',
    name: '星夜舞会',
    description: '深紫披风与金色星纹',
    price: 280,
  },
] as const;

export const ICON_STYLES: readonly IconStyleDef[] = [
  {
    id: 'candy',
    name: '笑脸糖',
    description: '三颗圆糖，中间一颗在笑',
    price: 0,
  },
  {
    id: 'swap',
    name: '交换糖',
    description: '两块糖斜向交换，带弧形箭头',
    price: 120,
  },
  {
    id: 'honey',
    name: '蜂蜜罐',
    description: '大蜂蜜罐配一颗星星糖',
    price: 180,
  },
] as const;

export function findOutfit(id: string): OutfitDef | undefined {
  return OUTFITS.find((item) => item.id === id);
}

export function findIconStyle(id: string): IconStyleDef | undefined {
  return ICON_STYLES.find((item) => item.id === id);
}

export function nextBuildCost(track: BuildTrackDef, level: number): number | null {
  if (level >= track.costs.length) return null;
  return track.costs[level];
}

export function canAfford(coins: number, price: number): boolean {
  return price <= 0 || coins >= price;
}

export type ShopResult =
  | 'bought'
  | 'owned'
  | 'equipped'
  | 'poor'
  | 'maxed'
  | 'locked'
  | 'missing';

export function buyOrEquipOutfit(profile: ProfileService, id: string): ShopResult {
  const item = findOutfit(id);
  if (!item) return 'missing';
  const state = profile.get().cosmetics;
  if (state.ownedOutfits.includes(id)) {
    profile.equipOutfit(id);
    return 'equipped';
  }
  if (item.price > 0 && !profile.spendCoins(item.price)) return 'poor';
  profile.unlockOutfit(id);
  profile.equipOutfit(id);
  return 'bought';
}

export function buyOrEquipIcon(profile: ProfileService, id: string): ShopResult {
  const item = findIconStyle(id);
  if (!item) return 'missing';
  const state = profile.get().cosmetics;
  if (state.ownedIcons.includes(id)) {
    profile.equipIcon(id);
    return 'equipped';
  }
  if (item.price > 0 && !profile.spendCoins(item.price)) return 'poor';
  profile.unlockIcon(id);
  profile.equipIcon(id);
  return 'bought';
}

export function upgradeBuildTrack(profile: ProfileService, id: BuildTrackId): ShopResult {
  const track = BUILD_TRACKS.find((item) => item.id === id);
  if (!track) return 'missing';
  const level = profile.get().cosmetics.buildMax[id];
  const cost = nextBuildCost(track, level);
  if (cost === null) return 'maxed';
  if (!profile.spendCoins(cost)) return 'poor';
  profile.upgradeBuild(id);
  return 'bought';
}

export function selectBuildTrackLevel(
  profile: ProfileService,
  id: BuildTrackId,
  level: number,
): ShopResult {
  const track = BUILD_TRACKS.find((item) => item.id === id);
  if (!track) return 'missing';
  if (level < 0 || level > profile.get().cosmetics.buildMax[id]) return 'locked';
  profile.selectBuildLevel(id, level);
  return 'equipped';
}

export function selectWeather(profile: ProfileService, id: string): ShopResult {
  if (!findWeather(id)) return 'missing';
  profile.setWeather(id);
  return 'equipped';
}

export function buyOrEquipStyle(profile: ProfileService, id: string): ShopResult {
  const item = findStyle(id);
  if (!item) return 'missing';
  const state = profile.get().cosmetics;
  if (state.ownedStyles.includes(id)) {
    profile.equipStyle(id);
    return 'equipped';
  }
  if (item.price > 0 && !profile.spendCoins(item.price)) return 'poor';
  profile.unlockStyle(id);
  profile.equipStyle(id);
  return 'bought';
}

export function buyOrEquipTile(profile: ProfileService, id: string): ShopResult {
  const skin = findTileSkin(id);
  if (!skin) return 'missing';
  const state = profile.get().cosmetics;
  if (state.ownedTiles.includes(id)) {
    profile.equipTile(id);
    return 'equipped';
  }
  if (skin.unlockHint) return 'locked';
  if (skin.price > 0 && !profile.spendCoins(skin.price)) return 'poor';
  profile.unlockTile(id);
  profile.equipTile(id);
  return 'bought';
}

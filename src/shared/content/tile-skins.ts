import type { SpriteId } from '../design-system/sprite-atlas';

export type TileSkinId = 'sweets' | 'farm' | 'town' | 'ranch';

export interface TileSkinDef {
  id: TileSkinId;
  name: string;
  venue: string;
  description: string;
  price: number;
  /** 有解锁条件的皮肤不能直接买，需要在对应玩法里达成。 */
  unlockHint?: string;
  /** 5 个方块精灵，顺序对应棋盘里的值 0–4。 */
  sprites: readonly SpriteId[];
}

/**
 * 三消方块皮肤：在王都小铺购买，所有关卡与无尽模式通用。
 * 每套 5 个精灵，靠轮廓/底纹/色相区分，不只换颜色。
 */
export const TILE_SKINS: readonly TileSkinDef[] = [
  {
    id: 'sweets',
    name: '甜品屋方块',
    venue: '王都甜品屋',
    description: '莓果、蜂蜜罐和糖，最经典的一套',
    price: 0,
    sprites: ['tile-berry', 'tile-honey', 'tile-mint', 'tile-sky', 'tile-lilac'],
  },
  {
    id: 'farm',
    name: '农场鲜货方块',
    venue: '王都农场',
    description: '胡萝卜、麦穗和莓果，田里刚收上来的',
    price: 180,
    sprites: ['tile-carrot', 'tile-berry', 'tile-honey', 'tile-lilac', 'tile-wheat'],
  },
  {
    id: 'town',
    name: '王都食集方块',
    venue: '面包房 · 食集',
    description: '刚出炉的面包、胡萝卜和甜点',
    price: 260,
    sprites: ['tile-bread', 'tile-carrot', 'tile-honey', 'tile-mint', 'tile-sky'],
  },
  {
    id: 'ranch',
    name: '牧场鲜货方块',
    venue: '王都牧场',
    description: '鸡蛋、奶罐、肉排和奶酪，牧场首次收获解锁',
    price: 0,
    unlockHint: '牧场首次收获解锁',
    sprites: ['tile-egg', 'tile-milk', 'tile-meat', 'tile-cheese', 'tile-feed'],
  },
] as const;

export function findTileSkin(id: string): TileSkinDef | undefined {
  return TILE_SKINS.find((skin) => skin.id === id);
}

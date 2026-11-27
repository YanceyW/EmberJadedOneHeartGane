import { COLORS } from '../../../shared/design-system/tokens';
import { findIngredient } from '../../../shared/content/ingredients';

export type RanchSpeciesId = 'chicken' | 'cow' | 'pig' | 'sheep';

export interface RanchSpeciesDef {
  id: RanchSpeciesId;
  name: string;
  /** 仓库里的产物 id。 */
  product: string;
  buyCost: number;
  produceSeconds: number;
  color: string;
  shade: string;
}

export const RANCH_MAX_PER_PEN = 4;
export const FEED_ID = 'feed';
/** 没有饲料时，花币买一份应急饲料的单价（比自己做贵）。 */
export const FEED_BUY_COST = 55;

/** 四个固定畜栏：鸡、牛、猪、羊各一块，方便一眼看懂分区。 */
export const RANCH_SPECIES: readonly RanchSpeciesDef[] = [
  {
    id: 'chicken',
    name: '母鸡',
    product: 'egg',
    buyCost: 120,
    produceSeconds: 26,
    color: COLORS.paper,
    shade: COLORS.gold,
  },
  {
    id: 'cow',
    name: '奶牛',
    product: 'milk',
    buyCost: 260,
    produceSeconds: 42,
    color: COLORS.paper,
    shade: COLORS.lilacDeep,
  },
  {
    id: 'pig',
    name: '花猪',
    product: 'pork',
    buyCost: 320,
    produceSeconds: 58,
    color: COLORS.petal,
    shade: COLORS.petalDeep,
  },
  {
    id: 'sheep',
    name: '绵羊',
    product: 'mutton',
    buyCost: 380,
    produceSeconds: 72,
    color: COLORS.cream,
    shade: COLORS.lilacDeep,
  },
];

export function findSpecies(id: string): RanchSpeciesDef | undefined {
  return RANCH_SPECIES.find((species) => species.id === id);
}

export function productName(id: string): string {
  return findIngredient(id)?.name ?? id;
}


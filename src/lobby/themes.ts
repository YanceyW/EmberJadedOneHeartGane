import type { TownPhaseColors } from '../shared/design-system/tokens';
import type { TownPhase } from './town/town-palette';

export type WeatherId = 'clear' | 'rain' | 'snow' | 'petals';

export interface WeatherDef {
  id: WeatherId;
  name: string;
  description: string;
  /** 天气免费，价格字段保留给未来活动天气。 */
  price: number;
}

export const WEATHERS: readonly WeatherDef[] = [
  { id: 'clear', name: '晴朗', description: '默认好天气，适合逛王都', price: 0 },
  { id: 'rain', name: '小雨', description: '细雨落在石板路上，灯光会更柔', price: 0 },
  { id: 'snow', name: '飘雪', description: '慢慢落下的雪，不堆雪人也不打雪仗', price: 0 },
  { id: 'petals', name: '花瓣风', description: '风把花瓣吹过屋顶和喷泉', price: 0 },
] as const;

export type StyleId = 'classic' | 'spring' | 'lantern' | 'harvest' | 'frost';

export interface StyleDef {
  id: StyleId;
  name: string;
  description: string;
  price: number;
  /** 商店预览用的三个色块。 */
  swatches: readonly [string, string, string];
}

export const STYLES: readonly StyleDef[] = [
  {
    id: 'classic',
    name: '奶油王都',
    description: '默认纸雕配色，四季都耐看',
    price: 0,
    swatches: ['#FFF6E9', '#A8E6CF', '#F7B98E'],
  },
  {
    id: 'spring',
    name: '春樱漫步',
    description: '粉樱、嫩绿与花瓣，春天限定的温柔',
    price: 180,
    swatches: ['#FFE4EC', '#F7A8C4', '#B7E3B0'],
  },
  {
    id: 'lantern',
    name: '灯会之夜',
    description: '红金灯笼挂满长街，夜里会亮起来',
    price: 220,
    swatches: ['#7A2F3A', '#D94B4B', '#F2C14E'],
  },
  {
    id: 'harvest',
    name: '秋收市集',
    description: '南瓜、麦穗与蜂蜜色，适合慢慢逛',
    price: 160,
    swatches: ['#F6D7A8', '#D9772E', '#8C6A3D'],
  },
  {
    id: 'frost',
    name: '暖冬灯火',
    description: '冷蓝雪景配暖窗和礼物盒，不做圣诞专属',
    price: 200,
    swatches: ['#DCE9F2', '#8FB8D8', '#F2C14E'],
  },
] as const;

export function findWeather(id: string): WeatherDef | undefined {
  return WEATHERS.find((item) => item.id === id);
}

export function findStyle(id: string): StyleDef | undefined {
  return STYLES.find((item) => item.id === id);
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function mixHex(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const t = Math.max(0, Math.min(1, amount));
  return toHex([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
}

/**
 * 节日风格只改变环境色，不改变建筑布局/交互。
 * 夜间保留蓝紫底，只轻微染色，避免看不清窗光。
 */
export function stylePalette(
  colors: TownPhaseColors,
  phase: TownPhase,
  style: string,
): TownPhaseColors {
  if (style === 'classic' || phase === 'night') return colors;
  const dayAmount = phase === 'dawn' ? 0.55 : phase === 'dusk' ? 0.45 : 1;
  switch (style) {
    case 'spring':
      return {
        ...colors,
        skyTop: mixHex(colors.skyTop, '#FFD7E5', 0.36 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#FFE6EE', 0.28 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#FFF0E4', 0.3 * dayAmount),
        grass: mixHex(colors.grass, '#CBE9B4', 0.28 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#E8F6CF', 0.32 * dayAmount),
        grassDeep: mixHex(colors.grassDeep, '#A9D996', 0.25 * dayAmount),
        path: mixHex(colors.path, '#F9E2D6', 0.35 * dayAmount),
        roof1: mixHex(colors.roof1, '#E98BA6', 0.32 * dayAmount),
        roof1Deep: mixHex(colors.roof1Deep, '#C9768F', 0.3 * dayAmount),
      };
    case 'lantern':
      return {
        ...colors,
        skyTop: mixHex(colors.skyTop, '#E9A06F', 0.22 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#F2B37A', 0.24 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#FFD9A0', 0.28 * dayAmount),
        grass: mixHex(colors.grass, '#A8C77A', 0.2 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#C9E2A4', 0.22 * dayAmount),
        path: mixHex(colors.path, '#E8C08A', 0.26 * dayAmount),
        roof1: mixHex(colors.roof1, '#C23A3A', 0.45 * dayAmount),
        roof1Deep: mixHex(colors.roof1Deep, '#8C2F32', 0.4 * dayAmount),
        window: '#FFD37A',
        lamp: '#FFB84D',
      };
    case 'harvest':
      return {
        ...colors,
        skyTop: mixHex(colors.skyTop, '#F6C77A', 0.3 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#F7D6A0', 0.25 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#FFE1B0', 0.25 * dayAmount),
        grass: mixHex(colors.grass, '#C8B36A', 0.32 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#E4D39A', 0.35 * dayAmount),
        grassDeep: mixHex(colors.grassDeep, '#A8904E', 0.3 * dayAmount),
        path: mixHex(colors.path, '#E0B173', 0.4 * dayAmount),
        roof2: mixHex(colors.roof2, '#D9772E', 0.4 * dayAmount),
        roof2Deep: mixHex(colors.roof2Deep, '#A9551E', 0.35 * dayAmount),
      };
    case 'frost':
      return {
        ...colors,
        skyTop: mixHex(colors.skyTop, '#CFE1F2', 0.38 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#DCE9F2', 0.3 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#EFF5F7', 0.3 * dayAmount),
        grass: mixHex(colors.grass, '#D6E8DF', 0.36 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#EEF7F1', 0.38 * dayAmount),
        grassDeep: mixHex(colors.grassDeep, '#B8D6CA', 0.3 * dayAmount),
        path: mixHex(colors.path, '#EDE6D8', 0.35 * dayAmount),
        roof1: mixHex(colors.roof1, '#E8B7C0', 0.25 * dayAmount),
        roof2: mixHex(colors.roof2, '#D9B36A', 0.25 * dayAmount),
        roof3: mixHex(colors.roof3, '#8FB8A8', 0.25 * dayAmount),
      };
    default:
      return colors;
  }
}

export type DecorStyle = Exclude<StyleId, 'classic'>;

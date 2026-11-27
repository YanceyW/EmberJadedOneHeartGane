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
    name: '纸雕王都',
    description: '默认剪纸配色，四季都耐看',
    price: 0,
    swatches: ['#FFF6E9', '#A8E6CF', '#F7B98E'],
  },
  {
    id: 'spring',
    name: '桃花春色',
    description: '桃花、纸鸢与油纸伞，春天限定的温柔',
    price: 180,
    swatches: ['#FFE4EC', '#F7A8C4', '#B7E3B0'],
  },
  {
    id: 'lantern',
    name: '灯会之夜',
    description: '红灯笼挂满长街，夜里会亮起来',
    price: 220,
    swatches: ['#7A2F3A', '#D94B4B', '#F2C14E'],
  },
  {
    id: 'harvest',
    name: '秋收市集',
    description: '稻穗、柿子与玉米，适合慢慢逛',
    price: 160,
    swatches: ['#F6D7A8', '#D9772E', '#8C6A3D'],
  },
  {
    id: 'frost',
    name: '暖冬灯火',
    description: '冷蓝雪景配暖窗、红灯笼与腊梅',
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
        skyTop: mixHex(colors.skyTop, '#FFD7E5', 0.5 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#FFE6EE', 0.4 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#FFF0E4', 0.4 * dayAmount),
        grass: mixHex(colors.grass, '#CBE9B4', 0.38 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#E8F6CF', 0.42 * dayAmount),
        grassDeep: mixHex(colors.grassDeep, '#A9D996', 0.34 * dayAmount),
        path: mixHex(colors.path, '#F9E2D6', 0.45 * dayAmount),
        roof1: mixHex(colors.roof1, '#E98BA6', 0.5 * dayAmount),
        roof1Deep: mixHex(colors.roof1Deep, '#C9768F', 0.45 * dayAmount),
        roof2: mixHex(colors.roof2, '#F3C3D2', 0.35 * dayAmount),
        roof3: mixHex(colors.roof3, '#B7E3B0', 0.3 * dayAmount),
        wall: mixHex(colors.wall, '#FFF0F4', 0.4 * dayAmount),
        window: '#FFE3EC',
      };
    case 'lantern':
      return {
        ...colors,
        skyTop: mixHex(colors.skyTop, '#E9A06F', 0.3 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#F2B37A', 0.32 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#FFD9A0', 0.34 * dayAmount),
        grass: mixHex(colors.grass, '#A8C77A', 0.26 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#C9E2A4', 0.28 * dayAmount),
        path: mixHex(colors.path, '#E8C08A', 0.34 * dayAmount),
        roof1: mixHex(colors.roof1, '#C23A3A', 0.55 * dayAmount),
        roof1Deep: mixHex(colors.roof1Deep, '#8C2F32', 0.5 * dayAmount),
        roof2: mixHex(colors.roof2, '#E0A33F', 0.4 * dayAmount),
        wall: mixHex(colors.wall, '#FFEFD6', 0.3 * dayAmount),
        window: '#FFD37A',
        lamp: '#FFB84D',
      };
    case 'harvest':
      return {
        ...colors,
        skyTop: mixHex(colors.skyTop, '#F6C77A', 0.4 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#F7D6A0', 0.34 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#FFE1B0', 0.34 * dayAmount),
        grass: mixHex(colors.grass, '#C8B36A', 0.42 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#E4D39A', 0.45 * dayAmount),
        grassDeep: mixHex(colors.grassDeep, '#A8904E', 0.4 * dayAmount),
        path: mixHex(colors.path, '#E0B173', 0.5 * dayAmount),
        roof1: mixHex(colors.roof1, '#E2A05A', 0.28 * dayAmount),
        roof2: mixHex(colors.roof2, '#D9772E', 0.52 * dayAmount),
        roof2Deep: mixHex(colors.roof2Deep, '#A9551E', 0.46 * dayAmount),
        wall: mixHex(colors.wall, '#FFF2DF', 0.3 * dayAmount),
        window: '#FFE0A0',
      };
    case 'frost':
      return {
        ...colors,
        skyTop: mixHex(colors.skyTop, '#CFE1F2', 0.5 * dayAmount),
        skyMid: mixHex(colors.skyMid, '#DCE9F2', 0.4 * dayAmount),
        skyHorizon: mixHex(colors.skyHorizon, '#EFF5F7', 0.4 * dayAmount),
        grass: mixHex(colors.grass, '#D6E8DF', 0.48 * dayAmount),
        grassLight: mixHex(colors.grassLight, '#EEF7F1', 0.5 * dayAmount),
        grassDeep: mixHex(colors.grassDeep, '#B8D6CA', 0.4 * dayAmount),
        path: mixHex(colors.path, '#EDE6D8', 0.45 * dayAmount),
        roof1: mixHex(colors.roof1, '#E8B7C0', 0.36 * dayAmount),
        roof2: mixHex(colors.roof2, '#D9B36A', 0.36 * dayAmount),
        roof3: mixHex(colors.roof3, '#8FB8A8', 0.36 * dayAmount),
        wall: mixHex(colors.wall, '#FFFDF8', 0.32 * dayAmount),
        window: '#FFDF9A',
      };
    default:
      return colors;
  }
}

export type DecorStyle = Exclude<StyleId, 'classic'>;

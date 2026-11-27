export const COLORS = {
  cream: '#FFF6E9',
  paper: '#FFFDF8',
  ink: '#3A2E2A',
  inkSoft: '#6B5B54',
  jade: '#2F8F7B',
  mint: '#A8E6CF',
  teal: '#1F5F55',
  peach: '#FFB7A5',
  coral: '#F27D72',
  gold: '#F2C14E',
  lilac: '#C9B6E4',
  sky: '#BFE3F2',
  leaf: '#7FBF6A',
  berry: '#D96C8A',
  petal: '#F7A8C4',
  honey: '#F6C667',
  water: '#8CCFE8',
  // 方块/图标暗部：只用于挤出侧边、内阴影与描边，不单独作为主题色。
  mintDeep: '#74BFA6',
  honeyDeep: '#B9862F',
  waterDeep: '#5FA3BC',
  lilacDeep: '#9B87BE',
  petalDeep: '#C9768F',
  // 2.5D 王都的昼夜与地面色，集中登记避免大厅自造颜色。
  dusk: '#F7B98E',
  nightSky: '#4C537D',
  nightDeep: '#2F3557',
  starlight: '#FFF3C4',
  grass: '#B7E3B0',
  grassDeep: '#8CCB8A',
  path: '#F4E6CF',
  pathDeep: '#DCC9AB',
  skin: '#FFE0C2',
  skinShade: '#F4C9A6',
  blush: '#F08C7E',
} as const;

/** 王都纸雕场景的地形/木质/玻璃色，只用于大厅与后续街区扩展。 */
export const TOWN_COLORS = {
  soil: '#D9B98C',
  soilDeep: '#BE9866',
  stone: '#EADCC4',
  stoneDeep: '#CDBBA0',
  glass: '#DFF3F5',
  glassDeep: '#A8D8DE',
  wood: '#C98F5C',
  woodDeep: '#9A6538',
  hillFar: '#CFE3CC',
  hillMid: '#B4D6B4',
  cloudShade: '#D8C9BE',
  sunGlow: '#FFE9B8',
  moon: '#FFF3C4',
  nightHill: '#3F5F5A',
  nightGround: '#4F7B66',
  nightPath: '#8B7F6A',
} as const;

export interface TownPhaseColors {
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  sun: string;
  sunGlow: string;
  cloud: string;
  hillFar: string;
  hillMid: string;
  grass: string;
  grassDeep: string;
  grassLight: string;
  soil: string;
  soilDeep: string;
  path: string;
  pathDeep: string;
  water: string;
  waterDeep: string;
  window: string;
  lamp: string;
  ambient: string;
  roof1: string;
  roof1Deep: string;
  roof2: string;
  roof2Deep: string;
  roof3: string;
  roof3Deep: string;
  wall: string;
  wallShade: string;
}

/** 四相纸雕调色板；大厅昼夜切换只换这一组。 */
export const TOWN_PHASES: Record<'dawn' | 'day' | 'dusk' | 'night', TownPhaseColors> = {
  dawn: {
    skyTop: '#F8D9CE',
    skyMid: '#FFD0AC',
    skyHorizon: '#FFE7C2',
    sun: '#FFD98A',
    sunGlow: '#FFE9B8',
    cloud: '#FFF8EF',
    hillFar: '#CFE3CC',
    hillMid: '#B4D6B4',
    grass: '#B4DFA8',
    grassDeep: '#8CC47F',
    grassLight: '#D4EFC6',
    soil: TOWN_COLORS.soil,
    soilDeep: TOWN_COLORS.soilDeep,
    path: '#F6E4C7',
    pathDeep: '#E0C6A2',
    water: COLORS.water,
    waterDeep: COLORS.waterDeep,
    window: '#FFDE9A',
    lamp: '#FFD07A',
    ambient: COLORS.peach,
    roof1: COLORS.berry,
    roof1Deep: COLORS.petalDeep,
    roof2: COLORS.honey,
    roof2Deep: COLORS.honeyDeep,
    roof3: COLORS.leaf,
    roof3Deep: '#5E9C4D',
    wall: '#FFF6E4',
    wallShade: '#F3DFC2',
  },
  day: {
    skyTop: '#FFF3D9',
    skyMid: '#FDE9CE',
    skyHorizon: '#E6F3E2',
    sun: '#FFE08A',
    sunGlow: '#FFF1C2',
    cloud: COLORS.paper,
    hillFar: '#D6EBDC',
    hillMid: '#BCE0C2',
    grass: '#AFE0A4',
    grassDeep: '#86C87C',
    grassLight: '#D5F0C8',
    soil: TOWN_COLORS.soil,
    soilDeep: TOWN_COLORS.soilDeep,
    path: '#F7E6C9',
    pathDeep: '#DFC7A4',
    water: COLORS.water,
    waterDeep: COLORS.waterDeep,
    window: '#FFE7A8',
    lamp: COLORS.gold,
    ambient: COLORS.mint,
    roof1: COLORS.berry,
    roof1Deep: COLORS.petalDeep,
    roof2: COLORS.honey,
    roof2Deep: COLORS.honeyDeep,
    roof3: COLORS.leaf,
    roof3Deep: '#5E9C4D',
    wall: '#FFFCF0',
    wallShade: '#F2E2CB',
  },
  dusk: {
    skyTop: '#F6C9A8',
    skyMid: '#FFBE86',
    skyHorizon: '#FFE0AE',
    sun: '#FFD06A',
    sunGlow: '#FFE49A',
    cloud: '#FFF3E4',
    hillFar: '#BFD9BC',
    hillMid: '#9FCB9B',
    grass: '#9FDD8E',
    grassDeep: '#70BE63',
    grassLight: '#C8EFA8',
    soil: '#D2A56F',
    soilDeep: '#A97A4D',
    path: '#F8E0B8',
    pathDeep: '#DCBB8C',
    water: COLORS.water,
    waterDeep: COLORS.waterDeep,
    window: '#FFD37A',
    lamp: '#FFC45E',
    ambient: COLORS.peach,
    roof1: '#D95B80',
    roof1Deep: '#A93D5D',
    roof2: '#F5B93F',
    roof2Deep: '#C2871C',
    roof3: '#6DBE5C',
    roof3Deep: '#4C913E',
    wall: '#FFF3D8',
    wallShade: '#F0D5AE',
  },
  night: {
    skyTop: COLORS.nightSky,
    skyMid: '#3F476D',
    skyHorizon: '#6B7299',
    sun: COLORS.starlight,
    sunGlow: '#8C96BC',
    cloud: '#8C96BC',
    hillFar: TOWN_COLORS.nightHill,
    hillMid: '#35514D',
    grass: TOWN_COLORS.nightGround,
    grassDeep: '#3F6556',
    grassLight: '#5E8A72',
    soil: '#6B5A48',
    soilDeep: '#4E4033',
    path: TOWN_COLORS.nightPath,
    pathDeep: '#6A604F',
    water: COLORS.lilac,
    waterDeep: COLORS.lilacDeep,
    window: '#FFD98A',
    lamp: COLORS.gold,
    ambient: COLORS.starlight,
    roof1: '#8C4A62',
    roof1Deep: '#633247',
    roof2: '#A57B2A',
    roof2Deep: '#71521B',
    roof3: '#4F7B48',
    roof3Deep: '#32522E',
    wall: '#7A7568',
    wallShade: '#5E5A50',
  },
};

/** 纸雕 UI 的固定质感色。 */
export const PAPER_UI = {
  stitch: 'rgba(154,101,56,0.35)',
  edge: 'rgba(58,46,42,0.22)',
  grain: 'rgba(74,58,48,0.06)',
  shadow: 'rgba(58,46,42,0.16)',
  tape: 'rgba(242,193,78,0.55)',
} as const;

/** 页面背景渐变：大厅与游戏共用，避免各自写一套奶油绿。 */
export const SURFACE = {
  top: COLORS.cream,
  mid: '#F3FAF3',
  bottom: '#E4F4EC',
} as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const FONT = {
  family: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  caption: 20,
  body: 24,
  subtitle: 28,
  title: 32,
  display: 40,
} as const;

export const MOTION = {
  fast: 120,
  base: 180,
  slow: 240,
  reward: 320,
} as const;

export type AccentKey = 'mint' | 'leaf' | 'honey' | 'sky' | 'peach';

export interface Accent {
  main: string;
  soft: string;
  deep: string;
}

export const ACCENTS: Record<AccentKey, Accent> = {
  mint: { main: COLORS.jade, soft: COLORS.mint, deep: COLORS.teal },
  leaf: { main: COLORS.leaf, soft: '#D8F0CE', deep: '#456B3A' },
  honey: { main: COLORS.honey, soft: '#FCE7B8', deep: '#8A641F' },
  sky: { main: COLORS.water, soft: COLORS.sky, deep: '#2C6D86' },
  peach: { main: COLORS.peach, soft: '#FFDDD2', deep: '#B85C48' },
};

export function accentOf(key: string): Accent {
  return ACCENTS[key as AccentKey] ?? ACCENTS.mint;
}

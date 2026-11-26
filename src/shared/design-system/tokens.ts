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
  white: '#FFFFFF',
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

export type AccentKey = 'mint' | 'leaf' | 'honey' | 'sky';

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
};

export function accentOf(key: string): Accent {
  return ACCENTS[key as AccentKey] ?? ACCENTS.mint;
}

export interface Match3Level {
  id: number;
  title: string;
  moves: number;
  target: number;
  colors: number;
}

export const LEVELS: Match3Level[] = [
  { id: 1, title: '初入王都', moves: 24, target: 600, colors: 5 },
  { id: 2, title: '甜点街角', moves: 24, target: 700, colors: 5 },
  { id: 3, title: '喷泉广场', moves: 24, target: 800, colors: 5 },
  { id: 4, title: '花瓣集市', moves: 23, target: 900, colors: 5 },
  { id: 5, title: '蜂蜜工坊', moves: 23, target: 1000, colors: 5 },
  { id: 6, title: '星光露台', moves: 22, target: 1100, colors: 5 },
  { id: 7, title: '莓果庭院', moves: 22, target: 1200, colors: 5 },
  { id: 8, title: '王都茶会', moves: 21, target: 1300, colors: 5 },
  { id: 9, title: '暮色长廊', moves: 21, target: 1400, colors: 5 },
  { id: 10, title: '王都之心', moves: 20, target: 1500, colors: 5 },
];

export function levelById(id: number): Match3Level {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0];
}

export function starsFor(level: Match3Level, score: number): number {
  if (score < level.target) return 0;
  if (score >= Math.round(level.target * 1.5)) return 3;
  if (score >= Math.round(level.target * 1.25)) return 2;
  return 1;
}

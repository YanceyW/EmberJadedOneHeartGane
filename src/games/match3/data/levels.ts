export interface Match3Level {
  id: number;
  title: string;
  seconds: number;
  target: number;
  colors: number;
}

/** 每关固定 3 分钟，难度只靠目标分数上涨。 */
export const LEVEL_SECONDS = 180;

export const LEVELS: Match3Level[] = [
  { id: 1, title: '初入王都', seconds: LEVEL_SECONDS, target: 1500, colors: 5 },
  { id: 2, title: '甜点街角', seconds: LEVEL_SECONDS, target: 1800, colors: 5 },
  { id: 3, title: '喷泉广场', seconds: LEVEL_SECONDS, target: 2100, colors: 5 },
  { id: 4, title: '花瓣集市', seconds: LEVEL_SECONDS, target: 2400, colors: 5 },
  { id: 5, title: '蜂蜜工坊', seconds: LEVEL_SECONDS, target: 2700, colors: 5 },
  { id: 6, title: '星光露台', seconds: LEVEL_SECONDS, target: 3000, colors: 5 },
  { id: 7, title: '莓果庭院', seconds: LEVEL_SECONDS, target: 3300, colors: 5 },
  { id: 8, title: '王都茶会', seconds: LEVEL_SECONDS, target: 3600, colors: 5 },
  { id: 9, title: '暮色长廊', seconds: LEVEL_SECONDS, target: 3900, colors: 5 },
  { id: 10, title: '王都之心', seconds: LEVEL_SECONDS, target: 4200, colors: 5 },
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

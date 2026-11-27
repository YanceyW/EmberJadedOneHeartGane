export const MATCH3_CAMPAIGN_BOARD = 'match3-campaign';
export const MATCH3_ENDLESS_BOARD = 'match3-endless';

export interface LeaderboardTab {
  id: string;
  label: string;
}

/** 排行榜分类：三消拆成闯关/无尽两个子项，其余游戏各一项。 */
export const LEADERBOARD_TABS: readonly LeaderboardTab[] = [
  { id: MATCH3_CAMPAIGN_BOARD, label: '闯关' },
  { id: MATCH3_ENDLESS_BOARD, label: '无尽' },
  { id: 'farm', label: '农场' },
  { id: 'ranch', label: '牧场' },
  { id: 'garden', label: '花园' },
  { id: 'merge', label: '加工屋' },
  { id: 'aquarium', label: '水族馆' },
  { id: 'restaurant', label: '餐厅' },
] as const;

export function leaderboardLabel(id: string): string {
  return LEADERBOARD_TABS.find((tab) => tab.id === id)?.label ?? id;
}

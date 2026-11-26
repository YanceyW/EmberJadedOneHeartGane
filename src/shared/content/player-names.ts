import { createRng, hashString } from '../../core/rng';

/**
 * 玩家展示名的候选池。只允许从固定词库组合，不接收自由输入，
 * 这样既能保证名字可爱，也不会引入 UGC 审核面。
 */
const FIRST = [
  '桃',
  '小',
  '团',
  '栗',
  '星',
  '花',
  '布',
  '奶',
  '青',
  '麦',
  '柚',
  '汤',
  '酥',
  '云',
  '糖',
  '南',
  '杏',
  '月',
  '鹿',
  '果',
  '豆',
  '芝',
  '阿',
  '初',
] as const;

const SECOND = [
  '酥',
  '满',
  '团',
  '子',
  '糖',
  '野',
  '卷',
  '丁',
  '盖',
  '芽',
  '圆',
  '朵',
  '豆',
  '瓜',
  '仁',
  '亮',
  '鹿',
  '果',
  '月',
  '云',
  '花',
  '栗',
  '杏',
  '柚',
] as const;

export const PLAYER_NAME_PREFIX = '王都居民-';

export function displayNameOf(shortName: string): string {
  return shortName.startsWith(PLAYER_NAME_PREFIX) ? shortName : `${PLAYER_NAME_PREFIX}${shortName}`;
}

function twoCharName(rng: ReturnType<typeof createRng>): string {
  return `${rng.pick(FIRST)}${rng.pick(SECOND)}`;
}

function candidateName(rng: ReturnType<typeof createRng>): string {
  const first = twoCharName(rng);
  // 大部分用 4 字（两个词组合），小部分用 2 字，兼顾可爱与唯一性。
  return rng.next() < 0.35 ? first : `${first}${twoCharName(rng)}`;
}

export function generateLocalName(seed: string): string {
  const rng = createRng(hashString(`${seed}:default-name`));
  return `${PLAYER_NAME_PREFIX}${candidateName(rng)}`;
}

export function generateNameCandidates(seed: string, count = 3): string[] {
  const rng = createRng(hashString(`${seed}:rename:${Date.now()}`));
  const seen = new Set<string>();
  const names: string[] = [];
  for (let attempt = 0; attempt < count * 12 && names.length < count; attempt += 1) {
    const short = candidateName(rng);
    if (seen.has(short)) continue;
    seen.add(short);
    names.push(`${PLAYER_NAME_PREFIX}${short}`);
  }
  return names;
}

/** 用于校验云端返回/旧存档里的名字，避免异常值进入 UI。 */
export function isValidDisplayName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!value.startsWith(PLAYER_NAME_PREFIX)) return false;
  const short = value.slice(PLAYER_NAME_PREFIX.length);
  return short.length >= 2 && short.length <= 4 && /^[\u4e00-\u9fa5]+$/.test(short);
}

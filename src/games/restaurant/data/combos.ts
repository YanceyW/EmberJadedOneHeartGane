import { findIngredient, ingredientName } from '../../../shared/content/ingredients';

export type RecipeShape = 'domino' | 'line3' | 'L3' | 'square4' | 'T4';

/**
 * 灶台配方：2–4 件材料按图案摆好后开火。
 * 输入用「份」抽象，不再区分菜单 needs 里的批量数量。
 */
export interface ComboRecipe {
  id: string;
  inputs: string[];
  shape: RecipeShape;
  output: string;
  seconds: number;
  hint: string;
}

export const RECIPE_SHAPE_LABEL: Record<RecipeShape, string> = {
  domino: '相邻两格',
  line3: '三连',
  L3: 'L 形',
  square4: '2×2 方块',
  T4: 'T 形',
};

/** 3×3 灶眼上的标准示意格位；旋转/镜像在匹配时自动处理。 */
export const RECIPE_SHAPE_CELLS: Record<RecipeShape, number[]> = {
  domino: [0, 1],
  line3: [0, 1, 2],
  L3: [0, 1, 3],
  square4: [0, 1, 3, 4],
  T4: [0, 1, 2, 4],
};

const SEEDS: readonly Omit<ComboRecipe, 'id'>[] = [
  // ---- 半成品链 ----
  { inputs: ['wheat', 'wheat'], shape: 'domino', output: 'flour', seconds: 1.4, hint: '两把小麦磨成面粉' },
  { inputs: ['flour', 'water'], shape: 'domino', output: 'noodle', seconds: 1.6, hint: '面粉加水揉成挂面' },
  { inputs: ['rice', 'rice'], shape: 'domino', output: 'riceflour', seconds: 1.4, hint: '水稻碾成米粉' },
  { inputs: ['corn', 'corn'], shape: 'domino', output: 'cornmeal', seconds: 1.4, hint: '玉米磨成玉米面' },
  { inputs: ['garlic', 'garlic'], shape: 'domino', output: 'garlicpaste', seconds: 1.2, hint: '大蒜捣成蒜蓉' },
  { inputs: ['soybean', 'water'], shape: 'domino', output: 'soymilk', seconds: 1.6, hint: '大豆泡水磨成豆浆' },
  { inputs: ['soymilk', 'soymilk'], shape: 'domino', output: 'tofu', seconds: 1.8, hint: '豆浆点成豆腐' },
  { inputs: ['soybean', 'soybean'], shape: 'domino', output: 'beanpaste', seconds: 1.6, hint: '大豆熬成豆沙' },
  { inputs: ['cabbage', 'water'], shape: 'domino', output: 'pickle', seconds: 1.8, hint: '白菜加水腌成酸菜' },
  { inputs: ['mushroom', 'water'], shape: 'domino', output: 'stock', seconds: 1.8, hint: '蘑菇加水熬成高汤' },
  { inputs: ['flour', 'milk'], shape: 'domino', output: 'bun', seconds: 2, hint: '面粉加牛奶蒸成馒头' },
  { inputs: ['flour', 'egg'], shape: 'domino', output: 'bread', seconds: 2, hint: '面粉加鸡蛋烤成面包' },
  { inputs: ['milk', 'milk'], shape: 'domino', output: 'cheese', seconds: 2, hint: '两份牛奶熬成奶酪' },
  { inputs: ['pork', 'stock'], shape: 'domino', output: 'pork-broth', seconds: 2.4, hint: '猪肉加菌菇高汤炖出肉汤' },

  // ---- 炒菜 ----
  { inputs: ['lettuce', 'garlicpaste'], shape: 'domino', output: 'veggie-stir', seconds: 2.2, hint: '小白菜配蒜蓉清炒' },
  { inputs: ['tomato', 'tofu'], shape: 'domino', output: 'tomato-tofu', seconds: 2.4, hint: '番茄和豆腐一起烧' },
  { inputs: ['potato', 'garlicpaste'], shape: 'domino', output: 'potato-shreds', seconds: 2.2, hint: '土豆配蒜蓉炒丝' },
  { inputs: ['tofu', 'cabbage', 'garlicpaste'], shape: 'L3', output: 'home-tofu', seconds: 2.8, hint: '豆腐、白菜、蒜蓉家常烧' },
  { inputs: ['stock', 'mushroom'], shape: 'domino', output: 'mushroom-soup', seconds: 2.4, hint: '高汤里再放蘑菇' },
  { inputs: ['corn', 'cornmeal'], shape: 'domino', output: 'corn-potage', seconds: 2.4, hint: '玉米加玉米面煮羹' },
  { inputs: ['eggplant', 'garlicpaste'], shape: 'domino', output: 'garlic-eggplant', seconds: 2.2, hint: '茄子配蒜蓉' },
  { inputs: ['tomato', 'egg'], shape: 'domino', output: 'tomato-egg', seconds: 2.2, hint: '番茄炒蛋，牧场鸡蛋最香' },
  { inputs: ['pork', 'cabbage'], shape: 'domino', output: 'pork-cabbage', seconds: 2.6, hint: '猪肉炖白菜' },
  { inputs: ['mutton', 'mushroom', 'stock'], shape: 'L3', output: 'mutton-soup', seconds: 2.8, hint: '羊肉、蘑菇、高汤炖汤' },

  // ---- 主食 ----
  { inputs: ['noodle', 'lettuce'], shape: 'domino', output: 'spring-noodle', seconds: 2.2, hint: '挂面配小白菜' },
  { inputs: ['noodle', 'tomato'], shape: 'domino', output: 'tomato-noodle', seconds: 2.2, hint: '挂面配番茄' },
  { inputs: ['noodle', 'pickle'], shape: 'domino', output: 'pickle-noodle', seconds: 2.2, hint: '挂面配酸菜' },
  { inputs: ['rice', 'carrot', 'onion'], shape: 'line3', output: 'veggie-rice', seconds: 2.6, hint: '米饭、胡萝卜、洋葱焖饭' },
  { inputs: ['bun', 'beanpaste'], shape: 'domino', output: 'beans-bun', seconds: 2.4, hint: '馒头夹豆沙' },
  { inputs: ['rice', 'egg'], shape: 'domino', output: 'egg-fried-rice', seconds: 2.2, hint: '米饭加鸡蛋炒' },
  { inputs: ['noodle', 'egg'], shape: 'domino', output: 'egg-noodle', seconds: 2.2, hint: '挂面加鸡蛋' },
  { inputs: ['bun', 'pork'], shape: 'domino', output: 'pork-bun', seconds: 2.6, hint: '馒头夹鲜肉馅' },
  { inputs: ['pork-broth', 'noodle'], shape: 'domino', output: 'pork-noodle', seconds: 2.8, hint: '猪肉高汤配挂面' },
  { inputs: ['stock', 'noodle', 'egg'], shape: 'line3', output: 'mixed-noodle', seconds: 3, hint: '高汤、挂面、鸡蛋煮成什锦汤面' },
  { inputs: ['stock', 'noodle', 'egg'], shape: 'L3', output: 'three-delight-noodle', seconds: 3, hint: '同样三样，L 形摆法做成三鲜烩面' },

  // ---- 点心 ----
  { inputs: ['pumpkin', 'flour'], shape: 'domino', output: 'pumpkin-cake', seconds: 2.4, hint: '南瓜和面粉煎饼' },
  { inputs: ['potato', 'onion', 'flour'], shape: 'L3', output: 'potato-pancake', seconds: 2.8, hint: '土豆、洋葱、面粉煎饼' },
  { inputs: ['grape', 'grape'], shape: 'domino', output: 'fruit-plate', seconds: 2, hint: '两份葡萄摆果盘' },
  { inputs: ['berry', 'beanpaste', 'riceflour'], shape: 'line3', output: 'berry-cake', seconds: 2.8, hint: '莓果、豆沙、米粉做糕' },
  { inputs: ['rose', 'flour', 'flour'], shape: 'L3', output: 'rose-cake', seconds: 2.8, hint: '玫瑰和两份面粉做鲜花饼' },
  { inputs: ['osmanthus', 'riceflour', 'riceflour'], shape: 'line3', output: 'osmanthus-cake', seconds: 2.8, hint: '桂花和两份米粉蒸糕' },
  { inputs: ['radish', 'flour'], shape: 'domino', output: 'radish-cake', seconds: 2.4, hint: '白萝卜和面粉蒸萝卜糕' },
  { inputs: ['cucumber', 'garlicpaste'], shape: 'domino', output: 'cucumber-salad', seconds: 2.2, hint: '黄瓜拍碎拌蒜蓉' },
  { inputs: ['milk', 'egg'], shape: 'domino', output: 'milk-pudding', seconds: 2.4, hint: '牛奶加鸡蛋蒸布丁' },
  { inputs: ['bread', 'cheese'], shape: 'domino', output: 'cheese-toast', seconds: 2.4, hint: '面包铺奶酪烤吐司' },

  // ---- 深链砂锅 ----
  { inputs: ['mixed-noodle', 'stock', 'mushroom', 'egg'], shape: 'square4', output: 'casserole-family', seconds: 3.4, hint: '什锦汤面、高汤、蘑菇、鸡蛋炖成砂锅全家福' },
  { inputs: ['mixed-noodle', 'pork-broth', 'egg', 'mushroom'], shape: 'T4', output: 'four-treasure-noodle', seconds: 3.4, hint: '什锦汤面配猪肉高汤、鸡蛋、蘑菇' },

  // ---- 茶饮 ----
  { inputs: ['rice', 'water'], shape: 'domino', output: 'ricemilk', seconds: 1.8, hint: '水稻磨成米浆' },
  { inputs: ['jasmine', 'water'], shape: 'domino', output: 'jasmine-tea', seconds: 1.8, hint: '茉莉泡水' },
  { inputs: ['chrysanthemum', 'water'], shape: 'domino', output: 'chrys-tea', seconds: 1.8, hint: '菊花泡水' },
  { inputs: ['osmanthus', 'water'], shape: 'domino', output: 'osmanthus-tea', seconds: 1.8, hint: '桂花泡水' },
  { inputs: ['daisy', 'water'], shape: 'domino', output: 'daisy-tea', seconds: 1.8, hint: '雏菊泡水' },
  { inputs: ['tulip', 'water'], shape: 'domino', output: 'tulip-tea', seconds: 1.8, hint: '郁金香泡水' },
  { inputs: ['sunflower', 'water'], shape: 'domino', output: 'sunflower-tea', seconds: 1.8, hint: '向日葵泡水' },
  { inputs: ['lilac', 'water'], shape: 'domino', output: 'lilac-tea', seconds: 1.8, hint: '风信子泡水' },
  { inputs: ['lotus', 'water'], shape: 'domino', output: 'lotus-tea', seconds: 1.8, hint: '荷花泡水' },
];

export const COMBO_RECIPES: readonly ComboRecipe[] = SEEDS.map((seed) => ({
  ...seed,
  id: seed.output,
}));

const RECIPE_BY_ID = new Map<string, ComboRecipe>();
const RECIPE_BY_SHAPE = new Map<string, ComboRecipe>();
for (const recipe of COMBO_RECIPES) {
  RECIPE_BY_ID.set(recipe.id, recipe);
  RECIPE_BY_SHAPE.set(recipeKey(recipe.inputs, recipe.shape), recipe);
}

export function recipeKey(inputs: readonly string[], shape: RecipeShape): string {
  return `${shape}:${[...inputs].sort().join('+')}`;
}

export function comboKey(inputs: readonly string[]): string {
  return [...inputs].sort().join('+');
}

export function findRecipeForShape(
  inputs: readonly string[],
  shape: RecipeShape,
): ComboRecipe | undefined {
  return RECIPE_BY_SHAPE.get(recipeKey(inputs, shape));
}

export function findRecipeForItems(inputs: readonly string[]): ComboRecipe | undefined {
  return COMBO_RECIPES.find(
    (recipe) => recipe.inputs.length === inputs.length && comboKey(recipe.inputs) === comboKey(inputs),
  );
}

/** 兼容旧测试/旧逻辑的两输入查询；新代码优先用 findRecipeForShape。 */
export function findCombo(a: string, b: string): ComboRecipe | undefined {
  return findRecipeForShape([a, b], 'domino');
}

export function combosForOutput(id: string): readonly ComboRecipe[] {
  return COMBO_RECIPES.filter((recipe) => recipe.output === id);
}

export function findRecipeById(id: string): ComboRecipe | undefined {
  return RECIPE_BY_ID.get(id);
}

export function recipeHintText(recipe: ComboRecipe): string {
  return `${recipe.inputs.map(ingredientName).join(' + ')} → ${ingredientName(recipe.output)}`;
}

/** 给营业客人显示的一行配方提示：最多展开一层半成品。 */
export function comboHintForOutput(id: string): string {
  const recipe = COMBO_RECIPES.find((entry) => entry.output === id);
  if (!recipe) return ingredientName(id);
  const label = (input: string): string => {
    const sub = COMBO_RECIPES.find((entry) => entry.output === input);
    return sub
      ? `${sub.inputs.map(ingredientName).join('+')}→${ingredientName(input)}`
      : ingredientName(input);
  };
  return `${recipe.inputs.map(label).join(' + ')} → ${ingredientName(id)}`;
}

/** 只有成菜/茶饮能端给客人；半成品继续留作下一道菜的输入。 */
export function isFinalGood(id: string): boolean {
  const kind = findIngredient(id)?.kind;
  return kind === 'dish' || kind === 'drink';
}

const STEP_CACHE = new Map<string, number>();

/** 这盘菜需要几次灶台操作（递归统计配方节点，按份数重复计算）。 */
export function recipeSteps(id: string, visiting = new Set<string>()): number {
  const cached = STEP_CACHE.get(id);
  if (cached !== undefined) return cached;
  if (visiting.has(id)) return 0;
  const recipe = COMBO_RECIPES.find((entry) => entry.output === id);
  if (!recipe) return 0;
  visiting.add(id);
  let steps = 1;
  for (const input of recipe.inputs) steps += recipeSteps(input, visiting);
  visiting.delete(id);
  STEP_CACHE.set(id, steps);
  return steps;
}

/** 某道菜依赖到的全部配方（含自身），用于建议与订单路径。 */
export function recipesInTree(id: string, visiting = new Set<string>()): ComboRecipe[] {
  const recipe = COMBO_RECIPES.find((entry) => entry.output === id);
  if (!recipe || visiting.has(id)) return [];
  visiting.add(id);
  const result: ComboRecipe[] = [recipe];
  for (const input of recipe.inputs) {
    result.push(...recipesInTree(input, visiting));
  }
  visiting.delete(id);
  return result;
}

/** 旧 combo-N 存档映射到稳定 slug。 */
const LEGACY_RECIPE_IDS: readonly string[] = [
  'flour',
  'noodle',
  'riceflour',
  'cornmeal',
  'garlicpaste',
  'soymilk',
  'tofu',
  'beanpaste',
  'pickle',
  'stock',
  'bun',
  'bread',
  'cheese',
  'veggie-stir',
  'tomato-tofu',
  'potato-shreds',
  'home-tofu',
  'mushroom-soup',
  'corn-potage',
  'garlic-eggplant',
  'tomato-egg',
  'pork-cabbage',
  'mutton-soup',
  'spring-noodle',
  'tomato-noodle',
  'pickle-noodle',
  'veggie-rice',
  'beans-bun',
  'egg-fried-rice',
  'egg-noodle',
  'pork-bun',
  'pumpkin-cake',
  'potato-pancake',
  'fruit-plate',
  'berry-cake',
  'rose-cake',
  'osmanthus-cake',
  'milk-pudding',
  'cheese-toast',
  'ricemilk',
  'jasmine-tea',
  'chrys-tea',
  'osmanthus-tea',
  'radish-cake',
  'cucumber-salad',
  'daisy-tea',
  'tulip-tea',
  'sunflower-tea',
  'lilac-tea',
  'lotus-tea',
];

export function findLegacyRecipe(id: string): ComboRecipe | undefined {
  const match = /^combo-(\d+)$/.exec(id);
  if (!match) return findRecipeById(id);
  const index = Number(match[1]) - 1;
  const stable = LEGACY_RECIPE_IDS[index];
  return stable ? findRecipeById(stable) : undefined;
}

const INPUT_IDS: string[] = [];
for (const recipe of COMBO_RECIPES) {
  for (const id of recipe.inputs) {
    if (!INPUT_IDS.includes(id)) INPUT_IDS.push(id);
  }
}

/** 灶台原料清单（按配方实际用到的东西，不是整个仓库）。 */
export const COMBO_INPUT_IDS: readonly string[] = INPUT_IDS;

/** 初始就能看到的提示：让玩家第一次打开灶台时有东西可试。 */
export const STARTER_HINTS: readonly string[] = ['noodle', 'tomato-egg', 'bread'];

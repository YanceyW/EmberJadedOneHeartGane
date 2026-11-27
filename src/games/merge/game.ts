import { GameContext, GameDefinition, GameInstance } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Renderer } from '../../core/render/renderer';
import { SPAWN_COST, mergeItem } from './data/items';
import { findRecipe } from './data/recipes';
import { missingNeeds, restockCost } from '../../shared/content/ingredients';
import {
  MergeSave,
  canFulfillMergeOrder,
  currentMergeOrder,
  fulfillMergeOrder,
  mergeCells,
  mergeScore,
  migrateMergeSave,
  sellFinished,
  spawnItem,
} from './systems/merge';
import { MergeTab, MergeView } from './view/merge-view';

const SAVE_KEY = 'save:merge';

class MergeGame implements GameInstance {
  private readonly view = new MergeView();
  private save: MergeSave;
  private tab: MergeTab = 'board';
  private selected: number | null = null;
  private message = '';
  private messageUntil = 0;
  private submitted = false;

  constructor(private readonly ctx: GameContext) {
    this.save = migrateMergeSave(this.ctx.storage.get<unknown>(SAVE_KEY, null));
  }

  update(_dt: number): void {}

  render(renderer: Renderer): void {
    this.view.render(
      renderer,
      this.save,
      this.ctx.profile.pantry(),
      this.tab,
      this.selected,
      this.ctx.profile.get().coins,
      Date.now() < this.messageUntil ? this.message : '',
    );
  }

  exit(): void {
    this.persist();
    if (!this.submitted) {
      this.submitted = true;
      void this.ctx.cloud.submitScore(
        'merge',
        mergeScore(this.save),
        this.save.totalMerges,
        this.ctx.profile.get().displayName,
      );
    }
  }

  onTap(x: number, y: number): void {
    const hit = this.view.hitTest(x, y);
    if (!hit) return;
    if (hit.kind === 'back') {
      this.ctx.exitGame();
      return;
    }
    if (hit.kind === 'tab') {
      this.tab = hit.tab;
      this.selected = null;
      this.ctx.feedback.tap();
      return;
    }
    if (hit.kind === 'recipe') {
      this.craft(hit.id, x, y);
      return;
    }
    if (hit.kind === 'restock') {
      this.restock(hit.id, x, y);
      return;
    }
    if (hit.kind === 'spawn') {
      this.spawn(x, y);
      return;
    }
    if (hit.kind === 'order') {
      this.fulfill(x, y);
      return;
    }
    if (hit.kind === 'sell') {
      this.sell(x, y);
      return;
    }
    this.pickCell(hit.index, x, y);
  }

  private spawn(x: number, y: number): void {
    if (!this.ctx.profile.spendCoins(SPAWN_COST)) {
      this.toast('王都币不够，先去玩一局吧');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    const index = spawnItem(this.save, this.ctx.rng);
    if (index === null) {
      this.ctx.profile.addCoins(SPAWN_COST);
      this.toast('加工台满了，先合成或卖成品');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    this.selected = index;
    this.persist();
    this.ctx.feedback.select();
    this.toast(`进货：${mergeItem(this.save.cells[index]).name}`);
  }

  private pickCell(index: number, x: number, y: number): void {
    const tier = this.save.cells[index];
    if (tier < 0) {
      this.ctx.feedback.invalid(x, y);
      return;
    }
    if (this.selected === null) {
      this.selected = index;
      this.ctx.feedback.tap();
      return;
    }
    if (this.selected === index) {
      this.selected = null;
      this.ctx.feedback.tap();
      return;
    }
    const result = mergeCells(this.save, this.selected, index);
    if (!result) {
      this.selected = index;
      this.ctx.feedback.tap();
      return;
    }
    this.selected = null;
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('sparkle', x, y, 0.8);
    this.toast(`合成 ${mergeItem(result.tier).name}`);
  }

  private fulfill(x: number, y: number): void {
    const order = currentMergeOrder(this.save);
    if (!canFulfillMergeOrder(this.save)) {
      this.toast('成品还不够，先合成');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    const result = fulfillMergeOrder(this.save);
    if (!result) return;
    this.ctx.profile.addCoins(result.coins);
    this.ctx.profile.addProsperity(result.prosperity);
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('coin', x, y, 0.9);
    this.toast(`${order.title}完成，+${result.coins} 王都币`);
  }

  private sell(x: number, y: number): void {
    const result = sellFinished(this.save);
    if (result.count <= 0) {
      this.toast('没有可卖的蛋糕或宴席');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    this.ctx.profile.addCoins(result.coins);
    this.persist();
    this.ctx.feedback.coin(x, y);
    this.toast(`卖出 ${result.count} 份成品，+${result.coins} 王都币`);
  }

  private craft(id: string, x: number, y: number): void {
    const recipe = findRecipe(id);
    if (!recipe) return;
    const profile = this.ctx.profile;
    if (recipe.coinCost > 0 && profile.get().coins < recipe.coinCost) {
      this.ctx.feedback.invalid(x, y);
      this.toast('王都币不够，先去玩一局吧');
      return;
    }
    if (!profile.takePantry(recipe.needs)) {
      this.ctx.feedback.invalid(x, y);
      this.toast('仓库里的材料不够，先去农场种一点');
      return;
    }
    if (recipe.coinCost > 0) profile.spendCoins(recipe.coinCost);
    profile.addPantry(recipe.gives.id, recipe.gives.amount);
    this.save.totalCrafts += 1;
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('sparkle', x, y, 0.8);
    this.toast(`${recipe.name}完成，仓库 +${recipe.gives.amount} 份`);
  }

  /** 缺料补齐：只买缺的那几样，价格是卖价的 3 倍（便利税）。 */
  private restock(id: string, x: number, y: number): void {
    const recipe = findRecipe(id);
    if (!recipe) return;
    const profile = this.ctx.profile;
    const pantry = profile.pantry();
    const missing = missingNeeds(pantry, recipe.needs);
    const cost = restockCost(pantry, recipe.needs);
    if (missing.length === 0 || cost <= 0) {
      this.ctx.feedback.invalid(x, y);
      this.toast('材料已经够了，直接做就行');
      return;
    }
    if (!profile.spendCoins(cost)) {
      this.ctx.feedback.invalid(x, y);
      this.toast(`补齐要 ${cost} 王都币，先攒一点`);
      return;
    }
    for (const need of missing) profile.addPantry(need.id, need.amount);
    this.persist();
    this.ctx.feedback.coin(x, y);
    this.toast(`补齐材料，-${cost} 王都币`);
  }

  private persist(): void {
    this.ctx.storage.set(SAVE_KEY, this.save);
  }
  private toast(text: string): void {
    this.message = text;
    this.messageUntil = Date.now() + 2200;
  }
}

const definition: GameDefinition = {
  id: 'merge',
  title: '王都加工屋',
  subtitle: '合并 · 加工 · 订单',
  version: '0.1.0',
  packageName: 'merge',
  orientation: 'portrait',
  accent: 'honey',
  create: (ctx) => new MergeGame(ctx),
};

GameRegistry.register(definition);

export default definition;

import { GameContext, GameDefinition, GameInstance } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Renderer } from '../../core/render/renderer';
import { findFlower } from './data/flowers';
import {
  GardenSave,
  canFulfillFlowerOrder,
  currentFlowerOrder,
  fulfillFlowerOrder,
  gardenScore,
  harvestAllFlowers,
  harvestFlower,
  legacyInventory,
  migrateGardenSave,
  needsWater,
  plantFlower,
  remainingSeconds,
  sellFlowers,
  waterAll,
  waterPlot,
} from './systems/garden';
import { GardenView } from './view/garden-view';

const SAVE_KEY = 'save:garden';

class GardenGame implements GameInstance {
  private readonly view = new GardenView();
  private save: GardenSave;
  private selectedFlower = 'daisy';
  private message = '';
  private messageUntil = 0;
  private submitted = false;

  constructor(private readonly ctx: GameContext) {
    const raw = this.ctx.storage.get<unknown>(SAVE_KEY, null);
    this.save = migrateGardenSave(raw);
    // v1 存档里的花一次性搬进王都仓库；迁移后存档不再带 inventory，不会重复搬。
    for (const [id, amount] of Object.entries(legacyInventory(raw))) {
      this.ctx.profile.addPantry(id, amount);
    }
  }

  update(_dt: number): void {}

  render(renderer: Renderer): void {
    this.view.render(
      renderer,
      this.save,
      this.ctx.profile.pantry(),
      this.selectedFlower,
      Date.now(),
      Date.now() < this.messageUntil ? this.message : '',
      this.ctx.profile.get().coins,
    );
  }

  exit(): void {
    this.persist();
    if (!this.submitted) {
      this.submitted = true;
      void this.ctx.cloud.submitScore(
        'garden',
        gardenScore(this.save),
        this.save.totalHarvests,
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
    if (hit.kind === 'seed') {
      if (findFlower(hit.flowerId)) {
        this.selectedFlower = hit.flowerId;
        this.ctx.feedback.select();
      }
      return;
    }
    if (hit.kind === 'harvest-all') {
      this.harvestAll(x, y);
      return;
    }
    if (hit.kind === 'water-all') {
      this.waterAll(x, y);
      return;
    }
    if (hit.kind === 'sell') {
      this.sell(x, y);
      return;
    }
    if (hit.kind === 'order') {
      this.fulfill(x, y);
      return;
    }
    this.handlePlot(hit.index, x, y);
  }

  private handlePlot(index: number, x: number, y: number): void {
    const now = Date.now();
    if (!this.save.plots[index]) {
      const flower = findFlower(this.selectedFlower);
      if (!flower) return;
      if (!this.ctx.profile.spendCoins(flower.seedCost)) {
        this.toast('王都币不够，先去玩一局吧');
        this.ctx.feedback.invalid(x, y);
        return;
      }
      const planted = plantFlower(this.save, index, flower.id, now);
      if (planted !== 'ok') {
        this.ctx.profile.addCoins(flower.seedCost);
        this.toast('这块花圃现在不能种');
        return;
      }
      this.persist();
      this.ctx.feedback.tap();
      this.ctx.feedback.burst('petal', x, y, 0.5);
      this.toast(`种下 ${flower.name}，${flower.growSeconds} 秒后开花`);
      return;
    }

    if (needsWater(this.save, index, now)) {
      waterPlot(this.save, index, now);
      this.persist();
      this.ctx.feedback.select();
      this.ctx.feedback.burst('bubble', x, y, 0.6);
      this.toast('浇过水，花开得更快了');
      return;
    }
    const harvested = harvestFlower(this.save, index, now, this.ctx.profile.pantry());
    if (harvested) {
      const flower = findFlower(harvested.flowerId);
      const newlyUnlocked = !this.ctx.profile.ingredientUnlocked(harvested.flowerId);
      this.ctx.profile.markIngredient(harvested.flowerId);
      this.ctx.profile.addProsperity(1);
      this.persist();
      this.ctx.feedback.reward(x, y);
      this.ctx.feedback.burst('petal', x, y, 0.8);
      this.toast(
        `收获 ${flower?.name ?? '花'} ×${harvested.amount}${
          newlyUnlocked ? ' · 营业已解锁' : ''
        }`,
      );
      return;
    }
    this.toast(`还要 ${remainingSeconds(this.save, index, now)} 秒`);
    this.ctx.feedback.invalid(x, y);
  }

  private harvestAll(x: number, y: number): void {
    const result = harvestAllFlowers(this.save, Date.now(), this.ctx.profile.pantry());
    if (result.total <= 0) {
      this.toast('还没有开好的花');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    const newlyUnlocked: string[] = [];
    for (const id of Object.keys(result.flowers)) {
      if (!this.ctx.profile.ingredientUnlocked(id)) newlyUnlocked.push(id);
      this.ctx.profile.markIngredient(id);
    }
    this.ctx.profile.addProsperity(result.total);
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.toast(
      `收获 ${result.total} 朵花${newlyUnlocked.length > 0 ? ' · 营业已解锁' : ''}`,
    );
  }

  private waterAll(x: number, y: number): void {
    const count = waterAll(this.save, Date.now());
    if (count <= 0) {
      this.toast('花圃都浇过了');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    this.persist();
    this.ctx.feedback.select();
    this.ctx.feedback.burst('bubble', x, y, 0.8);
    this.toast(`给 ${count} 株花浇了水`);
  }

  private sell(x: number, y: number): void {
    const result = sellFlowers(this.save, this.ctx.profile.pantry());
    if (result.count <= 0) {
      this.toast('花篮还是空的');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    this.ctx.profile.addCoins(result.coins);
    this.persist();
    this.ctx.feedback.coin(x, y);
    this.toast(`卖出 ${result.count} 朵花，+${result.coins} 王都币`);
  }

  private fulfill(x: number, y: number): void {
    if (!canFulfillFlowerOrder(this.save, this.ctx.profile.pantry())) {
      this.toast('花还不够，先种一点');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    const order = currentFlowerOrder(this.save);
    const result = fulfillFlowerOrder(this.save, this.ctx.profile.pantry());
    if (!result) return;
    this.ctx.profile.addCoins(result.coins);
    this.ctx.profile.addProsperity(result.prosperity);
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('petal', x, y, 0.9);
    this.toast(`${order.title}完成，+${result.coins} 王都币`);
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
  id: 'garden',
  title: '王都花园',
  subtitle: '播种 · 浇水 · 花束',
  version: '0.1.0',
  packageName: 'garden',
  orientation: 'portrait',
  accent: 'leaf',
  create: (ctx) => new GardenGame(ctx),
};

GameRegistry.register(definition);

export default definition;

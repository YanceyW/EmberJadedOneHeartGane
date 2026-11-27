import { GameContext, GameDefinition, GameInstance } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Renderer } from '../../core/render/renderer';
import { findCrop } from './data/crops';
import {
  FarmSave,
  currentOrder,
  fulfillOrder,
  harvest,
  harvestAll,
  legacyInventory,
  migrateFarmSave,
  nextPlotCost,
  plant,
  plotView,
  remainingSeconds,
  sellAll,
  unlockNextPlot,
} from './systems/farm';
import { FarmView } from './view/farm-view';

const SAVE_KEY = 'save:farm';

class FarmGame implements GameInstance {
  private readonly view = new FarmView();
  private save: FarmSave;
  private selectedCrop = 'wheat';
  private message = '';
  private messageUntil = 0;

  constructor(private readonly ctx: GameContext) {
    const raw = this.ctx.storage.get<unknown>(SAVE_KEY, null);
    this.save = migrateFarmSave(raw);
    // v1 存档的作物存在农场自己身上，v2 起统一搬进王都仓库。
    const legacy = legacyInventory(raw);
    for (const [id, amount] of Object.entries(legacy)) {
      this.ctx.profile.addPantry(id, amount);
    }
    if (Object.keys(legacy).length > 0) this.persist();
  }

  update(_dt: number): void {
    // 作物按真实时间成熟，不需要每帧推进逻辑。
  }

  render(renderer: Renderer): void {
    this.view.render(
      renderer,
      this.save,
      this.ctx.profile.pantry(),
      this.selectedCrop,
      Date.now(),
      Date.now() < this.messageUntil ? this.message : '',
      this.ctx.profile.get().coins,
    );
  }

  onTap(x: number, y: number): void {
    const hit = this.view.hitTest(x, y);
    if (!hit) return;

    if (hit.kind === 'back') {
      this.ctx.exitGame();
      return;
    }
    if (hit.kind === 'seed') {
      if (findCrop(hit.cropId)) {
        this.selectedCrop = hit.cropId;
        this.ctx.feedback.select();
      }
      return;
    }
    if (hit.kind === 'unlock') {
      this.tryUnlock(x, y);
      return;
    }
    if (hit.kind === 'order') {
      this.fulfillOrderAt(x, y);
      return;
    }
    if (hit.kind === 'harvest-all') {
      this.harvestAllAt(x, y);
      return;
    }
    if (hit.kind === 'sell') {
      this.sellAt(x, y);
      return;
    }
    this.handlePlot(hit.index, x, y);
  }

  private handlePlot(index: number, x: number, y: number): void {
    const now = Date.now();
    const state = plotView(this.save, index, now);
    if (state === 'locked') {
      this.tryUnlock(x, y, index);
      return;
    }
    if (state === 'growing') {
      this.toast(`还要 ${remainingSeconds(this.save, index, now)} 秒`);
      this.ctx.feedback.invalid(x, y);
      return;
    }
    if (state === 'ready') {
      const result = harvest(this.save, index, now, this.ctx.profile.pantry());
      if (!result) return;
      const crop = findCrop(result.cropId);
      const newlyUnlocked = !this.ctx.profile.ingredientUnlocked(result.cropId);
      this.ctx.profile.markIngredient(result.cropId);
      this.ctx.profile.addProsperity(1);
      this.persist();
      this.ctx.feedback.reward(x, y);
      this.ctx.feedback.burst('coin', x, y, 0.7);
      this.toast(
        `收获 ${crop?.name ?? '作物'} ×${result.amount}${
          newlyUnlocked ? ' · 营业已解锁' : ''
        }`,
      );
      return;
    }

    const crop = findCrop(this.selectedCrop);
    if (!crop) return;
    if (!this.ctx.profile.spendCoins(crop.seedCost)) {
      this.toast('王都币不够，先去玩一局吧');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    const result = plant(this.save, index, crop.id, now);
    if (result !== 'ok') {
      this.ctx.profile.addCoins(crop.seedCost);
      this.toast('这块地现在不能种');
      return;
    }
    this.persist();
    this.ctx.feedback.tap();
    this.ctx.feedback.burst('petal', x, y, 0.5);
    this.toast(`种下 ${crop.name}，${crop.growSeconds} 秒后成熟`);
  }

  private tryUnlock(x: number, y: number, index?: number): void {
    if (index !== undefined && index !== this.save.plotsUnlocked) {
      this.ctx.feedback.invalid(x, y);
      this.toast('要先开垦前一块');
      return;
    }
    const cost = nextPlotCost(this.save);
    if (cost === null) {
      this.ctx.feedback.invalid(x, y);
      this.toast('土地已经全部开垦');
      return;
    }
    if (!this.ctx.profile.spendCoins(cost)) {
      this.ctx.feedback.invalid(x, y);
      this.toast(`还差一些王都币，开垦需要 ${cost}`);
      return;
    }
    unlockNextPlot(this.save);
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.toast('新土地开垦好了');
  }

  private fulfillOrderAt(x: number, y: number): void {
    const order = currentOrder(this.save);
    const result = fulfillOrder(this.save, this.ctx.profile.pantry());
    if (!result) {
      this.ctx.feedback.invalid(x, y);
      this.toast('食材还不够，先种一点吧');
      return;
    }
    this.ctx.profile.addCoins(result.coins);
    this.ctx.profile.addProsperity(result.prosperity);
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('coin', x, y, 0.9);
    this.toast(`${order.title}完成，+${result.coins} 王都币`);
  }

  private harvestAllAt(x: number, y: number): void {
    const result = harvestAll(this.save, Date.now(), this.ctx.profile.pantry());
    if (result.total <= 0) {
      this.ctx.feedback.invalid(x, y);
      this.toast('还没有成熟的作物');
      return;
    }
    const newlyUnlocked: string[] = [];
    for (const id of Object.keys(result.crops)) {
      if (!this.ctx.profile.ingredientUnlocked(id)) newlyUnlocked.push(id);
      this.ctx.profile.markIngredient(id);
    }
    this.ctx.profile.addProsperity(result.total);
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('coin', x, y, 1);
    const names = Object.entries(result.crops)
      .map(([id, amount]) => `${findCrop(id)?.name ?? id}×${amount}`)
      .join('、');
    this.toast(
      `一键收获 ${result.total} 份：${names}${
        newlyUnlocked.length > 0 ? ' · 营业已解锁' : ''
      }`,
    );
  }

  private sellAt(x: number, y: number): void {
    const result = sellAll(this.save, this.ctx.profile.pantry());
    if (result.count <= 0) {
      this.ctx.feedback.invalid(x, y);
      this.toast('仓库还是空的');
      return;
    }
    this.ctx.profile.addCoins(result.coins);
    this.persist();
    this.ctx.feedback.coin(x, y);
    this.toast(`卖出 ${result.count} 份作物，+${result.coins} 王都币`);
  }

  private persist(): void {
    this.ctx.storage.set(SAVE_KEY, this.save);
    this.ctx.profile.save();
  }

  private toast(text: string): void {
    this.message = text;
    this.messageUntil = Date.now() + 2200;
  }
}

const definition: GameDefinition = {
  id: 'farm',
  title: '王都农场',
  subtitle: '播种 · 收获 · 订单',
  version: '0.1.0',
  packageName: 'farm',
  orientation: 'portrait',
  accent: 'leaf',
  create: (ctx) => new FarmGame(ctx),
};

GameRegistry.register(definition);

export default definition;

import { GameContext, GameDefinition, GameInstance } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Renderer } from '../../core/render/renderer';
import { FEED_BUY_COST, FEED_ID, findSpecies, productName } from './data/animals';
import {
  RanchSave,
  animalCost,
  buyAnimal,
  collectPen,
  feedNeed,
  feedPen,
  migrateRanchSave,
  penState,
  ranchScore,
  remainingSeconds,
  startWithCoins,
} from './systems/ranch';
import { RanchView } from './view/ranch-view';

const SAVE_KEY = 'save:ranch';

class RanchGame implements GameInstance {
  private readonly view = new RanchView();
  private save: RanchSave;
  private message = '';
  private messageUntil = 0;
  private time = 0;
  private submitted = false;

  constructor(private readonly ctx: GameContext) {
    this.save = migrateRanchSave(this.ctx.storage.get<unknown>(SAVE_KEY, null));
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(renderer: Renderer): void {
    this.view.render(
      renderer,
      this.save,
      this.ctx.profile.pantry(),
      this.ctx.profile.get().coins,
      Date.now(),
      this.time,
      Date.now() < this.messageUntil ? this.message : '',
      this.ctx.quality.reducedMotion,
    );
  }

  enter(): void {
    this.ctx.audio.playBgm('ranch', 'games/ranch/assets/bgm.mp3');
    this.ctx.analytics.track('ranch_open', { game: 'ranch' });
    if (!this.save.starterFeedGiven) {
      this.save.starterFeedGiven = true;
      this.ctx.profile.addPantry('feed', 2);
      this.toast('牧场开张：送你 2 份饲料，先喂饱母鸡吧');
    }
    if (
      this.save.totalProducts > 0 &&
      !this.ctx.profile.get().cosmetics.ownedTiles.includes('ranch')
    ) {
      this.ctx.profile.unlockTile('ranch');
    }
    this.persist();
  }

  exit(): void {
    this.persist();
    if (!this.submitted) {
      this.submitted = true;
      void this.ctx.cloud.submitScore(
        'ranch',
        ranchScore(this.save),
        this.save.totalProducts,
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
    if (hit.kind === 'buy') {
      this.buy(hit.index, x, y);
      return;
    }
    this.handlePen(hit.index, x, y);
  }

  private buy(index: number, x: number, y: number): void {
    const cost = animalCost(this.save, index);
    if (cost === null) {
      this.ctx.feedback.invalid(x, y);
      this.toast('这一栏已经住满了');
      return;
    }
    if (!this.ctx.profile.spendCoins(cost)) {
      this.ctx.feedback.invalid(x, y);
      this.toast(`还差一点王都币，买入需要 ${cost}`);
      return;
    }
    const species = findSpecies(this.save.pens[index]?.species ?? '');
    if (buyAnimal(this.save, index) !== 'ok') {
      this.ctx.profile.addCoins(cost);
      this.ctx.feedback.invalid(x, y);
      return;
    }
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('petal', x, y, 0.8);
    this.toast(`买入一只${species?.name ?? '动物'}，-${cost} 王都币`);
  }

  private handlePen(index: number, x: number, y: number): void {
    const now = Date.now();
    const state = penState(this.save, index, now);
    const species = findSpecies(this.save.pens[index]?.species ?? '');
    if (!species) return;
    if (state === 'empty') {
      this.toast('空栏：点右上角 + 买入动物');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    if (state === 'producing') {
      this.toast(`还要 ${remainingSeconds(this.save, index, now)} 秒才有产出`);
      this.ctx.feedback.invalid(x, y);
      return;
    }
    if (state === 'ready') {
      const wasFirst = this.save.totalProducts === 0;
      const result = collectPen(
        this.save,
        index,
        this.ctx.profile.pantry(),
        now,
      );
      if (!result) return;
      const newlyUnlocked = !this.ctx.profile.ingredientUnlocked(result.product);
      this.ctx.profile.markIngredient(result.product);
      this.ctx.profile.addProsperity(1);
      if (wasFirst) {
        this.ctx.profile.unlockTile('ranch');
      }
      this.persist();
      this.ctx.feedback.reward(x, y);
      this.ctx.feedback.burst('coin', x, y, 0.9);
      const unlockedText = newlyUnlocked ? ' · 营业已解锁' : '';
      this.toast(
        wasFirst
          ? `收获 ${productName(result.product)}×${result.amount}，三消牧场方块已解锁${unlockedText}`
          : `收获 ${productName(result.product)}×${result.amount}${unlockedText}`,
      );
      return;
    }

    const feedResult = feedPen(this.save, index, this.ctx.profile.pantry(), now);
    if (feedResult === 'ok') {
      this.persist();
      this.ctx.feedback.reward(x, y);
      this.ctx.feedback.burst('petal', x, y, 0.6);
      this.toast(`喂饱了 ${species.name}，开始产出`);
      return;
    }
    if (feedResult === 'missing') {
      const need = feedNeed(this.save, index);
      const store = this.ctx.profile.pantry();
      const have = Math.min(need, store[FEED_ID] ?? 0);
      const missing = Math.max(0, need - have);
      const cost = missing * FEED_BUY_COST;
      if (missing > 0 && !this.ctx.profile.spendCoins(cost)) {
        this.ctx.feedback.invalid(x, y);
        this.toast(`饲料还差 ${missing} 份，应急购买要 ${cost} 王都币`);
        return;
      }
      store[FEED_ID] = Math.max(0, (store[FEED_ID] ?? 0) - have);
      if (!startWithCoins(this.save, index, now)) {
        if (cost > 0) this.ctx.profile.addCoins(cost);
        store[FEED_ID] = (store[FEED_ID] ?? 0) + have;
        this.ctx.feedback.invalid(x, y);
        return;
      }
      this.persist();
      this.ctx.feedback.coin(x, y);
      this.ctx.feedback.burst('coin', x, y, 0.7);
      this.toast(
        missing > 0 ? `补买 ${missing} 份饲料，-${cost} 王都币` : `喂饱了 ${species.name}`,
      );
      return;
    }
    this.ctx.feedback.invalid(x, y);
    this.toast('这栏现在不能喂');
  }

  private persist(): void {
    this.ctx.storage.set(SAVE_KEY, this.save);
    this.ctx.profile.save();
  }

  private toast(text: string): void {
    this.message = text;
    this.messageUntil = Date.now() + 2400;
  }
}

const definition: GameDefinition = {
  id: 'ranch',
  title: '王都牧场',
  subtitle: '饲养 · 收蛋 · 挤奶',
  version: '0.1.0',
  packageName: 'ranch',
  orientation: 'portrait',
  accent: 'leaf',
  create: (ctx) => new RanchGame(ctx),
};

GameRegistry.register(definition);

export default definition;

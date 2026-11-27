import { GameContext, GameDefinition, GameInstance } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Renderer } from '../../core/render/renderer';
import { FEED_COST, findFishType } from './data/fish';
import {
  AquariumSave,
  addFish,
  aquariumScore,
  canFulfillFishOrder,
  collectAllCoins,
  collectFishCoins,
  currentFishOrder,
  feedFish,
  fulfillFishOrder,
  isMature,
  migrateAquariumSave,
  pendingFishCoins,
} from './systems/aquarium';
import { AquariumView } from './view/aquarium-view';

const SAVE_KEY = 'save:aquarium';

class AquariumGame implements GameInstance {
  private readonly view = new AquariumView();
  private save: AquariumSave;
  private selectedType = 'goldfish';
  private message = '';
  private messageUntil = 0;
  private submitted = false;

  constructor(private readonly ctx: GameContext) {
    this.save = migrateAquariumSave(this.ctx.storage.get<unknown>(SAVE_KEY, null));
  }

  update(_dt: number): void {}

  render(renderer: Renderer): void {
    this.view.render(
      renderer,
      this.save,
      this.selectedType,
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
        'aquarium',
        aquariumScore(this.save),
        this.save.totalFeeds,
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
      if (findFishType(hit.typeId)) {
        this.selectedType = hit.typeId;
        this.ctx.feedback.select();
      }
      return;
    }
    if (hit.kind === 'collect-all') {
      this.collectAll(x, y);
      return;
    }
    if (hit.kind === 'order') {
      this.fulfill(x, y);
      return;
    }
    this.handleSlot(hit.index, x, y);
  }

  private handleSlot(index: number, x: number, y: number): void {
    const now = Date.now();
    const fish = this.save.fish[index];
    if (!fish) {
      const type = findFishType(this.selectedType);
      if (!type) return;
      if (!this.ctx.profile.spendCoins(type.price)) {
        this.toast('王都币不够，先去玩一局吧');
        this.ctx.feedback.invalid(x, y);
        return;
      }
      if (addFish(this.save, type.id, now) === null) {
        this.ctx.profile.addCoins(type.price);
        this.toast('鱼缸满了');
        return;
      }
      this.persist();
      this.ctx.feedback.tap();
      this.ctx.feedback.burst('bubble', x, y, 0.8);
      this.toast(`${type.name}住进鱼缸啦`);
      return;
    }

    if (isMature(fish)) {
      const coins = collectFishCoins(this.save, index, now);
      if (coins > 0) {
        this.ctx.profile.addCoins(coins);
        this.persist();
        this.ctx.feedback.coin(x, y);
        this.ctx.feedback.burst('coin', x, y, 0.7);
        this.toast(`收到 ${coins} 王都币`);
      } else {
        const wait = pendingFishCoins(fish, now + 15_000) > 0 ? '再等等' : '泡泡还在攒';
        this.toast(`${wait}，每 15 秒产 1 币`);
        this.ctx.feedback.invalid(x, y);
      }
      return;
    }

    if (!this.ctx.profile.spendCoins(FEED_COST)) {
      this.toast(`鱼食要 ${FEED_COST} 王都币`);
      this.ctx.feedback.invalid(x, y);
      return;
    }
    const result = feedFish(this.save, index, now);
    if (result === 'idle') {
      this.ctx.profile.addCoins(FEED_COST);
      this.toast('这条鱼现在不用喂');
      return;
    }
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('bubble', x, y, 0.5);
    this.toast(result === 'mature' ? '鱼长大了，开始产泡泡币' : '喂食成功');
  }

  private collectAll(x: number, y: number): void {
    const coins = collectAllCoins(this.save, Date.now());
    if (coins <= 0) {
      this.toast('泡泡币还没攒够');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    this.ctx.profile.addCoins(coins);
    this.persist();
    this.ctx.feedback.coin(x, y);
    this.ctx.feedback.burst('coin', x, y, 1);
    this.toast(`收全部泡泡币 +${coins}`);
  }

  private fulfill(x: number, y: number): void {
    if (!canFulfillFishOrder(this.save)) {
      this.toast('成熟鱼还不够，先喂几条');
      this.ctx.feedback.invalid(x, y);
      return;
    }
    const order = currentFishOrder(this.save);
    const result = fulfillFishOrder(this.save);
    if (!result) return;
    this.ctx.profile.addCoins(result.coins);
    this.ctx.profile.addProsperity(result.prosperity);
    this.persist();
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('bubble', x, y, 1);
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
  id: 'aquarium',
  title: '王都水族馆',
  subtitle: '养鱼 · 喂食 · 造景',
  version: '0.1.0',
  packageName: 'aquarium',
  orientation: 'portrait',
  accent: 'sky',
  create: (ctx) => new AquariumGame(ctx),
};

GameRegistry.register(definition);

export default definition;

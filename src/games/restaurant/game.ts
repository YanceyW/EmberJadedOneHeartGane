import { GameContext, GameDefinition, GameInstance } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Renderer } from '../../core/render/renderer';
import { PointerPoint } from '../../core/input/input';
import { dayKey } from '../../shared/content/daily-orders';
import { ingredientName } from '../../shared/content/ingredients';
import { canServeTable, serveTable } from './systems/orders';
import {
  RestaurantSave,
  claimRestaurantDaily,
  ensureRestaurantDaily,
  migrateRestaurantSave,
  restaurantScore,
} from './systems/save';
import {
  CounterCells,
  addToCounter,
  firstEmptyCell,
  removeFromCounter,
} from './systems/counter';
import {
  StoveState,
  addToStove,
  clearBurnt,
  collectStove,
  detectShape,
  fireStove,
  qualityForStove,
  removeFromStove,
  stoveItems,
  tickStove,
} from './systems/stove';
import { AdviceCard } from './systems/advice';
import {
  collectAvailableIngredients,
  contextAdvice,
  ghostFor,
} from './systems/context-advice';
import { ComboRecipe, findRecipeById, recipeHintText } from './data/combos';
import { DropSource, dropOnRestaurant } from './game-drop';
import { serveCustomerOnShift } from './game-serve';
import {
  SHIFT_BASE_SUPPLY,
  SHIFT_SUPPLY,
  ShiftState,
  ShiftSummary,
  advanceShift,
  createShift,
  exitPenalty,
  settleShift,
  shiftSeed,
  storePrepared,
  unservedCustomers,
} from './systems/shift';
import {
  CraftTab,
  RestaurantPage,
  RestaurantViewState,
} from './view/restaurant-view-data';
import { RestaurantView } from './view/restaurant-view';
import { RestaurantHit } from './view/restaurant-types';

const SAVE_KEY = 'save:restaurant';

class RestaurantGame implements GameInstance {
  private readonly view = new RestaurantView();
  private save: RestaurantSave;
  private page: RestaurantPage = 'kitchen';
  private craftTab: CraftTab = 'farm';
  private shift: ShiftState | null = null;
  private summary: ShiftSummary | null = null;
  private selectedCounter: number | null = null;
  private selectedStove: number | null = null;
  private selectedPrepared: number | null = null;
  private exitPanel = false;
  private leaveAfterSettle = false;
  private message = '';
  private messageUntil = 0;
  private submitted = false;
  private drag: DropSource | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private dragPoint: { x: number; y: number } | null = null;
  private dragMoved = false;

  constructor(private readonly ctx: GameContext) {
    this.save = migrateRestaurantSave(this.ctx.storage.get<unknown>(SAVE_KEY, null));
    this.ensureDaily();
  }

  private ensureDaily(): void {
    if (ensureRestaurantDaily(this.save, dayKey(Date.now()))) {
      this.ctx.storage.set(SAVE_KEY, this.save);
    }
  }

  update(dt: number): void {
    if (this.shift && !this.summary && !this.exitPanel) {
      const events = advanceShift(this.shift, dt);
      for (const event of events) {
        if (event.kind === 'paid') {
          this.ctx.feedback.reward();
          this.toast(
            `客人付款 +${event.coins} 王都币 · 品质 ${Math.round(event.quality * 100)}%`,
          );
        } else if (event.kind === 'left') {
          this.ctx.feedback.invalid();
          this.toast(
            event.paid > 0
              ? `客人等太久走了，已上菜结算 +${event.paid}，连击归零`
              : '客人等太久走了，连击归零',
          );
        } else if (event.kind === 'spawn') {
          this.ctx.feedback.select();
        } else if (event.kind === 'stove') {
          if (event.event === 'ready') {
            this.ctx.feedback.pop(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
            this.toast('出锅了，趁热上菜；再放会变焦');
          } else if (event.event === 'burnt') {
            this.ctx.feedback.invalid();
            this.toast('一锅糊了，点灶台清焦');
          } else if (event.event === 'started') {
            const output = this.shift?.stoves[event.index]?.cooking?.output;
            if (output) this.discover(output);
          }
        }
      }
      return;
    }
    if (this.summary || this.shift) return;
    this.save.stoves.forEach((stove) => {
      for (const event of tickStove(stove, dt)) {
        if (event === 'started' && stove.cooking) this.discover(stove.cooking.output);
        else if (event === 'ready') this.ctx.feedback.pop(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
        else if (event === 'burnt') this.ctx.feedback.invalid();
      }
    });
  }

  render(renderer: Renderer): void {
    this.ensureDaily();
    const store = this.ctx.profile.pantry();
    const suggestions = this.currentAdvice();
    const state: RestaurantViewState = {
      save: this.save,
      store,
      coins: this.ctx.profile.get().coins,
      message: Date.now() < this.messageUntil ? this.message : '',
      counter: this.shift ? this.shift.counter : this.save.counter,
      stoves: this.shift ? this.shift.stoves : this.save.stoves,
      suggestions,
      ghost: this.currentGhost(suggestions),
      selectedCounter: this.selectedCounter,
      selectedStove: this.selectedStove,
      exitPanel: this.exitPanel,
      exitPenalty: this.shift && !this.summary ? exitPenalty(this.shift) : 0,
    };
    const dragId = this.dragId();
    const drag =
      dragId && this.dragPoint
        ? { id: dragId, point: this.dragPoint, quality: this.dragQuality() }
        : null;
    this.view.render(
      renderer,
      state,
      this.page,
      this.craftTab,
      this.shift,
      this.selectedPrepared,
      drag,
    );
    this.view.drawSettle(renderer.ctx, renderer.width, renderer.height, this.summary);
  }

  enter(): void {
    this.ctx.audio.playBgm('restaurant', 'games/restaurant/assets/bgm.mp3');
    this.ctx.analytics.track('restaurant_open', { game: 'restaurant' });
    this.ctx.profile.save();
  }

  exit(): void {
    if (this.shift && !this.summary) this.closeShift(true);
    this.ctx.storage.set(SAVE_KEY, this.save);
    if (!this.submitted) {
      this.submitted = true;
      void this.ctx.cloud.submitScore(
        'restaurant',
        restaurantScore(this.save),
        this.save.served,
        this.ctx.profile.get().displayName,
      );
    }
  }

  onTap(x: number, y: number): void {
    const hit = this.view.hitTest(x, y);
    if (!hit) return;
    if (hit.kind === 'settle') {
      const leave = this.leaveAfterSettle;
      this.summary = null;
      this.shift = null;
      this.selectedPrepared = null;
      this.selectedCounter = null;
      this.selectedStove = null;
      this.leaveAfterSettle = false;
      this.page = 'kitchen';
      this.ctx.feedback.tap();
      if (leave) this.ctx.exitGame();
      return;
    }
    if (hit.kind === 'exit-continue') {
      this.exitPanel = false;
      this.ctx.feedback.tap();
      return;
    }
    if (hit.kind === 'exit-close') {
      this.exitPanel = false;
      this.closeShift(false);
      return;
    }
    if (hit.kind === 'exit-leave') {
      this.exitPanel = false;
      this.leaveAfterSettle = true;
      this.closeShift(true);
      return;
    }
    if (hit.kind === 'back') {
      if (this.summary) {
        this.ctx.exitGame();
      } else if (this.shift) {
        this.exitPanel = true;
        this.ctx.feedback.tap();
      } else {
        this.ctx.exitGame();
      }
      return;
    }
    if (hit.kind === 'page') {
      if (this.summary || this.exitPanel) return;
      if (this.shift && hit.page !== 'shift') {
        this.toast('正在营业，先「打烊」再离开吧台');
        this.ctx.feedback.invalid();
        return;
      }
      this.page = hit.page;
      this.selectedCounter = null;
      this.selectedStove = null;
      this.selectedPrepared = null;
      this.ctx.feedback.tap();
      return;
    }
    if (hit.kind === 'craft-tab') {
      this.craftTab = hit.tab;
      this.ctx.feedback.tap();
      return;
    }
    if (hit.kind === 'palette') {
      this.addFromPalette(hit.id);
      return;
    }
    if (hit.kind === 'suggestion') {
      this.applySuggestion(hit.index);
      return;
    }
    if (hit.kind === 'close-shift') {
      if (!this.shift) {
        this.startShift();
      } else if (!this.summary) {
        if (unservedCustomers(this.shift) > 0) {
          this.exitPanel = true;
          this.toast('还有客人没上菜，确认打烊或继续营业');
          this.ctx.feedback.select();
        } else {
          this.closeShift(false);
        }
      }
      return;
    }
    if (hit.kind === 'counter') {
      if (!this.activeCounter()[hit.index]) {
        this.selectedCounter = null;
        this.ctx.feedback.tap();
        return;
      }
      this.selectedCounter = this.selectedCounter === hit.index ? null : hit.index;
      this.selectedStove = null;
      this.selectedPrepared = null;
      this.ctx.feedback.select();
      return;
    }
    if (hit.kind === 'stove-fire') {
      const stove = this.activeStoves()[hit.index];
      if (!stove) return;
      if (stove.burnt) {
        this.clearBurntStove(hit.index);
        return;
      }
      if (stove.ready) {
        this.collectFromStove(hit.index);
        return;
      }
      if (fireStove(stove)) {
        this.discover(stove.cooking?.output ?? '');
        this.ctx.feedback.pop(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
        this.toast('开火了，等它出锅');
        this.persist();
        return;
      }
      if (this.selectedCounter !== null) {
        this.moveCounterToStove(this.selectedCounter, hit.index);
        return;
      }
      if (this.selectedPrepared !== null) {
        this.movePreparedToStove(this.selectedPrepared, hit.index);
        return;
      }
      this.selectedStove = this.selectedStove === hit.index ? null : hit.index;
      this.ctx.feedback.select();
      return;
    }
    if (hit.kind === 'stove') {
      this.tapStove(hit);
      return;
    }
    if (hit.kind === 'prepared') {
      this.tapPrepared(hit.index);
      return;
    }
    if (hit.kind === 'customer') {
      if (this.selectedPrepared === null) {
        this.toast('先点成品柜的菜，或直接把菜拖给客人');
        this.ctx.feedback.invalid();
        return;
      }
      this.serveCustomer(hit.id, { kind: 'prepared', index: this.selectedPrepared });
      return;
    }
    if (hit.kind === 'serve-table') {
      this.serveTable(hit.index, x, y);
      return;
    }
  }

  onPress(point: PointerPoint): void {
    const hit = this.view.hitTest(point.x, point.y);
    this.drag = null;
    this.dragMoved = false;
    this.dragPoint = { x: point.x, y: point.y };
    this.dragStart = { x: point.x, y: point.y };
    if (!hit) return;
    if (hit.kind === 'palette') {
      this.drag = { kind: 'palette', id: hit.id };
    } else if (hit.kind === 'counter') {
      if (this.activeCounter()[hit.index]) this.drag = { kind: 'counter', index: hit.index };
    } else if (hit.kind === 'prepared' && this.shift?.prepared[hit.index]) {
      this.drag = { kind: 'prepared', index: hit.index };
    } else if (hit.kind === 'stove') {
      const stove = this.activeStoves()[hit.index];
      if (stove?.ready) this.drag = { kind: 'stove', index: hit.index };
      else if (hit.cell !== undefined && stove?.slots[hit.cell]) {
        this.drag = { kind: 'stove-cell', stoveIndex: hit.index, cell: hit.cell };
      }
    }
    if (this.drag) this.ctx.feedback.press();
  }

  onDrag(point: PointerPoint): void {
    if (!this.drag) return;
    this.dragPoint = { x: point.x, y: point.y };
    if (!this.dragStart) return;
    const dx = point.x - this.dragStart.x;
    const dy = point.y - this.dragStart.y;
    // 与输入层的 TAP_MOVE_LIMIT(22) 对齐：超过它才算拖动，避免 tap 与 drop 重复执行。
    if (dx * dx + dy * dy > 22 * 22) this.dragMoved = true;
  }

  onRelease(point: PointerPoint): void {
    const source = this.drag;
    const moved = this.dragMoved;
    this.drag = null;
    this.dragStart = null;
    this.dragPoint = null;
    this.dragMoved = false;
    if (!source || !moved) return;
    const hit = this.view.hitTest(point.x, point.y);
    this.drop(source, hit, point.x, point.y);
  }

  private activeCounter(): CounterCells {
    return this.shift ? this.shift.counter : this.save.counter;
  }

  private activeStoves(): StoveState[] {
    return this.shift ? this.shift.stoves : this.save.stoves;
  }

  private dragId(): string | null {
    if (!this.drag) return null;
    if (this.drag.kind === 'palette') return this.drag.id;
    if (this.drag.kind === 'counter') return this.activeCounter()[this.drag.index] ?? null;
    if (this.drag.kind === 'prepared') return this.shift?.prepared[this.drag.index]?.id ?? null;
    if (this.drag.kind === 'stove') return this.activeStoves()[this.drag.index]?.ready?.output ?? null;
    return this.activeStoves()[this.drag.stoveIndex]?.slots[this.drag.cell] ?? null;
  }

  private dragQuality(): number | undefined {
    if (!this.drag) return undefined;
    if (this.drag.kind === 'prepared') return this.shift?.prepared[this.drag.index]?.quality;
    if (this.drag.kind === 'stove') {
      const stove = this.activeStoves()[this.drag.index];
      return stove ? qualityForStove(stove) : undefined;
    }
    return undefined;
  }

  private currentAdvice(): AdviceCard[] {
    return contextAdvice({
      counter: this.activeCounter(),
      stoves: this.activeStoves(),
      customers: this.shift?.customers ?? [],
      prepared: this.shift?.prepared ?? [],
      selectedCounter: this.selectedCounter,
      selectedPrepared: this.selectedPrepared,
      selectedStove: this.selectedStove,
      drag: this.drag,
      dragId: this.dragId(),
      dragQuality: this.dragQuality(),
      available: collectAvailableIngredients(
        this.ctx.profile.pantry(),
        this.activeCounter(),
        this.activeStoves(),
        this.shift,
      ),
    });
  }

  private currentGhost(
    cards: readonly AdviceCard[],
  ): { index: number; recipe: ComboRecipe } | null {
    let itemId = this.dragId();
    if (!itemId && this.selectedCounter !== null) {
      itemId = this.activeCounter()[this.selectedCounter] ?? null;
    }
    if (!itemId && this.selectedPrepared !== null && this.shift) {
      itemId = this.shift.prepared[this.selectedPrepared]?.id ?? null;
    }
    if (!itemId && this.selectedStove !== null) {
      const stove = this.activeStoves()[this.selectedStove];
      itemId = stove ? (stoveItems(stove)[0] ?? null) : null;
    }
    if (!itemId) return null;
    return ghostFor(itemId, cards, this.activeStoves());
  }

  private applySuggestion(index: number): void {
    const card = this.currentAdvice()[index];
    if (!card) return;
    if (card.kind === 'customer' && card.customerId !== undefined) {
      if (this.selectedPrepared !== null) {
        this.serveCustomer(card.customerId, { kind: 'prepared', index: this.selectedPrepared });
        return;
      }
      if (this.selectedStove !== null && this.activeStoves()[this.selectedStove]?.ready) {
        this.serveCustomer(card.customerId, { kind: 'stove', index: this.selectedStove });
        return;
      }
    }
    if (card.stoveIndex !== undefined) {
      if (this.selectedCounter !== null) {
        this.moveCounterToStove(this.selectedCounter, card.stoveIndex);
        return;
      }
      if (this.selectedPrepared !== null) {
        this.movePreparedToStove(this.selectedPrepared, card.stoveIndex);
        return;
      }
      this.selectedStove = card.stoveIndex;
      this.selectedCounter = null;
    }
    this.toast(card.detail);
    this.ctx.feedback.select();
  }

  private addFromPalette(id: string): void {
    const index = firstEmptyCell(this.activeCounter());
    if (index < 0) {
      this.toast('备料台满了，先清一格');
      this.ctx.feedback.invalid();
      return;
    }
    this.addFromPaletteAt(id, index);
  }

  private addFromPaletteAt(id: string, index: number): void {
    const kitchen = !this.shift;
    const store = this.ctx.profile.pantry();
    if (kitchen && id !== 'water' && (store[id] ?? 0) < 1) {
      this.ctx.feedback.invalid();
      this.toast(`仓库里没有${ingredientName(id)}，去农场或牧场看看`);
      return;
    }
    const result = addToCounter(this.activeCounter(), index, id);
    if (result !== 'placed') {
      this.ctx.feedback.invalid();
      this.toast(result === 'blocked' ? '这一格已经有东西了' : '放不进去');
      return;
    }
    if (kitchen && id !== 'water') {
      store[id] = Math.max(0, (store[id] ?? 0) - 1);
      this.ctx.profile.save();
    }
    this.selectedCounter = null;
    this.selectedPrepared = null;
    this.selectedStove = null;
    this.ctx.feedback.select();
    this.persist();
  }

  private moveCounterToStove(counterIndex: number, stoveIndex: number, cell?: number): void {
    const counter = this.activeCounter();
    const id = counter[counterIndex];
    if (!id) return;
    const stove = this.activeStoves()[stoveIndex];
    if (!stove) return;
    const target = cell ?? this.bestStoveCell(stove, id);
    if (target < 0) {
      this.toast('灶眼满了，先等它出锅');
      this.ctx.feedback.invalid();
      return;
    }
    const result = addToStove(stove, target, id);
    if (result === 'placed' || result === 'matched') {
      removeFromCounter(counter, counterIndex);
      this.selectedCounter = null;
      this.selectedStove = stoveIndex;
      this.ctx.feedback.drop(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
      if (result === 'matched') this.toast('图案完成，准备开火');
      this.persist();
      return;
    }
    this.ctx.feedback.invalid();
    this.toast(result === 'busy' ? '这个灶台正在忙' : '这里放不下');
  }

  private movePreparedToStove(preparedIndex: number, stoveIndex: number, cell?: number): void {
    if (!this.shift) return;
    const dish = this.shift.prepared[preparedIndex];
    if (!dish) return;
    const stove = this.activeStoves()[stoveIndex];
    if (!stove) return;
    const slot = cell ?? this.bestStoveCell(stove, dish.id);
    if (slot < 0) {
      this.toast('灶眼满了');
      this.ctx.feedback.invalid();
      return;
    }
    const result = addToStove(stove, slot, dish.id);
    if (result === 'placed' || result === 'matched') {
      this.shift.prepared[preparedIndex] = null;
      this.selectedPrepared = null;
      this.selectedStove = stoveIndex;
      this.ctx.feedback.drop(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
      this.toast(`${ingredientName(dish.id)} 回灶台当深链材料（品质不继承）`);
      return;
    }
    this.ctx.feedback.invalid();
    this.toast(result === 'busy' ? '这个灶台正在忙' : '这里放不下');
  }

  private bestStoveCell(stove: StoveState, id: string): number {
    const empty = stove.slots
      .map((slot, index) => (slot ? -1 : index))
      .filter((index) => index >= 0);
    if (empty.length === 0) return -1;
    if (stoveItems(stove).length === 0) return empty[0];
    for (const index of empty) {
      const next = stove.slots.slice();
      next[index] = id;
      if (detectShape(next)) return index;
    }
    return empty[0];
  }

  private playQualitySfx(quality: number): void {
    const pitch = quality >= 0.99 ? 0 : quality >= 0.75 ? -1 : quality >= 0.5 ? -3 : -5;
    this.ctx.audio.playSfx('tick', { pitch, volume: quality < 0.5 ? 0.45 : 0.7 });
  }

  private clearBurntStove(stoveIndex: number): void {
    const stove = this.activeStoves()[stoveIndex];
    if (!stove || !clearBurnt(stove)) return;
    if (this.shift) {
      this.shift.recycledFeed += 1;
    } else {
      this.ctx.profile.addPantry('feed', 1);
    }
    this.ctx.feedback.drop(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
    this.ctx.audio.playSfx('invalid');
    this.toast(
      this.shift
        ? '焦炭回收 1 份饲料，打烊时入仓库'
        : '焦炭回收 1 份饲料，已入王都仓库',
    );
    this.persist();
  }

  private tapStove(hit: Extract<RestaurantHit, { kind: 'stove' }>): void {
    const stove = this.activeStoves()[hit.index];
    if (!stove) return;
    if (stove.burnt) {
      this.clearBurntStove(hit.index);
      return;
    }
    if (stove.ready) {
      this.collectFromStove(hit.index);
      return;
    }
    if (this.selectedPrepared !== null && hit.cell !== undefined) {
      this.movePreparedToStove(this.selectedPrepared, hit.index, hit.cell);
      return;
    }
    if (hit.cell !== undefined) {
      if (stove.slots[hit.cell] && this.selectedCounter === null) {
        this.returnStoveItem(hit.index, hit.cell);
        return;
      }
      if (this.selectedCounter !== null && !stove.slots[hit.cell]) {
        this.moveCounterToStove(this.selectedCounter, hit.index, hit.cell);
        return;
      }
    }
    if (this.selectedCounter !== null) {
      this.moveCounterToStove(this.selectedCounter, hit.index);
      return;
    }
    if (this.selectedPrepared !== null) {
      this.movePreparedToStove(this.selectedPrepared, hit.index);
      return;
    }
    this.selectedStove = this.selectedStove === hit.index ? null : hit.index;
    this.ctx.feedback.select();
  }

  private returnStoveItem(stoveIndex: number, cell: number): void {
    const counter = this.activeCounter();
    const empty = firstEmptyCell(counter);
    if (empty < 0) {
      this.toast('备料台满了，先清一格');
      this.ctx.feedback.invalid();
      return;
    }
    const id = removeFromStove(this.activeStoves()[stoveIndex], cell);
    if (!id) return;
    addToCounter(counter, empty, id);
    this.ctx.feedback.drop(this.ctx.renderer.width / 2, this.ctx.renderer.height / 2);
    this.toast(`收回 ${ingredientName(id)} 到备料台`);
    this.persist();
  }

  private collectFromStove(stoveIndex: number): void {
    if (this.shift) {
      const result = storePrepared(this.shift, stoveIndex, this.selectedPrepared ?? undefined);
      if (!result) {
        this.toast('成品柜满了，或这道还没出锅');
        this.ctx.feedback.invalid();
        return;
      }
      this.selectedStove = null;
      this.ctx.feedback.reward();
      this.playQualitySfx(result.dish.quality);
      this.toast(
        `${ingredientName(result.dish.id)} 放进成品柜 · 品质 ${Math.round(result.dish.quality * 100)}%`,
      );
      return;
    }
    const dish = collectStove(this.activeStoves()[stoveIndex]);
    if (!dish) {
      this.toast('这锅已经焦了，点掉清焦');
      this.ctx.feedback.invalid();
      return;
    }
    this.playQualitySfx(dish.quality);
    this.ctx.profile.addPantry(dish.id, 1);
    this.save.cooked += 1;
    this.persist();
    this.ctx.feedback.reward();
    this.toast(`${ingredientName(dish.id)} 已进仓库`);
  }

  private tapPrepared(index: number): void {
    if (!this.shift?.prepared[index]) return;
    if (this.selectedPrepared === index) {
      this.selectedPrepared = null;
      this.ctx.feedback.tap();
      return;
    }
    this.selectedCounter = null;
    this.selectedStove = null;
    const served = this.autoServePrepared(index);
    if (!served) {
      this.selectedPrepared = index;
      this.ctx.feedback.select();
    }
  }

  private autoServePrepared(index: number): boolean {
    if (!this.shift) return false;
    const dish = this.shift.prepared[index];
    if (!dish) return false;
    for (const customer of this.shift.customers) {
      if (customer.eating > 0) continue;
      const match = customer.orders.some(
        (id, orderIndex) => id === dish.id && customer.servedQuality[orderIndex] === null,
      );
      if (match) {
        this.serveCustomer(customer.id, { kind: 'prepared', index });
        return true;
      }
    }
    return false;
  }

  private serveCustomer(
    customerId: number,
    source: { kind: 'prepared'; index: number } | { kind: 'stove'; index: number },
  ): void {
    serveCustomerOnShift(
      {
        shift: () => this.shift,
        selectedPrepared: () => this.selectedPrepared,
        selectedStove: () => this.selectedStove,
        clearPrepared: () => {
          this.selectedPrepared = null;
        },
        clearStove: () => {
          this.selectedStove = null;
        },
        reward: () => this.ctx.feedback.reward(),
        select: () => this.ctx.feedback.select(),
        invalid: () => this.ctx.feedback.invalid(),
        toast: (text) => this.toast(text),
      },
      customerId,
      source,
    );
  }

  private drop(
    source: DropSource,
    hit: RestaurantHit | null,
    x: number,
    y: number,
  ): void {
    dropOnRestaurant(
      {
        shift: () => this.shift,
        counter: () => this.activeCounter(),
        stoves: () => this.activeStoves(),
        addFromPaletteAt: (id, index) => this.addFromPaletteAt(id, index),
        returnStoveItem: (stoveIndex, cell) => this.returnStoveItem(stoveIndex, cell),
        moveCounterToStove: (counterIndex, stoveIndex, cell) =>
          this.moveCounterToStove(counterIndex, stoveIndex, cell),
        movePreparedToStove: (preparedIndex, stoveIndex, cell) =>
          this.movePreparedToStove(preparedIndex, stoveIndex, cell),
        collectFromStove: (stoveIndex) => this.collectFromStove(stoveIndex),
        serveCustomer: (customerId, serveSource) =>
          this.serveCustomer(customerId, serveSource),
        restorePantry: (id) => this.ctx.profile.addPantry(id, 1),
        clearCounterSelection: () => {
          this.selectedCounter = null;
        },
        clearPreparedSelection: () => {
          this.selectedPrepared = null;
        },
        feedbackDrop: (dropX, dropY) => this.ctx.feedback.drop(dropX, dropY),
        feedbackInvalid: (dropX, dropY) => this.ctx.feedback.invalid(dropX, dropY),
        feedbackReward: (dropX, dropY) => this.ctx.feedback.reward(dropX, dropY),
        toast: (text) => this.toast(text),
        persist: () => this.persist(),
      },
      source,
      hit,
      x,
      y,
    );
  }

  private serveTable(index: number, x: number, y: number): void {
    this.ensureDaily();
    if (!canServeTable(this.save, index, this.ctx.profile.pantry())) {
      this.ctx.feedback.invalid(x, y);
      this.toast('成品柜里没有这道菜，去备料台/灶台做一份');
      return;
    }
    const result = serveTable(this.save, index, this.ctx.profile.pantry());
    if (!result) return;
    this.save.dailyServed += 1;
    const daily = claimRestaurantDaily(this.save);
    this.ctx.profile.save();
    this.ctx.profile.addCoins(result.coins);
    this.ctx.profile.addProsperity(result.prosperity);
    if (daily) {
      this.ctx.profile.addCoins(daily.coins);
      this.ctx.profile.addProsperity(daily.prosperity);
    }
    this.ctx.storage.set(SAVE_KEY, this.save);
    this.ctx.feedback.reward(x, y);
    this.ctx.feedback.burst('coin', x, y, 0.9);
    this.toast(
      `${result.item.name}上桌，+${result.coins} 王都币${
        daily ? ` · 今日目标达成 +${daily.coins} 币` : ''
      }`,
    );
  }

  private ranchSupplyUnlocked(): boolean {
    const profile = this.ctx.profile.get() as {
      cosmetics?: { ownedTiles?: readonly string[] };
    };
    const tiles = profile.cosmetics?.ownedTiles;
    return Array.isArray(tiles) && tiles.includes('ranch');
  }

  private startShift(): void {
    const supply = this.ranchSupplyUnlocked() ? SHIFT_SUPPLY : SHIFT_BASE_SUPPLY;
    this.shift = createShift(shiftSeed(dayKey(Date.now()), this.save.shifts), supply);
    this.summary = null;
    this.exitPanel = false;
    this.leaveAfterSettle = false;
    this.selectedPrepared = null;
    this.selectedCounter = null;
    this.selectedStove = null;
    this.page = 'shift';
    this.ctx.feedback.tap();
    this.toast(
      supply === SHIFT_SUPPLY
        ? '开张啦：牧场蛋奶已解锁；先补备料台，再摆 3×3 灶眼'
        : '开张啦：牧场首次收获后解锁蛋奶；先补备料台，再摆 3×3 灶眼',
    );
  }

  private closeShift(penalized: boolean): void {
    if (!this.shift || this.summary) return;
    const summary = settleShift(this.shift, penalized);
    this.summary = summary;
    this.save.shifts += 1;
    this.save.bestRevenue = Math.max(this.save.bestRevenue, summary.revenue);
    this.save.bestCombo = Math.max(this.save.bestCombo, summary.bestCombo);
    this.ctx.profile.addCoins(summary.netRevenue);
    const walletLoss = Math.min(50, Math.max(0, summary.penalty - summary.revenue));
    if (walletLoss > 0) this.ctx.profile.loseCoins(walletLoss);
    this.ctx.profile.addProsperity(summary.prosperity);
    if (summary.recycledFeed > 0) {
      this.ctx.profile.addPantry('feed', summary.recycledFeed);
    }
    this.ctx.storage.set(SAVE_KEY, this.save);
    this.selectedPrepared = null;
    this.selectedCounter = null;
    this.selectedStove = null;
    this.ctx.feedback.reward();
    if (summary.penalty > 0) {
      this.toast(`打烊结算：净收入 ${summary.netRevenue}，赔偿 ${summary.penalty}`);
    } else {
      this.toast(`打烊结算：净收入 ${summary.netRevenue}`);
    }
  }

  private discover(recipeId: string): void {
    if (!recipeId || this.save.discovered.includes(recipeId)) return;
    const recipe = findRecipeById(recipeId);
    if (!recipe) return;
    this.save.discovered.push(recipe.id);
    this.toast(`发现新配方：${recipeHintText(recipe)}`);
    this.ctx.storage.set(SAVE_KEY, this.save);
  }

  private persist(): void {
    this.ctx.storage.set(SAVE_KEY, this.save);
  }

  private toast(text: string): void {
    this.message = text;
    this.messageUntil = Date.now() + 2400;
  }
}

const definition: GameDefinition = {
  id: 'restaurant',
  title: '王都餐厅',
  subtitle: '备料 · 灶台 · 营业',
  version: '0.4.0',
  packageName: 'restaurant',
  orientation: 'portrait',
  accent: 'peach',
  create: (ctx) => new RestaurantGame(ctx),
};

GameRegistry.register(definition);

export default definition;

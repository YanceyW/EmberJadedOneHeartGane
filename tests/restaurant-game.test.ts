import { describe, expect, it } from 'vitest';
import type { GameContext } from '../src/core/types';
import type { Renderer } from '../src/core/render/renderer';
import definition from '../src/games/restaurant/game';

function fakeContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => gradient;
      }
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'canvas') return {};
      if (prop in target) return target[prop];
      return () => undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function fakeRenderer(): Renderer {
  return {
    ctx: fakeContext(),
    width: 750,
    height: 1624,
    safeTop: 88,
    safeBottom: 68,
    capsuleBottom: 164,
  } as unknown as Renderer;
}

function noopProxy(): Record<string, (...args: unknown[]) => unknown> {
  return new Proxy(
    {},
    {
      get: () => () => undefined,
    },
  ) as Record<string, (...args: unknown[]) => unknown>;
}

function makeContext(startingCoins = 300): { ctx: GameContext; pantry: Record<string, number>; storage: Map<string, unknown> } {
  const page: Record<string, number> = {
    water: 5,
    flour: 5,
    egg: 5,
    milk: 5,
    tomato: 5,
    noodle: 5,
    stock: 5,
    mushroom: 5,
    onion: 5,
  };
  const storage = new Map<string, unknown>();
  let wallet = startingCoins;
  const profile = {
    pantry: () => page,
    get: () => ({
      coins: wallet,
      displayName: '测试',
      ingredientUnlocks: Object.keys(page),
      cosmetics: { ownedTiles: [] as string[] },
    }),
    save: () => undefined,
    addCoins: (amount: number) => {
      if (Number.isFinite(amount) && amount > 0) wallet += Math.floor(amount);
    },
    addProsperity: (amount: number) => {
      void amount;
    },
    loseCoins: (amount: number) => {
      const actual = Math.min(wallet, Math.max(0, Math.floor(amount)));
      wallet -= actual;
      return actual;
    },
    addPantry: (id: string, amount = 1) => {
      page[id] = (page[id] ?? 0) + amount;
    },
  };
  const ctx = {
    gameId: 'restaurant',
    renderer: fakeRenderer(),
    storage: {
      get: (key: string, fallback: unknown) => (storage.has(key) ? storage.get(key) : fallback),
      set: (key: string, value: unknown) => {
        storage.set(key, value);
      },
      remove: (key: string) => {
        storage.delete(key);
      },
    },
    profile,
    feedback: noopProxy(),
    audio: noopProxy(),
    analytics: noopProxy(),
    cloud: { submitScore: async () => undefined },
    quality: { reducedMotion: false },
    exitGame: () => undefined,
  } as unknown as GameContext;
  return { ctx, pantry: page, storage };
}

describe('restaurant controller', () => {
  it('drags a material from the supply to the counter and then to a stove cell', () => {
    const { ctx, storage } = makeContext();
    const game = definition.create(ctx);
    game.enter?.();
    game.render(ctx.renderer);
    // 备料台页底部第一格是清水；拖到备料台第一格。
    game.onPress({ x: 80, y: 1220 });
    game.onDrag({ x: 80, y: 470 });
    game.onRelease({ x: 80, y: 470 });
    let saved = storage.get('save:restaurant') as {
      counter: Array<string | null>;
      stoves: Array<{ slots: Array<string | null> }>;
    };
    expect(saved.counter[0]).toBe('water');
    expect(saved.stoves[0].slots[0]).toBeNull();
    // 再拖到灶眼第一格。
    game.onPress({ x: 80, y: 470 });
    game.onDrag({ x: 80, y: 870 });
    game.onRelease({ x: 80, y: 870 });
    saved = storage.get('save:restaurant') as typeof saved;
    expect(saved.counter[0]).toBeNull();
    expect(saved.stoves[0].slots[0]).toBe('water');
    game.exit?.();
  });

  it('never takes the wallet below zero on a negative settlement', () => {
    const { ctx } = makeContext(5);
    const game = definition.create(ctx);
    game.enter?.();
    game.render(ctx.renderer);
    game.onTap(598, 277);
    game.render(ctx.renderer);
    game.onTap(624, 346);
    for (let i = 0; i < 8; i += 1) game.update(0.5);
    game.render(ctx.renderer);
    game.exit?.();
    expect(ctx.profile.get().coins).toBe(0);
  });

  it('can open, switch to shift, start, add water and exit without throwing', () => {
    const { ctx } = makeContext();
    const game = definition.create(ctx);
    expect(() => {
      game.enter?.();
      game.render(ctx.renderer);
      // 页签「营业」
      game.onTap(598, 277);
      game.render(ctx.renderer);
      // 开张
      game.onTap(624, 346);
      game.render(ctx.renderer);
      game.update(3);
      game.render(ctx.renderer);
      // 无限供应第一格（水）→ 备料台
      game.onTap(80, 1460);
      game.render(ctx.renderer);
      // 选备料台第一格，再点到灶眼第一格
      game.onTap(80, 1000);
      game.render(ctx.renderer);
      game.onTap(80, 670);
      game.render(ctx.renderer);
      // 第二格配料（面粉）→ 备料台 → 灶眼第二格，摆成相邻两格
      game.onTap(160, 1460);
      game.render(ctx.renderer);
      game.onTap(200, 1000);
      game.render(ctx.renderer);
      game.onTap(150, 670);
      game.render(ctx.renderer);
      game.update(1);
      game.render(ctx.renderer);
      game.update(8);
      game.render(ctx.renderer);
      // 点灶台收取出锅的面条，进成品柜
      game.onTap(300, 700);
      game.render(ctx.renderer);
      game.exit?.();
    }).not.toThrow();
  });
});

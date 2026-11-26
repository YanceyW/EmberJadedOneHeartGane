import { AppServices } from '../app/services';
import { GameContext, GameDefinition, GameInstance } from '../types';
import { Renderer } from '../render/renderer';
import { Scene } from './scene';
import { TweenManager } from '../anim/tween';

export class GameScene implements Scene {
  readonly key: string;
  private readonly instance: GameInstance;
  private readonly tweens = new TweenManager();

  constructor(
    definition: GameDefinition,
    services: AppServices,
    onExit: () => void,
  ) {
    this.key = `game:${definition.id}`;
    const ctx: GameContext = {
      ...services,
      gameId: definition.id,
      tweens: this.tweens,
      exitGame: onExit,
    };
    this.instance = definition.create(ctx);
  }

  enter(): void | Promise<void> {
    return this.instance.enter?.();
  }

  exit(): void {
    this.instance.exit?.();
    // 退出时把所有动画直接落终态，避免残留回调改动已销毁的场景。
    this.tweens.skipAll();
    this.tweens.clear();
  }

  update(dt: number): void {
    this.tweens.update(dt);
    this.instance.update(dt);
  }

  render(renderer: Renderer): void {
    this.instance.render(renderer);
  }

  onTap(x: number, y: number): void {
    this.instance.onTap?.(x, y);
  }
}

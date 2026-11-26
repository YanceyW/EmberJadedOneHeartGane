import { AppServices } from '../app/services';
import { GameContext, GameDefinition, GameInstance } from '../types';
import { Renderer } from '../render/renderer';
import { Scene } from './scene';

export class GameScene implements Scene {
  readonly key: string;
  private readonly instance: GameInstance;

  constructor(
    definition: GameDefinition,
    services: AppServices,
    onExit: () => void,
  ) {
    this.key = `game:${definition.id}`;
    const ctx: GameContext = {
      ...services,
      gameId: definition.id,
      exitGame: onExit,
    };
    this.instance = definition.create(ctx);
  }

  enter(): void | Promise<void> {
    return this.instance.enter?.();
  }

  exit(): void {
    this.instance.exit?.();
  }

  update(dt: number): void {
    this.instance.update(dt);
  }

  render(renderer: Renderer): void {
    this.instance.render(renderer);
  }

  onTap(x: number, y: number): void {
    this.instance.onTap?.(x, y);
  }
}

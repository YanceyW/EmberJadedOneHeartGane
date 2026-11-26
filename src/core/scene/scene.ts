import { Renderer } from '../render/renderer';

export interface Scene {
  readonly key: string;
  enter(): void | Promise<void>;
  exit(): void;
  update(dt: number): void;
  render(renderer: Renderer): void;
  onTap?(x: number, y: number): void;
}

export class SceneManager {
  private current: Scene | null = null;
  private replacing = false;

  /** 场景切换：统一 160ms 交叉淡入，避免每个场景各写一套。 */
  transitionMs = 160;
  private transition = 0;

  async replace(scene: Scene): Promise<void> {
    if (this.replacing) return;
    this.replacing = true;
    this.transition = 1;
    try {
      if (this.current) {
        try {
          this.current.exit();
        } catch {
          // 单个场景退出失败不应阻止切换。
        }
      }
      this.current = scene;
      await scene.enter();
    } finally {
      this.replacing = false;
    }
  }

  update(dt: number): void {
    this.current?.update(dt);
    if (this.transition > 0) {
      this.transition = Math.max(0, this.transition - dt * (1000 / this.transitionMs));
    }
  }

  render(renderer: Renderer): void {
    this.current?.render(renderer);

    // 新场景从浅色淡入，避免「黑一下」的突兀切换。
    if (this.transition > 0.001) {
      const ctx = renderer.ctx;
      ctx.save();
      ctx.globalAlpha = this.transition * 0.85;
      ctx.fillStyle = '#FFF6E9';
      ctx.fillRect(0, 0, renderer.width, renderer.height);
      ctx.restore();
    }
  }

  tap(x: number, y: number): void {
    this.current?.onTap?.(x, y);
  }

  get activeKey(): string {
    return this.current?.key ?? '';
  }
}

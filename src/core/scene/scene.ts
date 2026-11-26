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

  async replace(scene: Scene): Promise<void> {
    if (this.replacing) return;
    this.replacing = true;
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
  }

  render(renderer: Renderer): void {
    this.current?.render(renderer);
  }

  tap(x: number, y: number): void {
    this.current?.onTap?.(x, y);
  }

  get activeKey(): string {
    return this.current?.key ?? '';
  }
}

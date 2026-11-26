import { GameContext, GameDefinition, GameInstance } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Renderer } from '../../core/render/renderer';
import { drawPanel, drawText, Rect } from '../../shared/design-system/draw';
import { COLORS, FONT, RADIUS } from '../../shared/design-system/tokens';

class TemplateGame implements GameInstance {
  constructor(private readonly ctx: GameContext) {}

  update(_dt: number): void {
    // 在这里推进本局状态。
  }

  render(renderer: Renderer): void {
    const ctx = renderer.ctx;
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(0, 0, renderer.width, renderer.height);

    const panel: Rect = { x: 75, y: renderer.height / 2 - 160, w: renderer.width - 150, h: 320 };
    drawPanel(ctx, panel, { fill: COLORS.paper, radius: RADIUS.xl });
    drawText(ctx, '__TITLE__', renderer.width / 2, panel.y + 100, {
      size: FONT.display,
      weight: '700',
      align: 'center',
    });
    drawText(ctx, '新场馆骨架', renderer.width / 2, panel.y + 160, {
      size: FONT.body,
      color: COLORS.inkSoft,
      align: 'center',
    });
    drawText(ctx, '点击返回大厅', renderer.width / 2, panel.y + 240, {
      size: FONT.caption,
      color: COLORS.jade,
      align: 'center',
    });
  }

  onTap(): void {
    this.ctx.exitGame();
  }
}

const definition: GameDefinition = {
  id: '__ID__',
  title: '__TITLE__',
  subtitle: '__SUBTITLE__',
  version: '0.1.0',
  packageName: '__ID__',
  orientation: 'portrait',
  accent: '__ACCENT__',
  create: (ctx) => new TemplateGame(ctx),
};

GameRegistry.register(definition);

export default definition;

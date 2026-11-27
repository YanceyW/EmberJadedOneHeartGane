/**
 * 王都仓库的货物图形：作物、花卉、半成品、茶饮、成菜。
 * 全部程序化绘制（0 字节素材），农场 / 花园 / 餐厅 / 大厅仓库共用这一份，
 * 保证「同一件东西在任何界面长得一样」。
 */
import { COLORS } from './tokens';
import { drawStar } from './draw';
import { inkEllipse, inkLine, inkRoundRect } from './paint';

type Glyph =
  | 'leafy'
  | 'head'
  | 'root'
  | 'bulb'
  | 'round'
  | 'berry'
  | 'tuber'
  | 'long'
  | 'cob'
  | 'gourd'
  | 'eggplant'
  | 'mushroom'
  | 'pods'
  | 'grain'
  | 'cluster'
  | 'flower-round'
  | 'flower-bell'
  | 'flower-spade'
  | 'flower-star'
  | 'flower-sun'
  | 'flower-cluster'
  | 'flower-lotus'
  | 'bag'
  | 'noodles'
  | 'block'
  | 'jar'
  | 'steamed'
  | 'pot'
  | 'cup'
  | 'glass'
  | 'stirfry'
  | 'noodle-bowl'
  | 'soup-bowl'
  | 'cake'
  | 'bun-plate'
  | 'fruit-plate'
  | 'pancake'
  | 'rice-bowl'
  | 'egg'
  | 'meat'
  | 'toast';

interface GoodsLook {
  glyph: Glyph;
  color: string;
  shade: string;
}

export const GOODS_LOOKS: Record<string, GoodsLook> = {
  water: { glyph: 'glass', color: COLORS.water, shade: COLORS.waterDeep },
  lettuce: { glyph: 'leafy', color: COLORS.leaf, shade: COLORS.grassDeep },
  wheat: { glyph: 'grain', color: COLORS.honey, shade: COLORS.honeyDeep },
  rice: { glyph: 'grain', color: COLORS.cream, shade: COLORS.honeyDeep },
  soybean: { glyph: 'pods', color: COLORS.mint, shade: COLORS.mintDeep },
  tomato: { glyph: 'round', color: COLORS.coral, shade: COLORS.petalDeep },
  radish: { glyph: 'root', color: COLORS.paper, shade: COLORS.inkSoft },
  carrot: { glyph: 'root', color: COLORS.coral, shade: COLORS.petalDeep },
  cucumber: { glyph: 'long', color: COLORS.grass, shade: COLORS.grassDeep },
  garlic: { glyph: 'bulb', color: COLORS.paper, shade: COLORS.inkSoft },
  berry: { glyph: 'berry', color: COLORS.berry, shade: COLORS.petalDeep },
  potato: { glyph: 'tuber', color: COLORS.honey, shade: COLORS.honeyDeep },
  onion: { glyph: 'bulb', color: COLORS.lilac, shade: COLORS.lilacDeep },
  corn: { glyph: 'cob', color: COLORS.honey, shade: COLORS.honeyDeep },
  cabbage: { glyph: 'head', color: COLORS.mint, shade: COLORS.leaf },
  mushroom: { glyph: 'mushroom', color: COLORS.peach, shade: COLORS.coral },
  pumpkin: { glyph: 'gourd', color: COLORS.honey, shade: COLORS.honeyDeep },
  eggplant: { glyph: 'eggplant', color: COLORS.lilacDeep, shade: COLORS.teal },
  grape: { glyph: 'cluster', color: COLORS.lilac, shade: COLORS.lilacDeep },

  daisy: { glyph: 'flower-round', color: COLORS.cream, shade: COLORS.honey },
  tulip: { glyph: 'flower-bell', color: COLORS.petal, shade: COLORS.petalDeep },
  sunflower: { glyph: 'flower-sun', color: COLORS.honey, shade: COLORS.honeyDeep },
  rose: { glyph: 'flower-spade', color: COLORS.coral, shade: COLORS.petalDeep },
  jasmine: { glyph: 'flower-star', color: COLORS.paper, shade: COLORS.honey },
  chrysanthemum: { glyph: 'flower-round', color: COLORS.gold, shade: COLORS.honeyDeep },
  lilac: { glyph: 'flower-cluster', color: COLORS.lilac, shade: COLORS.lilacDeep },
  osmanthus: { glyph: 'flower-cluster', color: COLORS.gold, shade: COLORS.honeyDeep },
  lotus: { glyph: 'flower-lotus', color: COLORS.petal, shade: COLORS.petalDeep },

  egg: { glyph: 'egg', color: COLORS.cream, shade: COLORS.gold },
  milk: { glyph: 'glass', color: COLORS.paper, shade: COLORS.sky },
  pork: { glyph: 'meat', color: COLORS.coral, shade: COLORS.petalDeep },
  mutton: { glyph: 'meat', color: COLORS.lilacDeep, shade: COLORS.petalDeep },

  feed: { glyph: 'bag', color: COLORS.honey, shade: COLORS.honeyDeep },
  flour: { glyph: 'bag', color: COLORS.paper, shade: COLORS.inkSoft },
  riceflour: { glyph: 'bag', color: COLORS.cream, shade: COLORS.inkSoft },
  cornmeal: { glyph: 'bag', color: COLORS.honey, shade: COLORS.honeyDeep },
  noodle: { glyph: 'noodles', color: COLORS.honey, shade: COLORS.honeyDeep },
  tofu: { glyph: 'block', color: COLORS.paper, shade: COLORS.mint },
  garlicpaste: { glyph: 'jar', color: COLORS.mint, shade: COLORS.mintDeep },
  bread: { glyph: 'steamed', color: COLORS.honeyDeep, shade: COLORS.honey },
  bun: { glyph: 'steamed', color: COLORS.paper, shade: COLORS.inkSoft },
  pickle: { glyph: 'jar', color: COLORS.leaf, shade: COLORS.grassDeep },
  beanpaste: { glyph: 'jar', color: COLORS.berry, shade: COLORS.petalDeep },
  stock: { glyph: 'pot', color: COLORS.peach, shade: COLORS.coral },
  cheese: { glyph: 'block', color: COLORS.gold, shade: COLORS.honeyDeep },

  ricemilk: { glyph: 'glass', color: COLORS.cream, shade: COLORS.honey },
  soymilk: { glyph: 'glass', color: COLORS.honey, shade: COLORS.honeyDeep },
  'jasmine-tea': { glyph: 'cup', color: COLORS.mint, shade: COLORS.mintDeep },
  'chrys-tea': { glyph: 'cup', color: COLORS.honey, shade: COLORS.honeyDeep },
  'osmanthus-tea': { glyph: 'cup', color: COLORS.gold, shade: COLORS.honeyDeep },
  'daisy-tea': { glyph: 'cup', color: COLORS.cream, shade: COLORS.honey },
  'tulip-tea': { glyph: 'cup', color: COLORS.petal, shade: COLORS.petalDeep },
  'sunflower-tea': { glyph: 'cup', color: COLORS.honey, shade: COLORS.honeyDeep },
  'lilac-tea': { glyph: 'cup', color: COLORS.lilac, shade: COLORS.lilacDeep },
  'lotus-tea': { glyph: 'cup', color: COLORS.petal, shade: COLORS.petalDeep },

  'veggie-stir': { glyph: 'stirfry', color: COLORS.leaf, shade: COLORS.grassDeep },
  'spring-noodle': { glyph: 'noodle-bowl', color: COLORS.honey, shade: COLORS.honeyDeep },
  'pumpkin-cake': { glyph: 'pancake', color: COLORS.honey, shade: COLORS.honeyDeep },
  'tomato-tofu': { glyph: 'stirfry', color: COLORS.coral, shade: COLORS.petalDeep },
  'tomato-noodle': { glyph: 'noodle-bowl', color: COLORS.coral, shade: COLORS.petalDeep },
  'pickle-noodle': { glyph: 'noodle-bowl', color: COLORS.mintDeep, shade: COLORS.grassDeep },
  'potato-pancake': { glyph: 'pancake', color: COLORS.honeyDeep, shade: COLORS.inkSoft },
  'potato-shreds': { glyph: 'stirfry', color: COLORS.honey, shade: COLORS.honeyDeep },
  'veggie-rice': { glyph: 'rice-bowl', color: COLORS.leaf, shade: COLORS.grassDeep },
  'corn-potage': { glyph: 'soup-bowl', color: COLORS.honey, shade: COLORS.honeyDeep },
  'home-tofu': { glyph: 'stirfry', color: COLORS.honeyDeep, shade: COLORS.inkSoft },
  'mushroom-soup': { glyph: 'soup-bowl', color: COLORS.inkSoft, shade: COLORS.ink },
  'fruit-plate': { glyph: 'fruit-plate', color: COLORS.lilac, shade: COLORS.lilacDeep },
  'beans-bun': { glyph: 'bun-plate', color: COLORS.paper, shade: COLORS.berry },
  'berry-cake': { glyph: 'cake', color: COLORS.berry, shade: COLORS.petalDeep },
  'rose-cake': { glyph: 'cake', color: COLORS.petal, shade: COLORS.petalDeep },
  'radish-cake': { glyph: 'pancake', color: COLORS.paper, shade: COLORS.honey },
  'cucumber-salad': { glyph: 'fruit-plate', color: COLORS.mint, shade: COLORS.grassDeep },
  'garlic-eggplant': { glyph: 'stirfry', color: COLORS.lilacDeep, shade: COLORS.teal },
  'osmanthus-cake': { glyph: 'cake', color: COLORS.gold, shade: COLORS.honeyDeep },
  'tomato-egg': { glyph: 'stirfry', color: COLORS.coral, shade: COLORS.gold },
  'egg-fried-rice': { glyph: 'rice-bowl', color: COLORS.gold, shade: COLORS.honeyDeep },
  'egg-noodle': { glyph: 'noodle-bowl', color: COLORS.honey, shade: COLORS.gold },
  'milk-pudding': { glyph: 'cake', color: COLORS.cream, shade: COLORS.gold },
  'pork-bun': { glyph: 'bun-plate', color: COLORS.paper, shade: COLORS.coral },
  'pork-cabbage': { glyph: 'stirfry', color: COLORS.leaf, shade: COLORS.coral },
  'mutton-soup': { glyph: 'soup-bowl', color: COLORS.peach, shade: COLORS.lilacDeep },
  'cheese-toast': { glyph: 'toast', color: COLORS.pathDeep, shade: COLORS.gold },
  'pork-broth': { glyph: 'soup-bowl', color: COLORS.honeyDeep, shade: COLORS.coral },
  'mixed-noodle': { glyph: 'noodle-bowl', color: COLORS.honey, shade: COLORS.coral },
  'three-delight-noodle': { glyph: 'noodle-bowl', color: COLORS.coral, shade: COLORS.honeyDeep },
  'casserole-family': { glyph: 'soup-bowl', color: COLORS.inkSoft, shade: COLORS.gold },
  'four-treasure-noodle': { glyph: 'noodle-bowl', color: COLORS.peach, shade: COLORS.honeyDeep },
  'pork-noodle': { glyph: 'noodle-bowl', color: COLORS.honeyDeep, shade: COLORS.peach },
};

/** 100×100 本地坐标里的描边粗细。 */
function ink(ctx: CanvasRenderingContext2D, width = 3): void {
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, 2.2);
  ctx.stroke();
}

function leafy(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  for (const [dx, rot] of [
    [-20, -0.7],
    [0, 0],
    [20, 0.7],
  ] as const) {
    leaf(ctx, dx, 0, 16, 30, rot, look.color);
  }
  leaf(ctx, -8, -14, 13, 24, -0.35, look.shade);
  leaf(ctx, 10, -12, 12, 22, 0.4, look.shade);
  inkLine(ctx, [{ x: 0, y: 22 }, { x: 0, y: 34 }], { stroke: look.shade, width: 5, wobble: 0.2 });
  ctx.restore();
}

function head(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  inkEllipse(ctx, 0, 0, 34, 32, look.color, { stroke: COLORS.ink, width: 3, seed: 31 });
  ctx.save();
  ctx.globalAlpha = 0.75;
  for (const dx of [-16, 0, 16]) {
    inkLine(ctx, [{ x: dx, y: -22 }, { x: dx * 0.6, y: 22 }], {
      stroke: look.shade,
      width: 3,
      seed: 33 + dx,
      wobble: 0.3,
    });
  }
  ctx.restore();
  leaf(ctx, -22, -26, 12, 7, -0.5, COLORS.leaf);
  leaf(ctx, 20, -28, 12, 7, 0.5, COLORS.leaf);
  ctx.restore();
}

function root(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  ctx.beginPath();
  ctx.moveTo(-22, -14);
  ctx.quadraticCurveTo(0, -26, 22, -14);
  ctx.quadraticCurveTo(14, 20, 0, 34);
  ctx.quadraticCurveTo(-14, 20, -22, -14);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 3);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.5;
  inkLine(ctx, [{ x: -12, y: 0 }, { x: 4, y: 12 }], { stroke: look.shade, width: 2.4, seed: 41 });
  inkLine(ctx, [{ x: -6, y: 12 }, { x: 8, y: 22 }], { stroke: look.shade, width: 2.4, seed: 43 });
  ctx.restore();
  for (const dx of [-10, 0, 10]) {
    inkLine(ctx, [{ x: 0, y: -18 }, { x: dx, y: -34 }], {
      stroke: COLORS.leaf,
      width: 4.5,
      seed: 45 + dx,
      wobble: 0.4,
    });
  }
  ctx.restore();
}

function bulb(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-26, 6);
  ctx.quadraticCurveTo(-24, -26, 0, -30);
  ctx.quadraticCurveTo(24, -26, 26, 6);
  ctx.quadraticCurveTo(14, 26, 0, 26);
  ctx.quadraticCurveTo(-14, 26, -26, 6);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 3);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (const dx of [-13, 0, 13]) {
    inkLine(ctx, [{ x: dx * 0.4, y: -26 }, { x: dx, y: 20 }], {
      stroke: look.shade,
      width: 2.6,
      seed: 51 + dx,
      wobble: 0.3,
    });
  }
  ctx.restore();
  inkLine(ctx, [{ x: 0, y: -30 }, { x: 2, y: -40 }], { stroke: look.shade, width: 3, seed: 57 });
  ctx.restore();
}

function round(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  inkEllipse(ctx, 0, 2, 30, 27, look.color, { stroke: COLORS.ink, width: 3, seed: 61 });
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.ellipse(-11, -8, 8, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const dx of [-12, 12]) {
    leaf(ctx, dx, -26, 13, 7, dx < 0 ? -0.6 : 0.6, COLORS.leaf);
  }
  inkLine(ctx, [{ x: 0, y: -22 }, { x: 0, y: -32 }], { stroke: COLORS.grassDeep, width: 4, seed: 63 });
  ctx.restore();
}

function berry(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-26, -10);
  ctx.quadraticCurveTo(0, -34, 26, -10);
  ctx.quadraticCurveTo(18, 18, 0, 30);
  ctx.quadraticCurveTo(-18, 18, -26, -10);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 3);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = COLORS.paper;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(-12 + (i % 3) * 12, -4 + Math.floor(i / 3) * 12, 2.6, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (const dx of [-12, 0, 12]) {
    leaf(ctx, dx, -28, 11, 6, dx === 0 ? 0 : dx < 0 ? -0.5 : 0.5, COLORS.leaf);
  }
  ctx.restore();
}

function tuber(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  inkEllipse(ctx, 0, 2, 30, 24, look.color, { stroke: COLORS.ink, width: 3, seed: 71 });
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = look.shade;
  for (const [dx, dy] of [
    [-13, -4],
    [4, 8],
    [14, -6],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(dx, dy, 3, 2.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function long(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.rotate(-0.32);
  inkRoundRect(ctx, -34, -14, 68, 28, 14, look.color, {
    stroke: COLORS.ink,
    width: 3,
    seed: 77,
  });
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (const dx of [-18, -4, 10]) {
    ctx.beginPath();
    ctx.ellipse(dx, -4, 3, 2.4, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = look.shade;
    ctx.fill();
  }
  ctx.restore();
  inkLine(ctx, [{ x: 30, y: -6 }, { x: 40, y: -12 }], { stroke: look.shade, width: 4, seed: 79 });
  ctx.restore();
}

function cob(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.rotate(0.2);
  inkEllipse(ctx, 0, 0, 20, 34, look.color, { stroke: COLORS.ink, width: 3, seed: 81 });
  ctx.save();
  ctx.globalAlpha = 0.65;
  for (let row = -3; row <= 3; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      ctx.beginPath();
      ctx.arc(col * 7.4, row * 9.2 + (col % 2 === 0 ? 2 : -2), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = look.shade;
      ctx.fill();
    }
  }
  ctx.restore();
  leaf(ctx, -20, 6, 16, 9, 1.1, COLORS.leaf);
  leaf(ctx, 18, 2, 16, 9, -1.1, COLORS.leaf);
  ctx.restore();
}

function gourd(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  inkEllipse(ctx, 0, 4, 32, 26, look.color, { stroke: COLORS.ink, width: 3, seed: 85 });
  inkEllipse(ctx, 0, 4, 16, 26, null, { stroke: look.shade, width: 2.4, seed: 87 });
  inkEllipse(ctx, 0, 4, 32, 13, null, { stroke: look.shade, width: 2.2, seed: 89 });
  inkLine(ctx, [{ x: 0, y: -22 }, { x: 4, y: -34 }], { stroke: COLORS.grassDeep, width: 5, seed: 91 });
  leaf(ctx, 14, -30, 12, 6, 0.5, COLORS.leaf);
  ctx.restore();
}

function eggplant(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-20, -16);
  ctx.quadraticCurveTo(-30, 8, -12, 26);
  ctx.quadraticCurveTo(4, 36, 16, 18);
  ctx.quadraticCurveTo(26, -4, 10, -18);
  ctx.quadraticCurveTo(-4, -26, -20, -16);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 3);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.ellipse(-8, -2, 6, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const dx of [-10, 0, 10]) {
    leaf(ctx, dx, -24, 9, 5, dx === 0 ? 0 : dx < 0 ? -0.5 : 0.5, COLORS.leaf);
  }
  inkLine(ctx, [{ x: 0, y: -20 }, { x: 0, y: -32 }], { stroke: COLORS.grassDeep, width: 4, seed: 93 });
  ctx.restore();
}

function mushroom(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  inkRoundRect(ctx, -10, -4, 20, 30, 8, COLORS.paper, {
    stroke: COLORS.ink,
    width: 2.8,
    seed: 95,
  });
  ctx.beginPath();
  ctx.moveTo(-32, 0);
  ctx.quadraticCurveTo(-28, -34, 0, -34);
  ctx.quadraticCurveTo(28, -34, 32, 0);
  ctx.quadraticCurveTo(0, 10, -32, 0);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 3);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = COLORS.paper;
  for (const [dx, dy, r] of [
    [-12, -14, 4],
    [6, -20, 3.4],
    [16, -8, 2.8],
  ] as const) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function pods(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  for (const [dx, rot] of [
    [-16, -0.5],
    [4, 0.1],
    [18, 0.6],
  ] as const) {
    ctx.save();
    ctx.translate(dx, 0);
    ctx.rotate(rot);
    inkRoundRect(ctx, -10, -26, 20, 52, 10, look.color, {
      stroke: COLORS.ink,
      width: 2.6,
      seed: 101 + dx,
    });
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = look.shade;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, -14 + i * 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

function grain(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  for (const dx of [-16, 0, 16]) {
    inkLine(ctx, [{ x: dx, y: 30 }, { x: dx - 3, y: -8 }], {
      stroke: look.shade,
      width: 3.4,
      seed: 111 + dx,
      wobble: 0.4,
    });
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.translate(dx - 4, -6 - i * 9);
      ctx.rotate(-0.35);
      inkEllipse(ctx, 0, 0, 5, 8, look.color, { stroke: COLORS.ink, width: 2, seed: 113 + i });
      ctx.restore();
    }
  }
  ctx.restore();
}

function cluster(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 8);
  inkLine(ctx, [{ x: 0, y: -34 }, { x: 0, y: -20 }], { stroke: COLORS.grassDeep, width: 4, seed: 121 });
  const rows = [
    [-18, -16],
    [0, -16],
    [18, -16],
    [-9, 0],
    [9, 0],
    [-18, 16],
    [0, 16],
    [18, 16],
    [0, 30],
  ] as const;
  for (const [dx, dy] of rows) {
    inkEllipse(ctx, dx, dy, 10, 10, look.color, { stroke: COLORS.ink, width: 2.2, seed: 123 + dx });
  }
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS.paper;
  for (const [dx, dy] of rows.slice(0, 5)) {
    ctx.beginPath();
    ctx.arc(dx - 3, dy - 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  leaf(ctx, 12, -30, 13, 7, 0.6, COLORS.leaf);
  ctx.restore();
}

function flowerBase(ctx: CanvasRenderingContext2D): void {
  inkLine(ctx, [{ x: 0, y: 34 }, { x: 0, y: 6 }], { stroke: COLORS.grassDeep, width: 4.5, seed: 131 });
  leaf(ctx, -14, 22, 13, 7, -0.5, COLORS.leaf);
  leaf(ctx, 14, 28, 12, 6, 0.5, COLORS.leaf);
}

function flowerRound(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  flowerBase(ctx);
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    ctx.save();
    ctx.rotate(angle);
    inkEllipse(ctx, 0, -18, 7, 13, look.color, { stroke: COLORS.ink, width: 2, seed: 133 + i });
    ctx.restore();
  }
  inkEllipse(ctx, 0, 0, 9, 9, look.shade, { stroke: COLORS.ink, width: 2.2, seed: 141 });
}

function flowerBell(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  flowerBase(ctx);
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.quadraticCurveTo(-20, -32, 0, -34);
  ctx.quadraticCurveTo(20, -32, 16, -6);
  ctx.quadraticCurveTo(0, 4, -16, -6);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.6);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.6;
  inkLine(ctx, [{ x: -8, y: -24 }, { x: 0, y: -6 }], { stroke: look.shade, width: 2.4, seed: 143 });
  inkLine(ctx, [{ x: 8, y: -24 }, { x: 0, y: -6 }], { stroke: look.shade, width: 2.4, seed: 145 });
  ctx.restore();
}

function flowerSpade(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  flowerBase(ctx);
  ctx.save();
  ctx.translate(0, -18);
  for (let ring = 0; ring < 3; ring += 1) {
    const r = 20 - ring * 6;
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = ring === 1 ? COLORS.paper : look.shade;
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }
  inkEllipse(ctx, 0, 0, 22, 20, look.color, { stroke: COLORS.ink, width: 2.6, seed: 147 });
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.ellipse(-7, -6, 6, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function flowerStar(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  flowerBase(ctx);
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    inkEllipse(
      ctx,
      Math.cos(angle) * 15,
      -22 + Math.sin(angle) * 15,
      6,
      10,
      look.color,
      { stroke: COLORS.ink, width: 2, seed: 151 + i },
    );
  }
  drawStar(ctx, 0, -22, 8, 4, look.shade);
}

function flowerSun(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  flowerBase(ctx);
  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    ctx.save();
    ctx.rotate(angle);
    ctx.save();
    ctx.translate(0, -24);
    ctx.rotate(0.3);
    inkEllipse(ctx, 0, 0, 5, 12, look.color, { stroke: COLORS.ink, width: 1.8, seed: 161 + i });
    ctx.restore();
    ctx.restore();
  }
  inkEllipse(ctx, 0, 0, 13, 13, look.shade, { stroke: COLORS.ink, width: 2.4, seed: 171 });
}

function flowerCluster(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  flowerBase(ctx);
  for (const [dx, dy] of [
    [-12, -6],
    [10, -10],
    [-2, -22],
    [16, -24],
    [-16, -24],
    [2, -34],
  ] as const) {
    drawStar(ctx, dx, dy, 8, 3.6, look.color);
    ctx.beginPath();
    ctx.arc(dx, dy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function flowerLotus(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  inkEllipse(ctx, 0, 22, 26, 8, COLORS.water, { stroke: COLORS.waterDeep, width: 2, seed: 181 });
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 3;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.quadraticCurveTo(-14, -10, 0, -26);
    ctx.quadraticCurveTo(14, -10, 0, 16);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? look.color : look.shade;
    ctx.fill();
    ink(ctx, 2);
    ctx.stroke();
    ctx.restore();
  }
  inkEllipse(ctx, 0, 10, 8, 6, COLORS.gold, { stroke: COLORS.ink, width: 2, seed: 183 });
  ctx.restore();
}

function bag(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-24, -18);
  ctx.lineTo(24, -18);
  ctx.quadraticCurveTo(30, 26, 16, 30);
  ctx.lineTo(-16, 30);
  ctx.quadraticCurveTo(-30, 26, -24, -18);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkRoundRect(ctx, -16, -24, 32, 10, 4, look.shade, { stroke: COLORS.ink, width: 2, seed: 191 });
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (const dx of [-8, 0, 8]) {
    ctx.beginPath();
    ctx.arc(dx, 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = look.shade;
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function noodles(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  inkRoundRect(ctx, -26, -28, 52, 56, 8, COLORS.paper, {
    stroke: COLORS.ink,
    width: 2.8,
    seed: 195,
  });
  ctx.save();
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 5; i += 1) {
    inkLine(
      ctx,
      [
        { x: -18, y: -20 + i * 9 },
        { x: 0, y: -14 + i * 9 },
        { x: 18, y: -20 + i * 9 },
      ],
      { stroke: look.color, width: 3.4, seed: 197 + i, wobble: 0.5 },
    );
  }
  ctx.restore();
  inkRoundRect(ctx, -26, -8, 52, 12, 4, look.shade, { stroke: COLORS.ink, width: 2, seed: 203 });
  ctx.restore();
}

function block(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 8);
  ctx.beginPath();
  ctx.moveTo(-26, -12);
  ctx.lineTo(0, -24);
  ctx.lineTo(26, -12);
  ctx.lineTo(26, 14);
  ctx.lineTo(0, 26);
  ctx.lineTo(-26, 14);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkLine(ctx, [{ x: -26, y: -12 }, { x: 0, y: 0 }, { x: 26, y: -12 }], {
    stroke: look.shade,
    width: 2.2,
    seed: 207,
  });
  inkLine(ctx, [{ x: 0, y: 0 }, { x: 0, y: 26 }], { stroke: look.shade, width: 2, seed: 209 });
  ctx.restore();
}

function jar(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-20, -14);
  ctx.quadraticCurveTo(-28, 12, -14, 26);
  ctx.lineTo(14, 26);
  ctx.quadraticCurveTo(28, 12, 20, -14);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkRoundRect(ctx, -22, -24, 44, 12, 4, look.shade, { stroke: COLORS.ink, width: 2.2, seed: 211 });
  ctx.save();
  ctx.globalAlpha = 0.5;
  inkLine(ctx, [{ x: -10, y: -2 }, { x: -6, y: 16 }], { stroke: COLORS.paper, width: 3, seed: 213 });
  ctx.restore();
  ctx.restore();
}

function steamed(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-28, 8);
  ctx.quadraticCurveTo(-28, -24, 0, -26);
  ctx.quadraticCurveTo(28, -24, 28, 8);
  ctx.quadraticCurveTo(16, 24, 0, 24);
  ctx.quadraticCurveTo(-16, 24, -28, 8);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.55;
  inkLine(ctx, [{ x: -8, y: -16 }, { x: 0, y: -6 }, { x: 8, y: -16 }], {
    stroke: look.shade,
    width: 2.4,
    seed: 217,
  });
  ctx.restore();
  ctx.restore();
}

function pot(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 8);
  inkEllipse(ctx, 0, 10, 28, 12, look.color, { stroke: COLORS.ink, width: 2.8, seed: 221 });
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.quadraticCurveTo(-20, 18, 0, 18);
  ctx.quadraticCurveTo(20, 18, 26, -6);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkEllipse(ctx, 0, -8, 27, 9, look.shade, { stroke: COLORS.ink, width: 2.4, seed: 223 });
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (const dx of [-8, 4]) {
    inkLine(ctx, [{ x: dx, y: -22 }, { x: dx + 4, y: -34 }], {
      stroke: COLORS.paper,
      width: 3,
      seed: 225 + dx,
      wobble: 0.8,
    });
  }
  ctx.restore();
  ctx.restore();
}

function cup(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  inkRoundRect(ctx, -22, -18, 44, 40, 10, COLORS.paper, {
    stroke: COLORS.ink,
    width: 2.8,
    seed: 231,
  });
  inkEllipse(ctx, 0, -18, 20, 6, look.color, { stroke: COLORS.ink, width: 2.2, seed: 233 });
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (const dx of [-6, 6]) {
    inkLine(ctx, [{ x: dx, y: -28 }, { x: dx + 5, y: -40 }], {
      stroke: COLORS.paper,
      width: 3.4,
      seed: 235 + dx,
      wobble: 0.9,
    });
  }
  ctx.restore();
  inkLine(ctx, [{ x: 18, y: 0 }, { x: 26, y: 0 }], { stroke: COLORS.ink, width: 2.4, seed: 239 });
  ctx.restore();
}

function glass(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-16, -22);
  ctx.lineTo(16, -22);
  ctx.lineTo(12, 26);
  ctx.lineTo(-12, 26);
  ctx.closePath();
  ctx.fillStyle = COLORS.paper;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(14, -8);
  ctx.lineTo(11, 24);
  ctx.lineTo(-11, 24);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.restore();
  ink(ctx, 2.6);
  ctx.beginPath();
  ctx.moveTo(-16, -22);
  ctx.lineTo(16, -22);
  ctx.lineTo(12, 26);
  ctx.lineTo(-12, 26);
  ctx.closePath();
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.6;
  inkLine(ctx, [{ x: -6, y: 0 }, { x: -4, y: 20 }], { stroke: COLORS.paper, width: 3, seed: 241 });
  ctx.restore();
  ctx.restore();
}

function stirfry(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  inkEllipse(ctx, 0, 8, 34, 16, COLORS.paper, { stroke: COLORS.ink, width: 2.8, seed: 251 });
  for (const [dx, dy, r] of [
    [-14, -2, 9],
    [2, -6, 10],
    [16, 0, 8],
    [-4, 8, 8],
  ] as const) {
    inkEllipse(ctx, dx, dy, r, r * 0.8, look.color, { stroke: COLORS.ink, width: 2, seed: 253 + dx });
  }
  inkEllipse(ctx, 0, 8, 34, 16, null, { stroke: COLORS.ink, width: 2.8, seed: 259 });
  ctx.restore();
}

function noodleBowl(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-30, -6);
  ctx.quadraticCurveTo(-24, 26, 0, 26);
  ctx.quadraticCurveTo(24, 26, 30, -6);
  ctx.closePath();
  ctx.fillStyle = COLORS.paper;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkEllipse(ctx, 0, -6, 30, 9, look.color, { stroke: COLORS.ink, width: 2.4, seed: 261 });
  ctx.save();
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 3; i += 1) {
    inkLine(
      ctx,
      [
        { x: -16, y: -8 + i * 4 },
        { x: 0, y: -14 + i * 4 },
        { x: 16, y: -8 + i * 4 },
      ],
      { stroke: COLORS.paper, width: 2.4, seed: 263 + i, wobble: 0.6 },
    );
  }
  ctx.restore();
  ctx.restore();
}

function soupBowl(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-30, -4);
  ctx.quadraticCurveTo(-24, 28, 0, 28);
  ctx.quadraticCurveTo(24, 28, 30, -4);
  ctx.closePath();
  ctx.fillStyle = COLORS.paper;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkEllipse(ctx, 0, -4, 28, 9, look.color, { stroke: COLORS.ink, width: 2.4, seed: 271 });
  ctx.save();
  ctx.globalAlpha = 0.6;
  for (const dx of [-10, 6]) {
    inkLine(ctx, [{ x: dx, y: -16 }, { x: dx + 5, y: -30 }], {
      stroke: COLORS.paper,
      width: 3.2,
      seed: 273 + dx,
      wobble: 0.9,
    });
  }
  ctx.restore();
  ctx.restore();
}

function cake(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-24, 6);
  ctx.lineTo(0, -16);
  ctx.lineTo(24, 6);
  ctx.lineTo(0, 26);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkRoundRect(ctx, -20, -6, 40, 8, 3, look.shade, { stroke: COLORS.ink, width: 2, seed: 281 });
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = COLORS.paper;
  ctx.beginPath();
  ctx.arc(0, -18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function bunPlate(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  inkEllipse(ctx, 0, 16, 34, 12, COLORS.paper, { stroke: COLORS.ink, width: 2.6, seed: 291 });
  for (const [dx, dy] of [
    [-12, -2],
    [12, -2],
    [0, -14],
  ] as const) {
    inkEllipse(ctx, dx, dy, 15, 13, look.color, { stroke: COLORS.ink, width: 2.4, seed: 293 + dx });
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = look.shade;
    ctx.beginPath();
    ctx.arc(dx, dy - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function fruitPlate(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  inkEllipse(ctx, 0, 16, 36, 13, COLORS.paper, { stroke: COLORS.ink, width: 2.6, seed: 301 });
  for (const [dx, dy, r] of [
    [-15, 0, 9],
    [0, -6, 10],
    [15, 2, 8],
    [-4, 10, 7],
  ] as const) {
    inkEllipse(ctx, dx, dy, r, r, look.color, { stroke: COLORS.ink, width: 2.2, seed: 303 + dx });
  }
  leaf(ctx, 12, -18, 12, 6, 0.5, COLORS.leaf);
  ctx.restore();
}

function pancake(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 8);
  for (let i = 2; i >= 0; i -= 1) {
    inkEllipse(ctx, 0, i * 8, 30 - i * 2, 12, i === 0 ? look.color : look.shade, {
      stroke: COLORS.ink,
      width: 2.4,
      seed: 311 + i,
    });
  }
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = COLORS.paper;
  for (const dx of [-10, 6]) {
    ctx.beginPath();
    ctx.ellipse(dx, -2, 4, 2.4, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function egg(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  for (const [dx, dy, rot] of [
    [-16, 6, -0.35],
    [16, 8, 0.3],
  ] as const) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = look.color;
    ctx.fill();
    ink(ctx, 2.8);
    ctx.stroke();
    inkEllipse(ctx, 0, 1, 8, 10, look.shade, { stroke: COLORS.ink, width: 1.8, seed: 331 + dx });
    ctx.restore();
  }
  ctx.restore();
}

function meat(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  ctx.beginPath();
  ctx.ellipse(-4, 2, 27, 20, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.55;
  inkEllipse(ctx, -9, -2, 10, 7, COLORS.paper, { width: 0 });
  ctx.restore();
  inkLine(ctx, [{ x: 20, y: 12 }, { x: 34, y: 26 }], {
    stroke: COLORS.paper,
    width: 9,
    seed: 335,
    wobble: 0.4,
  });
  inkEllipse(ctx, 36, 29, 7, 6, COLORS.paper, { stroke: COLORS.ink, width: 2.2, seed: 337 });
  ctx.restore();
}

function toast(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 4);
  ctx.beginPath();
  ctx.moveTo(-28, -20);
  ctx.quadraticCurveTo(-28, -34, -6, -32);
  ctx.quadraticCurveTo(0, -38, 6, -32);
  ctx.quadraticCurveTo(28, -34, 28, -20);
  ctx.lineTo(26, 26);
  ctx.lineTo(-26, 26);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(-16, -18);
  ctx.lineTo(16, -18);
  ctx.lineTo(12, 6);
  ctx.lineTo(-12, 6);
  ctx.closePath();
  ctx.fillStyle = look.shade;
  ctx.fill();
  ink(ctx, 2);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function riceBowl(ctx: CanvasRenderingContext2D, look: GoodsLook): void {
  ctx.save();
  ctx.translate(0, 6);
  ctx.beginPath();
  ctx.moveTo(-30, -2);
  ctx.quadraticCurveTo(-24, 28, 0, 28);
  ctx.quadraticCurveTo(24, 28, 30, -2);
  ctx.closePath();
  ctx.fillStyle = COLORS.paper;
  ctx.fill();
  ink(ctx, 2.8);
  ctx.stroke();
  inkEllipse(ctx, 0, -4, 28, 12, COLORS.cream, { stroke: COLORS.ink, width: 2.4, seed: 321 });
  for (const [dx, dy] of [
    [-10, -6],
    [8, -8],
    [0, -12],
  ] as const) {
    inkEllipse(ctx, dx, dy, 6, 4, look.color, { stroke: COLORS.ink, width: 1.8, seed: 323 + dx });
  }
  ctx.restore();
}

export function drawGoods(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  cy: number,
  size: number,
  stage = 1,
): void {
  const look = GOODS_LOOKS[id];
  if (!look) return;
  const scale = (size / 100) * (0.45 + 0.55 * Math.max(0, Math.min(1, stage)));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  switch (look.glyph) {
    case 'leafy':
      leafy(ctx, look);
      break;
    case 'head':
      head(ctx, look);
      break;
    case 'root':
      root(ctx, look);
      break;
    case 'bulb':
      bulb(ctx, look);
      break;
    case 'round':
      round(ctx, look);
      break;
    case 'berry':
      berry(ctx, look);
      break;
    case 'tuber':
      tuber(ctx, look);
      break;
    case 'long':
      long(ctx, look);
      break;
    case 'cob':
      cob(ctx, look);
      break;
    case 'gourd':
      gourd(ctx, look);
      break;
    case 'eggplant':
      eggplant(ctx, look);
      break;
    case 'mushroom':
      mushroom(ctx, look);
      break;
    case 'pods':
      pods(ctx, look);
      break;
    case 'grain':
      grain(ctx, look);
      break;
    case 'cluster':
      cluster(ctx, look);
      break;
    case 'flower-round':
      flowerRound(ctx, look);
      break;
    case 'flower-bell':
      flowerBell(ctx, look);
      break;
    case 'flower-spade':
      flowerSpade(ctx, look);
      break;
    case 'flower-star':
      flowerStar(ctx, look);
      break;
    case 'flower-sun':
      flowerSun(ctx, look);
      break;
    case 'flower-cluster':
      flowerCluster(ctx, look);
      break;
    case 'flower-lotus':
      flowerLotus(ctx, look);
      break;
    case 'bag':
      bag(ctx, look);
      break;
    case 'noodles':
      noodles(ctx, look);
      break;
    case 'block':
      block(ctx, look);
      break;
    case 'jar':
      jar(ctx, look);
      break;
    case 'steamed':
      steamed(ctx, look);
      break;
    case 'pot':
      pot(ctx, look);
      break;
    case 'cup':
      cup(ctx, look);
      break;
    case 'glass':
      glass(ctx, look);
      break;
    case 'stirfry':
      stirfry(ctx, look);
      break;
    case 'noodle-bowl':
      noodleBowl(ctx, look);
      break;
    case 'soup-bowl':
      soupBowl(ctx, look);
      break;
    case 'cake':
      cake(ctx, look);
      break;
    case 'bun-plate':
      bunPlate(ctx, look);
      break;
    case 'fruit-plate':
      fruitPlate(ctx, look);
      break;
    case 'pancake':
      pancake(ctx, look);
      break;
    case 'rice-bowl':
      riceBowl(ctx, look);
      break;
    case 'egg':
      egg(ctx, look);
      break;
    case 'meat':
      meat(ctx, look);
      break;
    case 'toast':
      toast(ctx, look);
      break;
    default:
      break;
  }
  ctx.restore();
}

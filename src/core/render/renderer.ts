import { DESIGN_WIDTH } from '../../config';
import { platform, WindowMetrics } from '../../shared/platform/wx';

export class Renderer {
  readonly canvas: any;
  readonly ctx: CanvasRenderingContext2D;
  readonly width = DESIGN_WIDTH;
  readonly height: number;
  readonly scale: number;
  readonly dpr: number;
  readonly safeTop: number;
  readonly safeBottom: number;
  readonly metrics: WindowMetrics;

  constructor() {
    this.metrics = platform.getMetrics();
    this.canvas = platform.createCanvas();
    this.dpr = this.metrics.pixelRatio;
    this.canvas.width = Math.round(this.metrics.width * this.dpr);
    this.canvas.height = Math.round(this.metrics.height * this.dpr);

    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this.scale = this.metrics.width / DESIGN_WIDTH;
    this.height = this.metrics.height / this.scale;
    this.safeTop = this.metrics.safeTop / this.scale;
    this.safeBottom = this.metrics.safeBottom / this.scale;

    this.ctx.imageSmoothingEnabled = true;
  }

  beginFrame(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
  }

  toDesign(clientX: number, clientY: number): { x: number; y: number } {
    return { x: clientX / this.scale, y: clientY / this.scale };
  }
}

import type { SpriteFrame, SpriteId } from '../../shared/design-system/sprite-atlas';

export interface ParticleEmitConfig {
  sprite: SpriteId;
  count?: number;
  lifespan: [number, number];
  speed: [number, number];
  angle: [number, number];
  gravity?: number;
  drag?: number;
  scale?: [number, number];
  alpha?: [number, number];
  spin?: [number, number];
  blend?: 'normal' | 'add';
  size?: number;
  spread?: number;
}

const STRIDE = 14;
const F_X = 0;
const F_Y = 1;
const F_VX = 2;
const F_VY = 3;
const F_LIFE = 4;
const F_MAX = 5;
const F_SIZE0 = 6;
const F_SIZE1 = 7;
const F_ALPHA0 = 8;
const F_ALPHA1 = 9;
const F_SPIN = 10;
const F_ROT = 11;
const F_GRAVITY = 12;
const F_DRAG = 13;

const TWO_PI = Math.PI * 2;

interface FrameRegistry {
  list: SpriteFrame[];
  index: Map<SpriteId, number>;
}

/**
 * 预烘焙 sprite 粒子系统。
 * - 数据用定长 Float32Array（SoA 布局），运行期不产生对象分配；
 * - 按 blend 分两批绘制，避免逐粒子切换合成模式；
 * - 超出预算时丢弃最旧的活跃粒子。
 */
export class ParticleSystem {
  private readonly data: Float32Array;
  private readonly spriteIndex: Uint8Array;
  private readonly blendMode: Uint8Array;
  private readonly alive: Uint8Array;
  private readonly frames: FrameRegistry = { list: [], index: new Map() };
  private capacity: number;
  private budget = 240;
  private seed = 0x9e3779b9;
  private cursor = 0;

  constructor(capacity = 512) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity * STRIDE);
    this.spriteIndex = new Uint8Array(capacity);
    this.blendMode = new Uint8Array(capacity);
    this.alive = new Uint8Array(capacity);
  }

  setBudget(budget: number): void {
    this.budget = Math.max(0, Math.floor(budget));
    if (this.budget === 0) this.clear();
  }

  get particleBudget(): number {
    return this.budget;
  }

  get activeCount(): number {
    let count = 0;
    for (let i = 0; i < this.capacity; i += 1) if (this.alive[i]) count += 1;
    return count;
  }

  burst(config: ParticleEmitConfig, x: number, y: number, scaleCount = 1): void {
    if (this.budget <= 0) return;
    const count = Math.max(0, Math.round((config.count ?? 8) * scaleCount));
    for (let i = 0; i < count; i += 1) this.spawn(config, x, y);
  }

  private spawn(config: ParticleEmitConfig, x: number, y: number): void {
    if (this.activeCount >= this.budget) this.recycleOldest();

    const slot = this.allocSlot();
    if (slot < 0) return;

    const base = slot * STRIDE;
    const spread = config.spread ?? 0;
    const angle = this.range(config.angle[0], config.angle[1]);
    const speed = this.range(config.speed[0], config.speed[1]);
    const life = this.range(config.lifespan[0], config.lifespan[1]);
    const size = config.size ?? 28;
    const scale = config.scale ?? [1, 0.6];
    const alpha = config.alpha ?? [1, 0];
    const spin = config.spin ? this.range(config.spin[0], config.spin[1]) : 0;

    this.data[base + F_X] = x + this.range(-spread, spread);
    this.data[base + F_Y] = y + this.range(-spread, spread);
    this.data[base + F_VX] = Math.cos(angle) * speed;
    this.data[base + F_VY] = Math.sin(angle) * speed;
    this.data[base + F_LIFE] = life;
    this.data[base + F_MAX] = life;
    this.data[base + F_SIZE0] = size * scale[0];
    this.data[base + F_SIZE1] = size * scale[1];
    this.data[base + F_ALPHA0] = alpha[0];
    this.data[base + F_ALPHA1] = alpha[1];
    this.data[base + F_SPIN] = spin;
    this.data[base + F_ROT] = this.range(0, TWO_PI);
    this.data[base + F_GRAVITY] = config.gravity ?? 0;
    this.data[base + F_DRAG] = config.drag ?? 0;

    this.spriteIndex[slot] = this.frameIndex(config.sprite);
    this.blendMode[slot] = config.blend === 'add' ? 1 : 0;
    this.alive[slot] = 1;
  }

  private allocSlot(): number {
    for (let i = 0; i < this.capacity; i += 1) {
      const slot = (this.cursor + i) % this.capacity;
      if (!this.alive[slot]) {
        this.cursor = (slot + 1) % this.capacity;
        return slot;
      }
    }
    return -1;
  }

  private recycleOldest(): void {
    let oldest = -1;
    let lowest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.capacity; i += 1) {
      if (!this.alive[i]) continue;
      const life = this.data[i * STRIDE + F_LIFE];
      if (life < lowest) {
        lowest = life;
        oldest = i;
      }
    }
    if (oldest >= 0) this.alive[oldest] = 0;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    const step = Math.min(dt, 0.05);

    for (let i = 0; i < this.capacity; i += 1) {
      if (!this.alive[i]) continue;
      const base = i * STRIDE;
      const life = this.data[base + F_LIFE] - step;
      if (life <= 0) {
        this.alive[i] = 0;
        continue;
      }
      this.data[base + F_LIFE] = life;

      const drag = this.data[base + F_DRAG];
      if (drag > 0) {
        const factor = Math.max(0, 1 - drag * step);
        this.data[base + F_VX] *= factor;
        this.data[base + F_VY] *= factor;
      }
      this.data[base + F_VY] += this.data[base + F_GRAVITY] * step;
      this.data[base + F_X] += this.data[base + F_VX] * step;
      this.data[base + F_Y] += this.data[base + F_VY] * step;
      this.data[base + F_ROT] += this.data[base + F_SPIN] * step;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let pass = 0; pass < 2; pass += 1) {
      let opened = false;
      for (let i = 0; i < this.capacity; i += 1) {
        if (!this.alive[i] || this.blendMode[i] !== pass) continue;
        if (!opened) {
          ctx.save();
          ctx.globalCompositeOperation = pass === 1 ? 'lighter' : 'source-over';
          opened = true;
        }

        const base = i * STRIDE;
        const t = 1 - this.data[base + F_LIFE] / this.data[base + F_MAX];
        const size = this.data[base + F_SIZE0] + (this.data[base + F_SIZE1] - this.data[base + F_SIZE0]) * t;
        const alpha = this.data[base + F_ALPHA0] + (this.data[base + F_ALPHA1] - this.data[base + F_ALPHA0]) * t;
        if (alpha <= 0.01 || size <= 0.5) continue;

        const frame = this.frames.list[this.spriteIndex[i]];
        if (!frame) continue;

        ctx.globalAlpha = alpha;
        const x = this.data[base + F_X];
        const y = this.data[base + F_Y];
        const half = size / 2;
        const rot = this.data[base + F_ROT];

        if (Math.abs(rot) < 0.01) {
          ctx.drawImage(
            frame.canvas,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            x - half,
            y - half,
            size,
            size,
          );
        } else {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.drawImage(
            frame.canvas,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            -half,
            -half,
            size,
            size,
          );
          ctx.restore();
        }
      }
      if (opened) ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.alive.fill(0);
  }

  registerFrame(id: SpriteId, frame: SpriteFrame): void {
    if (this.frames.index.has(id)) return;
    this.frames.index.set(id, this.frames.list.length);
    this.frames.list.push(frame);
  }

  private frameIndex(id: SpriteId): number {
    return this.frames.index.get(id) ?? 0;
  }

  private range(min: number, max: number): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return min + (this.seed / 4294967296) * (max - min);
  }
}

import { ParticleSystem } from '../../core/particles/particles';
import { QualityService } from '../../core/quality/quality';
import { SpriteAtlas } from '../../shared/design-system/sprite-atlas';
import { BURSTS, BurstId } from '../../shared/design-system/motion';
import { createRng } from '../../core/rng';
import { BUILDING_ANCHORS } from './town-buildings';
import { TownLayout } from './town-layout';
import { TownCamera, worldToScreen } from './town-camera';

export interface AmbientState {
  layout: TownLayout;
  camera: TownCamera;
  night: boolean;
  reducedMotion: boolean;
  sceneMotion: boolean;
  fountainLevel: number;
}

const SPRITES = [
  'p-petal',
  'p-leaf',
  'p-star',
  'p-firefly',
  'p-splash',
  'p-smoke',
  'p-dust',
  'p-ring',
  'p-coin',
  'p-sugar',
] as const;

/**
 * 首页专用粒子池。
 *
 * 不共用全局 particles：全局池在 scenes.render 之后绘制，会把花瓣盖到
 * 顶部栏和 Dock 上面。这里在 town 与 UI 之间绘制，UI 永远干净。
 */
export class LobbyAmbient {
  private readonly system = new ParticleSystem(192);
  private readonly rng = createRng(0x10bb);
  private petalTimer = 0;
  private sprayTimer = 0;
  private smokeTimer = 0;
  private sparkleTimer = 0;
  private fireflyTimer = 0;
  private lastBudget = -1;

  constructor(atlas: SpriteAtlas, private readonly quality: QualityService) {
    for (const id of SPRITES) this.system.registerFrame(id, atlas.frame(id));
  }

  update(dt: number, state: AmbientState): void {
    const budget = state.reducedMotion ? 0 : this.quality.lobbyParticleBudget;
    if (budget !== this.lastBudget) {
      this.system.setBudget(budget);
      this.lastBudget = budget;
    }
    if (budget <= 0) return;

    const { layout, camera, night, sceneMotion } = state;
    const visibleMin = camera.x - layout.width / (2 * camera.zoom) - 80;
    const visibleMax = camera.x + layout.width / (2 * camera.zoom) + 80;

    this.petalTimer += dt;
    const petalEvery = budget > 120 ? 0.55 : budget > 60 ? 0.8 : 1.25;
    if (this.petalTimer >= petalEvery) {
      this.petalTimer = 0;
      const leaf = this.rng.next() > 0.55;
      this.system.burst(
        {
          sprite: leaf ? 'p-leaf' : 'p-petal',
          count: 1,
          lifespan: [6, 9],
          speed: [14, 30],
          angle: [Math.PI * 0.12, Math.PI * 0.38],
          gravity: 5,
          drag: 0.04,
          scale: [1, 0.72],
          alpha: [0.85, 0],
          spin: [-1.4, 1.4],
          size: leaf ? 18 : 16,
          spread: 14,
        },
        this.rng.next() * layout.width,
        -20,
      );
    }

    if (sceneMotion) {
      this.sprayTimer += dt;
      if (this.sprayTimer >= 0.16) {
        this.sprayTimer = 0;
        const fountain = worldToScreen(
          camera,
          layout.fountain.x,
          layout.fountain.y,
          layout.width,
          layout.focusY,
        );
        if (fountain.x > -80 && fountain.x < layout.width + 80) {
          this.system.burst(
            {
              sprite: 'p-splash',
              count: state.fountainLevel >= 2 ? 2 : 1,
              lifespan: [0.35, 0.65],
              speed: [70, 150],
              angle: [-Math.PI * 0.84, -Math.PI * 0.16],
              gravity: 420,
              drag: 0.1,
              scale: [0.9, 0.35],
              alpha: [0.9, 0],
              size: state.fountainLevel >= 2 ? 12 : 9,
              spread: 7,
            },
            fountain.x,
            fountain.y - 118 * camera.zoom,
          );
        }
      }

      this.smokeTimer += dt;
      if (this.smokeTimer >= 0.85) {
        this.smokeTimer = 0;
        const candidates = layout.buildings.filter(
          (building) =>
            building.base.x >= visibleMin && building.base.x <= visibleMax && building.entry.status === 'playable',
        );
        const target = candidates.length > 0 ? candidates[this.rng.int(candidates.length)] : null;
        const anchor = target ? BUILDING_ANCHORS[target.entry.id] : null;
        if (target && anchor) {
          const p = worldToScreen(
            camera,
            target.base.x + anchor.smoke.x * target.scale,
            target.base.y + anchor.smoke.y * target.scale,
            layout.width,
            layout.focusY,
          );
          this.system.burst(
            {
              sprite: 'p-smoke',
              count: 1,
              lifespan: [1.4, 2.2],
              speed: [6, 16],
              angle: [-Math.PI * 0.7, -Math.PI * 0.3],
              gravity: -9,
              drag: 0.35,
              scale: [0.7, 1.5],
              alpha: [0.35, 0],
              size: 20,
              spread: 5,
            },
            p.x,
            p.y,
          );
        }
      }

      this.sparkleTimer += dt;
      if (this.sparkleTimer >= 2.4) {
        this.sparkleTimer = 0;
        const playable = layout.buildings.filter(
          (building) =>
            building.entry.status === 'playable' &&
            building.base.x >= visibleMin &&
            building.base.x <= visibleMax,
        );
        const target = playable.length > 0 ? playable[this.rng.int(playable.length)] : null;
        const anchor = target ? BUILDING_ANCHORS[target.entry.id] : null;
        if (target && anchor) {
          const p = worldToScreen(
            camera,
            target.base.x + anchor.sparkle.x * target.scale,
            target.base.y + anchor.sparkle.y * target.scale,
            layout.width,
            layout.focusY,
          );
          this.system.burst(
            {
              sprite: 'p-star',
              count: 1,
              lifespan: [0.5, 0.8],
              speed: [12, 34],
              angle: [0, Math.PI * 2],
              gravity: 20,
              drag: 0.6,
              scale: [0.8, 0.2],
              alpha: [0.9, 0],
              spin: [-3, 3],
              blend: 'add',
              size: 16,
            },
            p.x,
            p.y,
          );
        }
      }

      if (night) {
        this.fireflyTimer += dt;
        if (this.fireflyTimer >= 0.75) {
          this.fireflyTimer = 0;
          const x = visibleMin + this.rng.next() * (visibleMax - visibleMin);
          const y = layout.groundTop + 180 + this.rng.next() * (layout.dockRect.y - layout.groundTop - 240);
          this.system.burst(
            {
              sprite: 'p-firefly',
              count: 1,
              lifespan: [4, 7],
              speed: [4, 14],
              angle: [0, Math.PI * 2],
              gravity: -2,
              drag: 0.25,
              scale: [0.8, 0.4],
              alpha: [0.75, 0],
              blend: 'add',
              size: 18,
              spread: 20,
            },
            x,
            y,
          );
        }
      }
    }
  }

  burst(kind: BurstId, x: number, y: number, scale = 1): void {
    if (this.quality.reducedMotion) return;
    const preset = BURSTS[kind];
    if (preset) this.system.burst(preset, x, y, scale);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.system.draw(ctx);
  }

  clear(): void {
    this.system.clear();
  }
}

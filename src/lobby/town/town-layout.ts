import { GAMES, GameManifestEntry } from '../../shared/content/games-manifest.generated';
import { Rect } from '../../shared/design-system/draw';
import { Accent, accentOf } from '../../shared/design-system/tokens';
import { TownCameraBounds } from './town-camera';

export interface TownPoint {
  x: number;
  y: number;
}

export interface TownBuildingLayout {
  entry: GameManifestEntry;
  accent: Accent;
  /** 世界坐标的落地点；屏幕默认相机下 = base.x + viewWidth/2。 */
  base: TownPoint;
  /** 世界坐标的建筑命中/绘制包围盒（含招牌）。 */
  art: Rect;
  hit: Rect;
  depth: number;
  scale: number;
}

export interface ResidentPath {
  id: string;
  points: TownPoint[];
  speed: number;
  phase: number;
  scale: number;
  palette: number;
}

export interface FutureAnchor {
  x: number;
  label: string;
}

export interface TownLayout {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  headerTop: number;
  headerBottom: number;
  townTop: number;
  townBottom: number;
  dockRect: Rect;
  /** 世界宽（设计像素）；默认 1500，可左右平移。 */
  worldWidth: number;
  /** 平铺地面的地平线。 */
  groundTop: number;
  /** 相机缩放的纵向锚点（广场中心附近）。 */
  focusY: number;
  fountain: TownPoint;
  royal: { x: number; y: number; scale: number; hit: Rect };
  buildings: TownBuildingLayout[];
  residents: ResidentPath[];
  cameraBounds: TownCameraBounds;
  futureAnchors: FutureAnchor[];
  /** 兼容旧调用：大厅中心（世界坐标）。 */
  origin: TownPoint;
}

const WORLD_WIDTH = 1500;

function expand(rect: Rect, pad: number): Rect {
  return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
}

function toWorldX(screenX: number, width: number): number {
  return screenX - width / 2;
}

export function computeTownLayout(
  width: number,
  height: number,
  safeTop: number,
  safeBottom: number,
  capsuleBottom = 0,
): TownLayout {
  const headerTop = Math.max(safeTop, capsuleBottom) + 18;
  const headerBottom = headerTop + 156;
  const dockRect: Rect = {
    x: 24,
    y: height - safeBottom - 124,
    w: width - 48,
    h: 108,
  };
  const townTop = headerBottom;
  const townBottom = dockRect.y - 14;
  const townHeight = Math.max(1, townBottom - townTop);
  const u = Math.min(1.05, Math.max(0.74, townHeight / 1100));
  const groundTop = townTop + townHeight * 0.36;
  const focusY = groundTop + townHeight * 0.29;

  // 建筑用屏幕坐标定义，再转成以屏幕中心为 0 的世界坐标；
  // 这样默认相机下四馆位置和手感与旧版一致，冒烟点击点也不会漂。
  const specs: Record<
    string,
    { screenX: number; offset: number; scale: number; w: number; h: number }
  > = {
    match3: { screenX: 170, offset: 250, scale: 0.98, w: 280, h: 330 },
    garden: { screenX: 345, offset: 20, scale: 0.82, w: 260, h: 350 },
    merge: { screenX: 555, offset: 35, scale: 0.82, w: 250, h: 340 },
    aquarium: { screenX: 615, offset: 275, scale: 0.92, w: 260, h: 330 },
  };

  const buildings = GAMES.map((entry) => {
    const spec = specs[entry.id] ?? { screenX: width / 2, offset: 120, scale: 0.9, w: 250, h: 330 };
    const scale = spec.scale * u;
    const base = {
      x: toWorldX(spec.screenX, width),
      y: groundTop + spec.offset * u,
    };
    const art: Rect = {
      x: base.x - (spec.w * scale) / 2,
      y: base.y - spec.h * scale,
      w: spec.w * scale,
      h: spec.h * scale,
    };
    return {
      entry,
      accent: accentOf(entry.accent),
      base,
      art,
      hit: expand(art, 6),
      depth: base.y,
      scale,
    };
  });

  const fountain = { x: 0, y: groundTop + 270 * u };
  const royalY = groundTop + 400 * u;
  const royal = {
    x: 0,
    y: royalY,
    scale: 0.98 * u,
    hit: { x: -92 * u, y: royalY - 160 * u, w: 184 * u, h: 190 * u },
  };

  const residents: ResidentPath[] = [
    {
      id: 'resident-a',
      points: [
        { x: toWorldX(130, width), y: groundTop + 470 * u },
        { x: toWorldX(280, width), y: groundTop + 505 * u },
        { x: toWorldX(440, width), y: groundTop + 475 * u },
      ],
      speed: 0.055,
      phase: 0,
      scale: 0.95 * u,
      palette: 0,
    },
    {
      id: 'resident-b',
      points: [
        { x: toWorldX(605, width), y: groundTop + 455 * u },
        { x: toWorldX(455, width), y: groundTop + 500 * u },
        { x: toWorldX(270, width), y: groundTop + 470 * u },
      ],
      speed: 0.045,
      phase: 0.37,
      scale: 0.9 * u,
      palette: 2,
    },
    {
      id: 'resident-c',
      points: [
        { x: toWorldX(300, width), y: groundTop + 550 * u },
        { x: toWorldX(450, width), y: groundTop + 520 * u },
        { x: toWorldX(570, width), y: groundTop + 555 * u },
      ],
      speed: 0.038,
      phase: 0.71,
      scale: 0.85 * u,
      palette: 4,
    },
  ];

  return {
    width,
    height,
    safeTop,
    safeBottom,
    headerTop,
    headerBottom,
    townTop,
    townBottom,
    dockRect,
    worldWidth: WORLD_WIDTH,
    groundTop,
    focusY,
    fountain,
    royal,
    buildings,
    residents,
    cameraBounds: {
      worldWidth: WORLD_WIDTH,
      viewWidth: width,
      minZoom: 0.85,
      maxZoom: 1.2,
    },
    futureAnchors: [
      { x: -520, label: '西街' },
      { x: 520, label: '东街' },
    ],
    origin: { x: 0, y: fountain.y },
  };
}

export function townBuildingAt(
  layout: TownLayout,
  worldX: number,
  worldY: number,
): TownBuildingLayout | null {
  const ordered = [...layout.buildings].sort((a, b) => b.depth - a.depth);
  for (const building of ordered) {
    const hit = building.hit;
    if (worldX >= hit.x && worldX <= hit.x + hit.w && worldY >= hit.y && worldY <= hit.y + hit.h) {
      return building;
    }
  }
  return null;
}

export function isOverRoyal(layout: TownLayout, worldX: number, worldY: number): boolean {
  const hit = layout.royal.hit;
  return worldX >= hit.x && worldX <= hit.x + hit.w && worldY >= hit.y && worldY <= hit.y + hit.h;
}

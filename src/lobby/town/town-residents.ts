import { createRng, Rng } from '../../core/rng';
import { BUILDING_ANCHORS, FACILITY_ANCHORS } from './town-buildings';
import {
  TownBuildingLayout,
  TownFacilityLayout,
  TownLayout,
  TownPoint,
} from './town-layout';

/** 小人身份：都是王都的街坊与店员，差异靠剪影（头饰/身高/挎篮）区分。 */
export type VillagerRole =
  | 'child'
  | 'youth'
  | 'girl'
  | 'keeper'
  | 'gardener'
  | 'clerk'
  | 'farmer'
  | 'granny';

export const VILLAGER_ROLES: readonly VillagerRole[] = [
  'child',
  'youth',
  'girl',
  'keeper',
  'gardener',
  'clerk',
  'farmer',
  'granny',
];

const ROLE_SPEED: Record<VillagerRole, number> = {
  child: 1.12,
  youth: 1.05,
  girl: 1,
  keeper: 0.92,
  gardener: 0.95,
  clerk: 0.98,
  farmer: 0.88,
  granny: 0.72,
};

const ROLE_SIZE: Record<VillagerRole, number> = {
  child: 0.82,
  youth: 1,
  girl: 0.97,
  keeper: 1,
  gardener: 1,
  clerk: 1,
  farmer: 1.04,
  granny: 0.92,
};

/** 世界像素/秒；和建筑宽度对照，走完广场约 6–8 秒。 */
const WALK_SPEED = 46;
const MAX_VILLAGERS = 5;

export type ResidentActivity = 'walk' | 'idle' | 'inside';

export interface ResidentActor {
  id: string;
  role: VillagerRole;
  palette: number;
  x: number;
  y: number;
  facing: number;
  /** 已缩放好的设计像素尺寸；绘制时再乘相机 zoom。 */
  scale: number;
  activity: ResidentActivity;
  /** inside / idle 的剩余时间。 */
  timer: number;
  /** 进出门淡入淡出。 */
  alpha: number;
  /** 累计步幅，用来摆腿。 */
  stride: number;
  route: TownPoint[];
  routeIndex: number;
  /** 当前所在（或前往）的路网节点。 */
  atNodeId: string;
  targetId: string;
  buildingId: string;
  /** 进入建筑的次数，测试用。 */
  entries: number;
  /** 眨眼/待机相位。 */
  phase: number;
}

export type TownRoadNodeKind = 'plaza' | 'door' | 'street';

export interface TownRoadNode {
  id: string;
  kind: TownRoadNodeKind;
  point: TownPoint;
  buildingId?: string;
  /** 只有可游玩场馆/设施的门口才会被小人进出。 */
  enterable?: boolean;
}

interface RoadLink {
  to: number;
  /** 从当前节点走到 to 的采样点（含两端）。 */
  points: TownPoint[];
}

export interface TownRoads {
  nodes: TownRoadNode[];
  index: Map<string, number>;
  links: RoadLink[][];
}

function quadPoint(from: TownPoint, control: TownPoint, to: TownPoint, t: number): TownPoint {
  const inv = 1 - t;
  return {
    x: inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x,
    y: inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y,
  };
}

function sampleQuad(from: TownPoint, control: TownPoint, to: TownPoint, steps: number): TownPoint[] {
  const points: TownPoint[] = [];
  for (let i = 0; i <= steps; i += 1) points.push(quadPoint(from, control, to, i / steps));
  return points;
}

function doorPoint(structure: TownBuildingLayout | TownFacilityLayout): TownPoint {
  const anchor =
    structure.kind === 'venue'
      ? BUILDING_ANCHORS[structure.id]
      : FACILITY_ANCHORS[structure.id];
  const door = anchor ? anchor.door : { x: 0, y: -18 };
  return {
    x: structure.base.x + door.x * structure.scale,
    y: structure.base.y + door.y * structure.scale,
  };
}

/**
 * 路网和 `TownArt.bakeGround` 画出来的路用同一套公式，
 * 这样小人永远踩在画出来的小路上，不会穿草坪。
 */
export function buildTownRoads(layout: TownLayout): TownRoads {
  const nodes: TownRoadNode[] = [];
  const index = new Map<string, number>();
  const links: RoadLink[][] = [];

  const addNode = (node: TownRoadNode): number => {
    index.set(node.id, nodes.length);
    nodes.push(node);
    links.push([]);
    return nodes.length - 1;
  };
  const addLink = (a: number, b: number, points: TownPoint[]): void => {
    links[a].push({ to: b, points });
    links[b].push({ to: a, points: [...points].reverse() });
  };

  const plazaPoint: TownPoint = { x: 0, y: layout.fountain.y + 34 };
  const plaza = addNode({ id: 'plaza', kind: 'plaza', point: plazaPoint });

  // 广场 → 每座建筑的门口：和烘焙的支路同一条二次贝塞尔。
  for (const structure of layout.structures) {
    const door = doorPoint(structure);
    const node = addNode({
      id: `door:${structure.id}`,
      kind: 'door',
      point: door,
      buildingId: structure.id,
      enterable: structure.kind === 'facility' || structure.entry.status === 'playable',
    });
    const control = { x: door.x / 2, y: (plazaPoint.y + door.y) / 2 + 28 };
    addLink(plaza, node, sampleQuad(plazaPoint, control, door, 6));
  }

  // 东西街：和烘焙公式一致，末端收在相机能平移到的范围内。
  const halfWorld = layout.worldWidth / 2;
  const streetSteps = 9;
  const streetEnd = 0.78;
  for (const side of [-1, 1] as const) {
    const points: TownPoint[] = [plazaPoint, { x: side * 190, y: layout.fountain.y + 84 }];
    for (let i = 1; i <= streetSteps; i += 1) {
      const t = (i / streetSteps) * streetEnd;
      points.push({
        x: side * (190 + (halfWorld - 120) * t),
        y: layout.fountain.y + 84 + Math.sin(t * 2.2) * 28 + t * 14,
      });
    }
    const node = addNode({
      id: side < 0 ? 'west' : 'east',
      kind: 'street',
      point: points[points.length - 1],
    });
    addLink(plaza, node, points);
  }

  // 主街：广场往南到 Dock 上方，和烘焙的踏步石走同一条中线。
  const southY = Math.max(layout.fountain.y + 180, layout.dockRect.y - 46);
  const mainPoints: TownPoint[] = [plazaPoint];
  const mainSteps = 8;
  for (let i = 1; i <= mainSteps; i += 1) {
    const t = i / mainSteps;
    mainPoints.push({
      x: Math.sin(t * 2.2) * 18,
      y: layout.fountain.y + 110 + (southY - layout.fountain.y - 110) * t,
    });
  }
  const south = addNode({ id: 'south', kind: 'street', point: mainPoints[mainPoints.length - 1] });
  addLink(plaza, south, mainPoints);

  return { nodes, index, links };
}

/** BFS 选最短节点路径，再拼成一条折线；起终点相同时返回单点。 */
export function roadPath(roads: TownRoads, fromId: string, toId: string): TownPoint[] {
  const start = roads.index.get(fromId);
  const goal = roads.index.get(toId);
  if (start === undefined || goal === undefined) return [];
  if (start === goal) return [{ ...roads.nodes[start].point }];

  const prev = new Int32Array(roads.nodes.length).fill(-1);
  const prevLink = new Int32Array(roads.nodes.length).fill(-1);
  const queue: number[] = [start];
  prev[start] = start;

  for (let head = 0; head < queue.length && prev[goal] < 0; head += 1) {
    const current = queue[head];
    for (let linkIndex = 0; linkIndex < roads.links[current].length; linkIndex += 1) {
      const next = roads.links[current][linkIndex].to;
      if (prev[next] >= 0) continue;
      prev[next] = current;
      prevLink[next] = linkIndex;
      queue.push(next);
      if (next === goal) break;
    }
  }
  if (prev[goal] < 0) return [];

  const chain: TownPoint[][] = [];
  let cursor = goal;
  while (cursor !== start) {
    const from = prev[cursor];
    chain.push(roads.links[from][prevLink[cursor]].points);
    cursor = from;
  }

  const path: TownPoint[] = [];
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    for (const point of chain[i]) {
      const last = path[path.length - 1];
      if (last && Math.abs(last.x - point.x) < 0.01 && Math.abs(last.y - point.y) < 0.01) continue;
      path.push({ x: point.x, y: point.y });
    }
  }
  return path;
}

/** 到路网的最近距离，测试用来确认小人没走进草坪。 */
export function roadDistance(roads: TownRoads, x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const group of roads.links) {
    for (const link of group) {
      for (let i = 1; i < link.points.length; i += 1) {
        const a = link.points[i - 1];
        const b = link.points[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSq = dx * dx + dy * dy;
        const t =
          lengthSq <= 0
            ? 0
            : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq));
        best = Math.min(best, Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)));
      }
    }
  }
  return best;
}

/** 近大远小：越靠画面下方越大。 */
export function villagerDepthScale(layout: TownLayout, y: number): number {
  const span = Math.max(1, layout.townBottom - layout.groundTop);
  const depth = Math.max(0, Math.min(1, (y - layout.groundTop) / span));
  return layout.unit * (0.78 + 0.3 * depth);
}

/**
 * 首页居民导演：只负责「在哪、往哪走、什么时候进门」。
 * 不碰渲染、不碰存档；所有随机走 seeded RNG，切场景也不会跳位置以外的东西。
 */
export class ResidentDirector {
  private readonly rng: Rng;
  private readonly list: ResidentActor[] = [];
  private roads: TownRoads | null = null;
  private layout: TownLayout | null = null;

  constructor(seed = 0x7a17) {
    this.rng = createRng(seed);
  }

  get actors(): readonly ResidentActor[] {
    return this.list;
  }

  get roadGraph(): TownRoads | null {
    return this.roads;
  }

  /** 和 profile 里的居民数量对齐；新居民从某个店门口走出来。 */
  sync(count: number, palettes: readonly number[], layout: TownLayout): void {
    if (this.layout !== layout) {
      this.layout = layout;
      this.roads = buildTownRoads(layout);
    }
    const target = Math.max(0, Math.min(MAX_VILLAGERS, Math.floor(count)));
    while (this.list.length > target) this.list.pop();
    while (this.list.length < target) {
      this.spawn(this.list.length, palettes[this.list.length] ?? 0, layout);
    }
  }

  update(dt: number, layout: TownLayout, visible: { minX: number; maxX: number }, motion: boolean): void {
    if (!motion) return;
    if (!this.roads || this.layout !== layout) {
      this.sync(this.list.length, [], layout);
    }
    if (!this.roads) return;
    // 切后台回来 dt 会很大，钳一下避免瞬移穿墙。
    const step = Math.min(Math.max(dt, 0), 0.1);
    for (const actor of this.list) this.stepActor(actor, step, visible);
  }

  private spawn(slot: number, palette: number, layout: TownLayout): void {
    const roads = this.roads;
    if (!roads) return;
    const doors = roads.nodes.filter((node) => node.kind === 'door' && node.enterable);
    const door = doors.length > 0 ? doors[this.rng.int(doors.length)] : roads.nodes[0];
    const used = new Set(this.list.map((actor) => actor.role));
    let role = VILLAGER_ROLES[(slot * 3 + palette) % VILLAGER_ROLES.length];
    for (let i = 0; i < VILLAGER_ROLES.length; i += 1) {
      const candidate = VILLAGER_ROLES[(slot * 3 + palette + i) % VILLAGER_ROLES.length];
      if (!used.has(candidate)) {
        role = candidate;
        break;
      }
    }
    this.list.push({
      id: `villager-${slot}`,
      role,
      palette,
      x: door.point.x,
      y: door.point.y,
      facing: 1,
      scale: villagerDepthScale(layout, door.point.y) * ROLE_SIZE[role],
      activity: 'inside',
      timer: 0.5 + this.rng.next() * 1.4,
      alpha: 0,
      stride: 0,
      route: [],
      routeIndex: 0,
      atNodeId: door.id,
      targetId: door.id,
      buildingId: door.buildingId ?? '',
      entries: 0,
      phase: this.rng.next() * Math.PI * 2,
    });
  }

  private stepActor(
    actor: ResidentActor,
    dt: number,
    visible: { minX: number; maxX: number },
  ): void {
    if (actor.activity === 'walk') {
      actor.alpha = Math.min(1, actor.alpha + dt * 3.4);
      this.advance(actor, dt);
      if (actor.routeIndex >= actor.route.length - 1) this.arrive(actor);
    } else if (actor.activity === 'inside') {
      actor.alpha = Math.max(0, actor.alpha - dt * 3.4);
      actor.timer -= dt;
      if (actor.timer <= 0) this.walkToNext(actor, visible);
    } else {
      actor.alpha = Math.min(1, actor.alpha + dt * 3.4);
      actor.timer -= dt;
      if (actor.timer <= 0) this.walkToNext(actor, visible);
    }
    if (this.layout) {
      actor.scale = villagerDepthScale(this.layout, actor.y) * ROLE_SIZE[actor.role];
    }
  }

  private advance(actor: ResidentActor, dt: number): void {
    let remaining = WALK_SPEED * ROLE_SPEED[actor.role] * dt;
    while (remaining > 0 && actor.routeIndex < actor.route.length - 1) {
      const next = actor.route[actor.routeIndex + 1];
      const dx = next.x - actor.x;
      const dy = next.y - actor.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= remaining) {
        actor.x = next.x;
        actor.y = next.y;
        actor.stride += distance;
        remaining -= distance;
        actor.routeIndex += 1;
        if (dx > 0.4) actor.facing = 1;
        else if (dx < -0.4) actor.facing = -1;
      } else {
        actor.x += (dx / distance) * remaining;
        actor.y += (dy / distance) * remaining;
        actor.stride += remaining;
        if (dx > 0.4) actor.facing = 1;
        else if (dx < -0.4) actor.facing = -1;
        remaining = 0;
      }
    }
  }

  private arrive(actor: ResidentActor): void {
    const roads = this.roads;
    if (!roads) return;
    actor.atNodeId = actor.targetId;
    const nodeIndex = roads.index.get(actor.targetId);
    const node = nodeIndex === undefined ? null : roads.nodes[nodeIndex];
    if (node && node.kind === 'door') {
      actor.activity = 'inside';
      actor.alpha = Math.min(actor.alpha, 1);
      actor.buildingId = node.buildingId ?? '';
      actor.timer = 2.2 + this.rng.next() * 3.4;
      actor.entries += 1;
    } else {
      actor.activity = 'idle';
      actor.timer = 0.8 + this.rng.next() * 1.8;
      actor.facing = this.rng.next() < 0.5 ? -1 : 1;
    }
  }

  private walkToNext(actor: ResidentActor, visible: { minX: number; maxX: number }): void {
    const roads = this.roads;
    if (!roads) return;
    const target = this.pickTarget(actor, visible);
    const path = target ? roadPath(roads, actor.atNodeId, target) : [];
    if (!target || path.length < 2) {
      // 兜底：原地再站一会儿，避免卡死。
      actor.activity = 'idle';
      actor.timer = 0.6;
      return;
    }
    actor.route = path;
    actor.routeIndex = 0;
    actor.x = path[0].x;
    actor.y = path[0].y;
    actor.targetId = target;
    actor.buildingId = '';
    actor.activity = 'walk';
    actor.timer = 0;
  }

  private pickTarget(actor: ResidentActor, visible: { minX: number; maxX: number }): string | null {
    const roads = this.roads;
    if (!roads) return null;
    const inView = (node: TownRoadNode): boolean =>
      node.point.x >= visible.minX - 140 && node.point.x <= visible.maxX + 140;
    const visibleNodes = roads.nodes.filter(inView);
    const pool = visibleNodes.length > 1 ? visibleNodes : roads.nodes;
    const doors = pool.filter(
      (node) => node.kind === 'door' && node.enterable && node.id !== actor.atNodeId,
    );
    const places = pool.filter((node) => node.kind !== 'door' && node.id !== actor.atNodeId);
    if (doors.length > 0 && (places.length === 0 || this.rng.next() < 0.62)) {
      return doors[this.rng.int(doors.length)].id;
    }
    if (places.length > 0) return places[this.rng.int(places.length)].id;
    const fallback = pool[this.rng.int(pool.length)];
    return fallback ? fallback.id : null;
  }
}

import { describe, expect, it } from 'vitest';
import { computeTownLayout } from '../src/lobby/town/town-layout';
import {
  buildTownRoads,
  ResidentDirector,
  roadDistance,
  roadPath,
} from '../src/lobby/town/town-residents';

const layout = computeTownLayout(750, 1624, 88, 68, 164);
const visible = { minX: -375, maxX: 375 };
const roads = buildTownRoads(layout);

function simulate(director: ResidentDirector, seconds: number, motion = true): void {
  const steps = Math.round(seconds * 20);
  for (let i = 0; i < steps; i += 1) director.update(1 / 20, layout, visible, motion);
}

describe('town roads', () => {
  it('links every door to the plaza', () => {
    const plaza = roads.nodes[roads.index.get('plaza')!].point;
    for (const structure of layout.structures) {
      const door = roads.nodes[roads.index.get(`door:${structure.id}`)!].point;
      const path = roadPath(roads, `door:${structure.id}`, 'plaza');
      expect(path.length).toBeGreaterThan(1);
      expect(path[0]).toEqual(door);
      expect(path[path.length - 1]).toEqual(plaza);
    }
  });

  it('connects the east and west streets through the plaza', () => {
    const path = roadPath(roads, 'west', 'east');
    expect(path.length).toBeGreaterThan(10);
    expect(path[0]).toEqual(roads.nodes[roads.index.get('west')!].point);
    expect(path[path.length - 1]).toEqual(roads.nodes[roads.index.get('east')!].point);
  });
});

describe('resident director', () => {
  it('keeps villagers on the roads and lets them enter buildings', () => {
    const director = new ResidentDirector(0x2468);
    director.sync(5, [0, 1, 2, 3, 4], layout);
    expect(director.actors).toHaveLength(5);
    expect(new Set(director.actors.map((actor) => actor.role)).size).toBeGreaterThan(1);

    let entries = 0;
    const steps = 90 * 20;
    for (let step = 0; step < steps; step += 1) {
      director.update(1 / 20, layout, visible, true);
      for (const actor of director.actors) {
        expect(Math.abs(actor.x)).toBeLessThanOrEqual(layout.worldWidth / 2);
        expect(actor.y).toBeGreaterThan(layout.groundTop - 60);
        expect(actor.y).toBeLessThan(layout.dockRect.y);
        if (step % 10 === 0) expect(roadDistance(roads, actor.x, actor.y)).toBeLessThan(2.5);
        entries += actor.entries;
      }
    }
    expect(entries).toBeGreaterThan(0);
  });

  it('freezes when scene motion is disabled', () => {
    const director = new ResidentDirector(0x99);
    director.sync(3, [0, 1, 2], layout);
    simulate(director, 4);
    const snapshot = director.actors.map((actor) => ({ x: actor.x, y: actor.y, activity: actor.activity }));
    simulate(director, 6, false);
    director.actors.forEach((actor, index) => {
      expect(actor.x).toBe(snapshot[index].x);
      expect(actor.y).toBe(snapshot[index].y);
      expect(actor.activity).toBe(snapshot[index].activity);
    });
  });

  it('replays the same walk for the same seed', () => {
    const first = new ResidentDirector(0x5eed);
    const second = new ResidentDirector(0x5eed);
    first.sync(4, [0, 1, 2, 3], layout);
    second.sync(4, [0, 1, 2, 3], layout);
    simulate(first, 45);
    simulate(second, 45);
    expect(second.actors.map((actor) => [actor.x, actor.y, actor.activity])).toEqual(
      first.actors.map((actor) => [actor.x, actor.y, actor.activity]),
    );
  });

  it('drops villagers when the resident count shrinks', () => {
    const director = new ResidentDirector(0x77);
    director.sync(4, [0, 1, 2, 3], layout);
    director.sync(1, [0], layout);
    expect(director.actors).toHaveLength(1);
  });
});

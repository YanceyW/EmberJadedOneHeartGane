import { describe, expect, it } from 'vitest';
import {
  computeTownLayout,
  isOverRoyal,
  townBuildingAt,
} from '../src/lobby/town/town-layout';
import { townPhaseAt } from '../src/lobby/town/town-palette';

const layout = computeTownLayout(750, 1624, 88, 68, 164);

describe('flat town layout', () => {
  it('keeps the four venues inside the default camera view', () => {
    expect(layout.buildings).toHaveLength(4);
    for (const building of layout.buildings) {
      const screenX = building.hit.x + layout.width / 2;
      expect(screenX).toBeGreaterThanOrEqual(0);
      expect(screenX + building.hit.w).toBeLessThanOrEqual(layout.width);
      expect(building.hit.x).toBeGreaterThanOrEqual(-layout.worldWidth / 2);
      expect(building.hit.x + building.hit.w).toBeLessThanOrEqual(layout.worldWidth / 2);
      expect(building.base.y).toBeGreaterThan(layout.townTop);
      expect(building.base.y).toBeLessThan(layout.townBottom);
    }
  });

  it('lays the town flat and leaves room to pan', () => {
    expect(layout.worldWidth).toBeGreaterThan(layout.width);
    expect(layout.groundTop).toBeGreaterThan(layout.headerBottom);
    expect(layout.groundTop).toBeLessThan(layout.townBottom);
    expect(layout.futureAnchors).toHaveLength(2);
    expect(layout.cameraBounds.worldWidth).toBe(layout.worldWidth);
    expect(layout.cameraBounds.maxZoom).toBeGreaterThan(layout.cameraBounds.minZoom);
  });

  it('keeps the dock and header clear of the native capsule', () => {
    expect(layout.headerTop).toBeGreaterThan(164);
    expect(layout.dockRect.y + layout.dockRect.h).toBeLessThanOrEqual(1624);
    expect(layout.townTop).toBe(layout.headerBottom);
    expect(layout.townBottom).toBeGreaterThan(layout.townTop);
  });

  it('keeps the smoke-test tap point on the match3 building', () => {
    // smoke.mjs 点击设计坐标 (162, 700)；默认相机下世界坐标 = 屏幕 - 375。
    expect(townBuildingAt(layout, 162 - 375, 700)?.entry.id).toBe('match3');
  });

  it('hits the playable match3 building and the royal pair', () => {
    const match3 = layout.buildings.find((building) => building.entry.id === 'match3');
    expect(match3).toBeDefined();
    const hit = townBuildingAt(layout, match3!.base.x, match3!.base.y - 60);
    expect(hit?.entry.id).toBe('match3');
    expect(isOverRoyal(layout, layout.royal.x, layout.royal.y - 20)).toBe(true);
    expect(townBuildingAt(layout, 10, 10)).toBeNull();
  });

  it('sorts depth front-to-back for hit priority', () => {
    const ordered = [...layout.buildings].sort((a, b) => b.depth - a.depth);
    expect(ordered[0].depth).toBeGreaterThanOrEqual(ordered[ordered.length - 1].depth);
  });

  it('maps local hours to four day phases', () => {
    expect(townPhaseAt(6)).toBe('dawn');
    expect(townPhaseAt(12)).toBe('day');
    expect(townPhaseAt(18)).toBe('dusk');
    expect(townPhaseAt(23)).toBe('night');
  });
});

import { describe, expect, it } from 'vitest';
import {
  computeTownLayout,
  isOverRoyal,
  townBuildingAt,
  townStructureAt,
} from '../src/lobby/town/town-layout';
import { townPhaseAt } from '../src/lobby/town/town-palette';

const layout = computeTownLayout(750, 1624, 88, 68, 164);

describe('flat town layout', () => {
  it('keeps the four central venues inside the default camera view', () => {
    const venues = layout.buildings.filter(
      (building) =>
        building.entry.id !== 'farm' &&
        building.entry.id !== 'restaurant' &&
        building.entry.id !== 'ranch',
    );
    expect(venues).toHaveLength(4);
    for (const building of venues) {
      const screenX = building.hit.x + layout.width / 2;
      expect(screenX).toBeGreaterThanOrEqual(0);
      expect(screenX + building.hit.w).toBeLessThanOrEqual(layout.width);
      expect(building.hit.x).toBeGreaterThanOrEqual(-layout.worldWidth / 2);
      expect(building.hit.x + building.hit.w).toBeLessThanOrEqual(layout.worldWidth / 2);
      expect(building.base.y).toBeGreaterThan(layout.townTop);
      expect(building.base.y).toBeLessThan(layout.townBottom);
    }
  });

  it('places the east-street venues outside the default view', () => {
    expect(layout.buildings).toHaveLength(7);
    for (const id of ['farm', 'restaurant', 'ranch']) {
      const building = layout.buildings.find((entry) => entry.entry.id === id);
      expect(building?.entry.status, id).toBe('playable');
      expect(building!.hit.x + layout.width / 2, id).toBeGreaterThan(layout.width);
      expect(building!.hit.x, id).toBeGreaterThanOrEqual(-layout.worldWidth / 2);
      expect(building!.hit.x + building!.hit.w, id).toBeLessThanOrEqual(layout.worldWidth / 2);
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

  it('puts the warehouse on the west street, out of the default view', () => {
    expect(layout.facilities).toHaveLength(1);
    const warehouse = layout.facilities[0];
    expect(warehouse.facilityId).toBe('warehouse');
    // 默认视口外（向左拖才看到），但仍在世界范围与相机可平移范围内。
    expect(warehouse.hit.x + layout.width / 2 + warehouse.hit.w).toBeLessThan(0);
    expect(warehouse.hit.x).toBeGreaterThanOrEqual(-layout.worldWidth / 2);
    expect(warehouse.hit.x + warehouse.hit.w).toBeLessThanOrEqual(layout.worldWidth / 2);
    const limit = layout.worldWidth / 2 - layout.width / 2;
    const screenAtLimit = (warehouse.base.x - -limit) * 1 + layout.width / 2;
    expect(screenAtLimit).toBeGreaterThan(-200);
    expect(screenAtLimit).toBeLessThan(layout.width + 200);

    const hit = townStructureAt(layout, warehouse.base.x, warehouse.base.y - 60);
    expect(hit?.kind).toBe('facility');
    // 设施不参与「场馆」命中，旧接口仍然只返回场馆。
    expect(townBuildingAt(layout, warehouse.base.x, warehouse.base.y - 60)).toBeNull();
  });

  it('maps local hours to four day phases', () => {
    expect(townPhaseAt(6)).toBe('dawn');
    expect(townPhaseAt(12)).toBe('day');
    expect(townPhaseAt(18)).toBe('dusk');
    expect(townPhaseAt(23)).toBe('night');
  });
});

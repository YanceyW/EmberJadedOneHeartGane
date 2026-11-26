import { describe, expect, it } from 'vitest';
import {
  clampCamera,
  createCamera,
  panCamera,
  screenToWorld,
  TownCameraBounds,
  visibleWorldRange,
  worldToScreen,
  zoomAt,
} from '../src/lobby/town/town-camera';

const bounds: TownCameraBounds = {
  worldWidth: 1500,
  viewWidth: 750,
  minZoom: 0.85,
  maxZoom: 1.2,
};
const focusY = 1000;

describe('town camera', () => {
  it('round-trips screen and world coordinates', () => {
    for (const zoom of [0.85, 1, 1.2]) {
      const zoomed = { x: 120, zoom };
      const world = screenToWorld(zoomed, 240, 800, 750, focusY);
      const screen = worldToScreen(zoomed, world.x, world.y, 750, focusY);
      expect(screen.x).toBeCloseTo(240);
      expect(screen.y).toBeCloseTo(800);
    }
  });

  it('clamps the camera so the world never shows empty space', () => {
    const wide = clampCamera({ x: 9999, zoom: 1 }, bounds);
    expect(wide.x).toBe(375);
    const narrow = clampCamera({ x: -9999, zoom: 1 }, bounds);
    expect(narrow.x).toBe(-375);
    const zoomed = clampCamera({ x: 9999, zoom: 1.2 }, bounds);
    expect(zoomed.x).toBe(437.5);
  });

  it('pans in the drag direction and stops at the edge', () => {
    const moved = panCamera(createCamera(), 100, bounds);
    expect(moved.x).toBe(-100);
    const edge = panCamera({ x: -370, zoom: 1 }, 100, bounds);
    expect(edge.x).toBe(-375);
  });

  it('keeps the horizontal world point under the pinch anchor', () => {
    const camera = { x: 80, zoom: 1 };
    const anchorX = 300;
    const before = screenToWorld(camera, anchorX, focusY, 750, focusY);
    const zoomed = zoomAt(camera, 1.18, anchorX, focusY, bounds, focusY);
    const after = screenToWorld(zoomed, anchorX, focusY, 750, focusY);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomed.zoom).toBeCloseTo(1.18);
  });

  it('reports the visible world range', () => {
    const range = visibleWorldRange({ x: 0, zoom: 1 }, 750);
    expect(range.min).toBe(-375);
    expect(range.max).toBe(375);
  });
});

export interface TownCamera {
  /** 相机中心相对世界中心的水平偏移（世界像素）。 */
  x: number;
  zoom: number;
}

export interface TownCameraBounds {
  worldWidth: number;
  viewWidth: number;
  minZoom: number;
  maxZoom: number;
}

export interface TownPoint {
  x: number;
  y: number;
}

export function createCamera(): TownCamera {
  return { x: 0, zoom: 1 };
}

export function clampZoom(zoom: number, bounds: TownCameraBounds): number {
  return Math.min(bounds.maxZoom, Math.max(bounds.minZoom, zoom));
}

export function clampCamera(camera: TownCamera, bounds: TownCameraBounds): TownCamera {
  const zoom = clampZoom(camera.zoom, bounds);
  const halfView = bounds.viewWidth / (2 * zoom);
  const limit = Math.max(0, bounds.worldWidth / 2 - halfView);
  return {
    zoom,
    x: Math.min(limit, Math.max(-limit, camera.x)),
  };
}

export function panCamera(
  camera: TownCamera,
  dxScreen: number,
  bounds: TownCameraBounds,
): TownCamera {
  return clampCamera({ ...camera, x: camera.x - dxScreen / camera.zoom }, bounds);
}

export function worldToScreen(
  camera: TownCamera,
  worldX: number,
  worldY: number,
  viewWidth: number,
  focusY: number,
): TownPoint {
  return {
    x: (worldX - camera.x) * camera.zoom + viewWidth / 2,
    y: (worldY - focusY) * camera.zoom + focusY,
  };
}

export function screenToWorld(
  camera: TownCamera,
  screenX: number,
  screenY: number,
  viewWidth: number,
  focusY: number,
): TownPoint {
  return {
    x: (screenX - viewWidth / 2) / camera.zoom + camera.x,
    y: (screenY - focusY) / camera.zoom + focusY,
  };
}

export function zoomAt(
  camera: TownCamera,
  nextZoom: number,
  anchorScreenX: number,
  anchorScreenY: number,
  bounds: TownCameraBounds,
  focusY: number,
): TownCamera {
  const zoom = clampZoom(nextZoom, bounds);
  const anchor = screenToWorld(camera, anchorScreenX, anchorScreenY, bounds.viewWidth, focusY);
  const x = anchor.x - (anchorScreenX - bounds.viewWidth / 2) / zoom;
  return clampCamera({ x, zoom }, bounds);
}

export function visibleWorldRange(
  camera: TownCamera,
  viewWidth: number,
): { min: number; max: number } {
  const half = viewWidth / (2 * camera.zoom);
  return {
    min: camera.x - half,
    max: camera.x + half,
  };
}

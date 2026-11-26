import { platform, TapPoint } from '../../shared/platform/wx';
import { Renderer } from '../render/renderer';

type TapListener = (point: TapPoint) => void;

export interface PointerPoint {
  id: number;
  x: number;
  y: number;
}

export interface SwipeEvent extends PointerPoint {
  dx: number;
  dy: number;
}

export interface PinchEvent {
  /** 相对双指起始距离的倍数。 */
  scale: number;
  centerX: number;
  centerY: number;
}

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

interface TouchStart {
  x: number;
  y: number;
  at: number;
  swiped: boolean;
}

export const SWIPE_THRESHOLD = 22;
const TAP_MOVE_LIMIT = SWIPE_THRESHOLD;
const TAP_TIME_LIMIT = 650;

/**
 * 手势方向判定：超过阈值后取位移更大的轴，斜滑也只会得到一个方向。
 */
export function classifySwipe(
  dx: number,
  dy: number,
  threshold = SWIPE_THRESHOLD,
): SwipeDirection | null {
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

export class InputService {
  private readonly taps = new Set<TapListener>();
  private readonly presses = new Set<(point: PointerPoint) => void>();
  private readonly drags = new Set<(point: PointerPoint) => void>();
  private readonly releases = new Set<(point: PointerPoint) => void>();
  private readonly swipes = new Set<(event: SwipeEvent) => void>();
  private readonly pinches = new Set<(event: PinchEvent) => void>();
  private readonly starts = new Map<number, TouchStart>();
  private pinchStartDistance = 0;
  private pinching = false;

  constructor(private readonly renderer: Renderer) {
    platform.onTouchStart((event) => this.handleStart(event));
    platform.onTouchMove((event) => this.handleMove(event));
    platform.onTouchEnd((event) => this.handleEnd(event));
    platform.onTouchCancel((event) => this.handleCancel(event));
  }

  onTap(listener: TapListener): () => void {
    this.taps.add(listener);
    return () => this.taps.delete(listener);
  }

  onPress(listener: (point: PointerPoint) => void): () => void {
    this.presses.add(listener);
    return () => this.presses.delete(listener);
  }

  onDrag(listener: (point: PointerPoint) => void): () => void {
    this.drags.add(listener);
    return () => this.drags.delete(listener);
  }

  onRelease(listener: (point: PointerPoint) => void): () => void {
    this.releases.add(listener);
    return () => this.releases.delete(listener);
  }

  onSwipe(listener: (event: SwipeEvent) => void): () => void {
    this.swipes.add(listener);
    return () => this.swipes.delete(listener);
  }

  onPinch(listener: (event: PinchEvent) => void): () => void {
    this.pinches.add(listener);
    return () => this.pinches.delete(listener);
  }

  private startPinchIfNeeded(): void {
    if (this.starts.size !== 2) return;
    const [a, b] = Array.from(this.starts.values());
    this.pinchStartDistance = Math.hypot(a.x - b.x, a.y - b.y);
    if (this.pinchStartDistance < 8) {
      this.pinchStartDistance = 0;
      return;
    }
    this.pinching = true;
    for (const start of this.starts.values()) start.swiped = true;
  }

  private handleStart(event: WxTouchEvent): void {
    for (const touch of event.touches) {
      const point = this.renderer.toDesign(touch.clientX, touch.clientY);
      this.starts.set(touch.identifier, {
        x: point.x,
        y: point.y,
        at: Date.now(),
        swiped: false,
      });
      this.press({ id: touch.identifier, x: point.x, y: point.y });
    }
    this.startPinchIfNeeded();
  }

  private handleMove(event: WxTouchEvent): void {
    if (this.pinching && event.touches.length >= 2 && this.pinchStartDistance > 0) {
      const a = this.renderer.toDesign(event.touches[0].clientX, event.touches[0].clientY);
      const b = this.renderer.toDesign(event.touches[1].clientX, event.touches[1].clientY);
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 1) {
        const pinch: PinchEvent = {
          scale: distance / this.pinchStartDistance,
          centerX: (a.x + b.x) / 2,
          centerY: (a.y + b.y) / 2,
        };
        for (const listener of this.pinches) listener(pinch);
      }
      return;
    }

    for (const touch of event.touches) {
      const start = this.starts.get(touch.identifier);
      if (!start) continue;
      const point = this.renderer.toDesign(touch.clientX, touch.clientY);
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      this.drag({ id: touch.identifier, x: point.x, y: point.y });

      if (start.swiped) continue;
      if (!classifySwipe(dx, dy)) continue;
      start.swiped = true;
      for (const listener of this.swipes) {
        listener({ id: touch.identifier, x: start.x, y: start.y, dx, dy });
      }
    }
  }

  private handleEnd(event: WxTouchEvent): void {
    for (const touch of event.changedTouches) {
      const start = this.starts.get(touch.identifier);
      this.starts.delete(touch.identifier);
      if (!start) continue;

      const point = this.renderer.toDesign(touch.clientX, touch.clientY);
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!start.swiped && distance <= TAP_MOVE_LIMIT && Date.now() - start.at <= TAP_TIME_LIMIT) {
        for (const listener of this.taps) {
          listener({ id: touch.identifier, x: point.x, y: point.y });
        }
      }
      this.release({ id: touch.identifier, x: point.x, y: point.y });
    }
    if (this.starts.size < 2) {
      this.pinching = false;
      this.pinchStartDistance = 0;
    }
  }

  private handleCancel(event: WxTouchEvent): void {
    for (const touch of event.changedTouches) {
      this.starts.delete(touch.identifier);
      const point = this.renderer.toDesign(touch.clientX, touch.clientY);
      this.release({ id: touch.identifier, x: point.x, y: point.y });
    }
    if (this.starts.size < 2) {
      this.pinching = false;
      this.pinchStartDistance = 0;
    }
  }

  private press(point: PointerPoint): void {
    for (const listener of this.presses) listener(point);
  }

  private drag(point: PointerPoint): void {
    for (const listener of this.drags) listener(point);
  }

  private release(point: PointerPoint): void {
    for (const listener of this.releases) listener(point);
  }
}

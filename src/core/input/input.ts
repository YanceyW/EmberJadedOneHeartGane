import { platform, TapPoint } from '../../shared/platform/wx';
import { Renderer } from '../render/renderer';

type TapListener = (point: TapPoint) => void;

interface TouchStart {
  x: number;
  y: number;
  at: number;
}

const TAP_MOVE_LIMIT = 26;
const TAP_TIME_LIMIT = 650;

export class InputService {
  private readonly listeners = new Set<TapListener>();
  private readonly starts = new Map<number, TouchStart>();

  constructor(private readonly renderer: Renderer) {
    platform.onTouchStart((event) => this.handleStart(event));
    platform.onTouchEnd((event) => this.handleEnd(event));
    platform.onTouchCancel((event) => this.handleCancel(event));
  }

  onTap(listener: TapListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleStart(event: WxTouchEvent): void {
    for (const touch of event.touches) {
      const point = this.renderer.toDesign(touch.clientX, touch.clientY);
      this.starts.set(touch.identifier, { x: point.x, y: point.y, at: Date.now() });
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
      if (distance > TAP_MOVE_LIMIT || Date.now() - start.at > TAP_TIME_LIMIT) continue;

      for (const listener of this.listeners) {
        listener({ id: touch.identifier, x: point.x, y: point.y });
      }
    }
  }

  private handleCancel(event: WxTouchEvent): void {
    for (const touch of event.changedTouches) {
      this.starts.delete(touch.identifier);
    }
  }
}

import { describe, expect, it, vi } from 'vitest';
import { InputService, SWIPE_THRESHOLD, classifySwipe } from '../src/core/input/input';
import type { Renderer } from '../src/core/render/renderer';

type TouchHandler = (event: {
  touches: Array<{ identifier: number; clientX: number; clientY: number }>;
  changedTouches: Array<{ identifier: number; clientX: number; clientY: number }>;
}) => void;

function installTouchMock(): Record<'start' | 'move' | 'end', TouchHandler> {
  const handlers = {
    start: (() => {}) as TouchHandler,
    move: (() => {}) as TouchHandler,
    end: (() => {}) as TouchHandler,
  };
  (globalThis as unknown as { wx: unknown }).wx = {
    onTouchStart: (cb: TouchHandler) => {
      handlers.start = cb;
    },
    onTouchMove: (cb: TouchHandler) => {
      handlers.move = cb;
    },
    onTouchEnd: (cb: TouchHandler) => {
      handlers.end = cb;
    },
    onTouchCancel: () => {},
  };
  return handlers;
}

describe('swipe direction', () => {
  it('recognises the four cardinal directions', () => {
    expect(classifySwipe(40, 0)).toBe('right');
    expect(classifySwipe(-40, 0)).toBe('left');
    expect(classifySwipe(0, 40)).toBe('down');
    expect(classifySwipe(0, -40)).toBe('up');
  });

  it('uses the dominant axis for diagonal swipes', () => {
    expect(classifySwipe(42, 18)).toBe('right');
    expect(classifySwipe(-18, 42)).toBe('down');
    expect(classifySwipe(12, -42)).toBe('up');
  });

  it('ignores movement below the threshold', () => {
    expect(classifySwipe(0, 0)).toBeNull();
    expect(classifySwipe(SWIPE_THRESHOLD - 1, 0)).toBeNull();
    expect(classifySwipe(0, -(SWIPE_THRESHOLD - 1))).toBeNull();
  });

  it('triggers at the threshold and respects a custom threshold', () => {
    expect(classifySwipe(SWIPE_THRESHOLD, 0)).toBe('right');
    expect(classifySwipe(10, 10, 5)).toBe('right');
    expect(classifySwipe(10, 10, 20)).toBeNull();
  });
});

describe('pinch gesture', () => {
  it('emits scale relative to the initial two-touch distance', () => {
    const handlers = installTouchMock();
    const renderer = { toDesign: (x: number, y: number) => ({ x, y }) } as unknown as Renderer;
    const input = new InputService(renderer);
    const pinches: number[] = [];
    const taps = vi.fn();
    input.onPinch((event) => pinches.push(event.scale));
    input.onTap(taps);

    handlers.start({
      touches: [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 200, clientY: 100 },
      ],
      changedTouches: [],
    });
    handlers.move({
      touches: [
        { identifier: 1, clientX: 80, clientY: 100 },
        { identifier: 2, clientX: 220, clientY: 100 },
      ],
      changedTouches: [],
    });
    handlers.end({
      touches: [],
      changedTouches: [
        { identifier: 1, clientX: 80, clientY: 100 },
        { identifier: 2, clientX: 220, clientY: 100 },
      ],
    });

    expect(pinches).toHaveLength(1);
    expect(pinches[0]).toBeCloseTo(1.4);
    expect(taps).not.toHaveBeenCalled();
  });
});

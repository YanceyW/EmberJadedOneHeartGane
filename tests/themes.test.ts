import { describe, expect, it } from 'vitest';
import { TOWN_PHASES } from '../src/shared/design-system/tokens';
import { STYLES, WEATHERS, findStyle, findWeather, stylePalette } from '../src/lobby/themes';

describe('lobby themes', () => {
  it('keeps weather free and announces festival prices', () => {
    expect(WEATHERS.every((weather) => weather.price === 0)).toBe(true);
    expect(findWeather('snow')?.name).toBe('飘雪');
    expect(STYLES.find((style) => style.id === 'classic')?.price).toBe(0);
    expect(
      STYLES.filter((style) => style.id !== 'classic').every((style) => style.price > 0),
    ).toBe(true);
  });

  it('tints day colors for festival styles but leaves unknown styles untouched', () => {
    const classic = TOWN_PHASES.day;
    const spring = stylePalette(classic, 'day', 'spring');
    expect(spring.skyTop).not.toBe(classic.skyTop);
    expect(spring.grass).not.toBe(classic.grass);
    expect(stylePalette(classic, 'day', 'unknown')).toEqual(classic);
    expect(stylePalette(classic, 'night', 'spring')).toEqual(classic);
  });

  it('resolves known style ids only', () => {
    expect(findStyle('lantern')?.name).toBe('灯会之夜');
    expect(findStyle('nope')).toBeUndefined();
  });
});

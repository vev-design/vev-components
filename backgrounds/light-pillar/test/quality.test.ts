import { describe, expect, it } from 'vitest';
import {
  createQualityGovernor,
  estimateStepsPerPixel,
  getPixelBudget,
  getRenderSize,
  MAX_HEIGHT,
  MAX_PIXELS,
  MAX_TARGET_FPS,
  MAX_WIDTH,
  MIN_PIXELS,
  MIN_TARGET_FPS,
  RENDER_SCALES,
  START_TIER,
} from '../src/quality';

const FULL_BLEED_HERO = { height: 1440, width: 2560 };
const pixels = (size: { height: number; width: number }) => size.width * size.height;

describe('estimateStepsPerPixel', () => {
  it('grows with pillar width and saturates at the loop bound', () => {
    expect(estimateStepsPerPixel(1)).toBe(34);
    expect(estimateStepsPerPixel(3)).toBe(43);
    expect(estimateStepsPerPixel(8)).toBe(64);
    expect(estimateStepsPerPixel(10)).toBe(64);
  });

  it('interpolates between measured widths', () => {
    expect(estimateStepsPerPixel(3.5)).toBeCloseTo(45.5, 5);
  });

  it('handles out-of-range and invalid widths', () => {
    expect(estimateStepsPerPixel(0)).toBe(34);
    expect(estimateStepsPerPixel(-5)).toBe(34);
    expect(estimateStepsPerPixel(Number.NaN)).toBe(64);
  });
});

describe('getPixelBudget', () => {
  it('stays within the configured bounds', () => {
    for (let width = 0.5; width <= 12; width += 0.25) {
      const budget = getPixelBudget(width);
      expect(budget).toBeGreaterThanOrEqual(MIN_PIXELS);
      expect(budget).toBeLessThanOrEqual(MAX_PIXELS);
    }
  });

  it('spends fewer pixels on the widths that never exit the raymarch early', () => {
    expect(getPixelBudget(10)).toBeLessThan(getPixelBudget(3));
  });
});

describe('getRenderSize', () => {
  it('never renders more pixels than the element covers', () => {
    const small = getRenderSize({ height: 120, width: 200 }, 1, 3);
    expect(small).toEqual({ height: 120, width: 200 });
  });

  it('caps a full-bleed hero to the pixel budget while keeping the aspect ratio', () => {
    const size = getRenderSize(FULL_BLEED_HERO, 1, 10);
    expect(pixels(size)).toBeLessThanOrEqual(getPixelBudget(10));
    expect(size.width / size.height).toBeCloseTo(FULL_BLEED_HERO.width / FULL_BLEED_HERO.height, 1);
    expect(size.width).toBeLessThanOrEqual(MAX_WIDTH);
    expect(size.height).toBeLessThanOrEqual(MAX_HEIGHT);
  });

  it('renders far fewer pixels than the pre-fix 1440x900 cap for the reported hero', () => {
    // The reported page: a 100vh hero with pillarWidth 10, where every pixel
    // runs all 64 raymarch steps.
    const before = 1440 * 810;
    const after = pixels(getRenderSize(FULL_BLEED_HERO, RENDER_SCALES[START_TIER], 10));
    expect(after).toBeLessThan(before / 3);
  });

  it('scales cost with the square of the tier scale', () => {
    const full = pixels(getRenderSize(FULL_BLEED_HERO, 1, 10));
    const half = pixels(getRenderSize(FULL_BLEED_HERO, 0.5, 10));
    expect(half / full).toBeCloseTo(0.25, 1);
  });

  it('is monotonic in the tier scale', () => {
    let previous = Infinity;
    for (const scale of RENDER_SCALES) {
      const current = pixels(getRenderSize(FULL_BLEED_HERO, scale, 10));
      expect(current).toBeLessThan(previous);
      previous = current;
    }
  });

  it('stays at one pixel or more for degenerate sizes', () => {
    expect(getRenderSize({ height: 0, width: 0 }, 0.35, 10)).toEqual({ height: 1, width: 1 });
    expect(getRenderSize({ height: 3, width: 3 }, 0.35, 10)).toEqual({ height: 1, width: 1 });
  });
});

describe('createQualityGovernor', () => {
  const smooth = 1000 / MAX_TARGET_FPS;
  const feed = (governor: ReturnType<typeof createQualityGovernor>, interval: number, count: number) => {
    let changes = 0;
    for (let i = 0; i < count; i++) if (governor.sample(interval)) changes += 1;
    return changes;
  };

  it('starts one tier below the best one at the full frame rate', () => {
    const state = createQualityGovernor().state();
    expect(state.tier).toBe(START_TIER);
    expect(state.targetFps).toBe(MAX_TARGET_FPS);
    expect(state.frozen).toBe(false);
  });

  it('holds quality while frames arrive on time', () => {
    const governor = createQualityGovernor();
    expect(feed(governor, smooth * 1.5, 500)).toBe(0);
    expect(governor.state().tier).toBe(START_TIER);
  });

  it('climbs one tier when the device holds the target frame rate', () => {
    const governor = createQualityGovernor();
    feed(governor, smooth, 200);
    expect(governor.state().tier).toBe(0);
  });

  it('walks down to the cheapest tier and then halves the frame rate', () => {
    const governor = createQualityGovernor();
    feed(governor, 120, 2000);
    const state = governor.state();
    expect(state.tier).toBe(RENDER_SCALES.length - 1);
    expect(state.targetFps).toBe(MIN_TARGET_FPS);
  });

  it('does not stop animating just because a display runs at 30fps', () => {
    const governor = createQualityGovernor();
    feed(governor, 1000 / 30, 5000);
    expect(governor.state().frozen).toBe(false);
    expect(governor.state().targetFps).toBe(MIN_TARGET_FPS);
  });

  it('never climbs back to a tier that was already too slow', () => {
    const governor = createQualityGovernor();
    feed(governor, 120, 100);
    const degraded = governor.state().tier;
    expect(degraded).toBeGreaterThan(START_TIER);

    feed(governor, smooth, 5000);
    expect(governor.state().tier).toBe(degraded);
  });

  it('reacts to a single stalled frame without waiting for the average', () => {
    const governor = createQualityGovernor();
    expect(governor.sample(300)).toBe(true);
    expect(governor.state().tier).toBe(START_TIER + 1);
  });

  it('recovers quality after a one-off stall, unlike sustained slowness', () => {
    const governor = createQualityGovernor();
    governor.sample(300);
    expect(governor.state().tier).toBe(START_TIER + 1);

    feed(governor, smooth, 200);
    expect(governor.state().tier).toBeLessThan(START_TIER + 1);
  });

  it('collapses to the cheapest setting on the first near-hang frame', () => {
    const governor = createQualityGovernor();
    expect(governor.sample(1500)).toBe(true);
    const state = governor.state();
    expect(state.tier).toBe(RENDER_SCALES.length - 1);
    expect(state.targetFps).toBe(MIN_TARGET_FPS);
    expect(state.frozen).toBe(false);
  });

  it('stops animating when a near-hang frame happens again', () => {
    const governor = createQualityGovernor();
    governor.sample(1500);
    expect(governor.sample(1500)).toBe(true);
    expect(governor.state().frozen).toBe(true);
  });

  it('ignores samples once frozen', () => {
    const governor = createQualityGovernor();
    governor.freeze();
    expect(feed(governor, smooth, 500)).toBe(0);
    expect(governor.state().frozen).toBe(true);
  });

  it('ignores bogus intervals', () => {
    const governor = createQualityGovernor();
    expect(governor.sample(0)).toBe(false);
    expect(governor.sample(-16)).toBe(false);
    expect(governor.sample(Number.NaN)).toBe(false);
    expect(governor.state().tier).toBe(START_TIER);
  });

  it('collapses after a lost context and reports whether anything changed', () => {
    const governor = createQualityGovernor();
    expect(governor.collapse()).toBe(true);
    expect(governor.collapse()).toBe(false);
    expect(governor.state().scale).toBe(RENDER_SCALES[RENDER_SCALES.length - 1]);
  });
});

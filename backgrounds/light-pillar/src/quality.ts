// Render-cost budgeting for LightPillar.
//
// The fragment shader raymarches up to 64 steps per pixel and every step runs
// ~14 transcendental ops, so frame cost is dominated by the number of rendered
// pixels. Pixel count is also the only knob that scales cost without changing
// the look: the canvas is stretched to the element size by CSS, so rendering
// fewer pixels only softens an already soft glow.
//
// Two guards live here:
//  1. a pixel budget that normalises cost across prop values and element sizes
//  2. a governor that measures achieved frame intervals and steps quality down
//     when the GPU cannot keep up (never up again once it has stepped down)

export type Size = { width: number; height: number };

export const MAX_WIDTH = 1440;
export const MAX_HEIGHT = 900;

// Upper bound on rendered pixels, before the quality tier is applied.
export const MAX_PIXELS = 1_036_800; // 1440 x 720
export const MIN_PIXELS = 120_000;

// Raymarch steps we are willing to run per frame. Divided by the estimated
// steps per pixel this yields the pixel budget, so a wide pillar (which keeps
// every ray inside the field for all 64 steps) trades resolution instead of
// frame rate.
export const STEP_BUDGET = 45_000_000;

// Mean raymarch steps per pixel, measured by simulating the shader over a full
// canvas at the default pillarHeight. Below `pillarWidth` ~8 rays escape the
// radial bound early; above it every pixel runs the full 64 steps.
const STEPS_PER_PIXEL: ReadonlyArray<readonly [number, number]> = [
  [1, 34],
  [2, 39],
  [3, 43],
  [4, 48],
  [5, 52],
  [6, 57],
  [8, 64],
];

export const estimateStepsPerPixel = (pillarWidth: number): number => {
  if (!Number.isFinite(pillarWidth)) return 64;
  const first = STEPS_PER_PIXEL[0];
  const last = STEPS_PER_PIXEL[STEPS_PER_PIXEL.length - 1];
  if (pillarWidth <= first[0]) return first[1];
  if (pillarWidth >= last[0]) return last[1];

  for (let i = 1; i < STEPS_PER_PIXEL.length; i++) {
    const [x1, y1] = STEPS_PER_PIXEL[i];
    if (pillarWidth <= x1) {
      const [x0, y0] = STEPS_PER_PIXEL[i - 1];
      return y0 + ((y1 - y0) * (pillarWidth - x0)) / (x1 - x0);
    }
  }
  return last[1];
};

export const getPixelBudget = (pillarWidth: number): number => {
  const budget = STEP_BUDGET / estimateStepsPerPixel(pillarWidth);
  return Math.min(MAX_PIXELS, Math.max(MIN_PIXELS, Math.round(budget)));
};

// Resolution multipliers, best first. Cost scales with the square of these.
export const RENDER_SCALES: ReadonlyArray<number> = [1, 0.7, 0.5, 0.35];

// Start one tier below the best one: cheap enough that a weak GPU is unlikely
// to stall on the very first frames, and the governor can climb to tier 0 when
// the device proves it can hold 60fps.
export const START_TIER = 1;

export const MIN_TARGET_FPS = 30;
export const MAX_TARGET_FPS = 60;

/**
 * Device pixel size for a CSS size, never larger than the CSS size itself.
 * Applies the dimension caps, then the pixel budget, then the tier scale,
 * always preserving aspect ratio.
 */
export const getRenderSize = (css: Size, scale: number, pillarWidth: number): Size => {
  const cssWidth = Math.max(1, Math.floor(css.width || 0));
  const cssHeight = Math.max(1, Math.floor(css.height || 0));

  let factor = Math.min(1, MAX_WIDTH / cssWidth, MAX_HEIGHT / cssHeight);

  const budget = getPixelBudget(pillarWidth);
  const pixels = cssWidth * factor * cssHeight * factor;
  if (pixels > budget) factor *= Math.sqrt(budget / pixels);

  factor *= Math.min(1, Math.max(0.05, scale));

  return {
    width: Math.max(1, Math.floor(cssWidth * factor)),
    height: Math.max(1, Math.floor(cssHeight * factor)),
  };
};

export type QualityState = {
  frozen: boolean;
  scale: number;
  targetFps: number;
  tier: number;
};

export type QualityOptions = {
  /** A single frame this slow (ms) means the tab is close to hanging. */
  hangMs: number;
  /** Mean interval below `targetInterval * fastFactor` allows a step up. */
  fastFactor: number;
  /** Frames ignored after a change, so a resize is not measured as a stall. */
  settleFrames: number;
  /** Mean interval above `targetInterval * slowFactor` triggers a step down. */
  slowFactor: number;
  startTier: number;
  /** A single frame this slow (ms) triggers an immediate step down. */
  stallMs: number;
  /** Frames averaged before acting on the mean. */
  window: number;
};

export const DEFAULT_QUALITY_OPTIONS: QualityOptions = {
  // Wide enough that a 120/144Hz display, where the 60fps cap lands on every
  // third vsync, still counts as comfortable.
  fastFactor: 1.35,
  hangMs: 1000,
  settleFrames: 10,
  slowFactor: 1.8,
  startTier: START_TIER,
  stallMs: 250,
  window: 30,
};

export type QualityGovernor = {
  /** Drop to the cheapest tier immediately (used after a lost GL context). */
  collapse: () => boolean;
  /** Stop animating and hold the last frame. */
  freeze: () => boolean;
  /** Feed the interval since the previous drawn frame. Returns true on change. */
  sample: (intervalMs: number) => boolean;
  state: () => QualityState;
};

export const createQualityGovernor = (options: Partial<QualityOptions> = {}): QualityGovernor => {
  const opts = { ...DEFAULT_QUALITY_OPTIONS, ...options };
  const lastTier = RENDER_SCALES.length - 1;

  let tier = Math.min(lastTier, Math.max(0, opts.startTier));
  // Best tier still allowed. Raised for good whenever a tier proves too slow,
  // which makes quality changes monotonic and stops tiers oscillating.
  let ceiling = 0;
  let targetFps = MAX_TARGET_FPS;
  let frozen = false;
  let hangs = 0;

  let samples = 0;
  let total = 0;
  let settle = opts.settleFrames;

  const resetWindow = () => {
    samples = 0;
    total = 0;
    settle = opts.settleFrames;
  };

  const state = (): QualityState => ({
    frozen,
    scale: RENDER_SCALES[tier],
    targetFps,
    tier,
  });

  // Slower tier, then half the frame rate. Freezing is deliberately not part of
  // this path: a display or power mode that simply runs at 30fps should settle
  // at 30fps rather than stop animating.
  //
  // Sustained slowness is permanent (the tier we left is never used again);
  // a one-off stalled frame is not, so a single hitch from something else on
  // the page does not pin the effect at a lower resolution forever.
  const stepDown = (permanent: boolean): boolean => {
    if (tier < lastTier) {
      tier += 1;
      if (permanent) ceiling = tier;
      return true;
    }
    if (targetFps > MIN_TARGET_FPS) {
      targetFps = MIN_TARGET_FPS;
      return true;
    }
    return false;
  };

  const stepUp = (): boolean => {
    if (tier <= ceiling || targetFps < MAX_TARGET_FPS) return false;
    tier -= 1;
    return true;
  };

  const freeze = (): boolean => {
    if (frozen) return false;
    frozen = true;
    return true;
  };

  const collapse = (): boolean => {
    const changed = tier !== lastTier || targetFps !== MIN_TARGET_FPS;
    tier = lastTier;
    ceiling = lastTier;
    targetFps = MIN_TARGET_FPS;
    resetWindow();
    return changed;
  };

  const sample = (intervalMs: number): boolean => {
    if (frozen || !Number.isFinite(intervalMs) || intervalMs <= 0) return false;

    // A frame this long means the tab is already unresponsive. Collapse on the
    // first one and stop animating if it happens again.
    if (intervalMs >= opts.hangMs) {
      hangs += 1;
      return hangs > 1 ? freeze() : collapse();
    }

    if (intervalMs >= opts.stallMs) {
      const changed = stepDown(false);
      resetWindow();
      return changed;
    }

    if (settle > 0) {
      settle -= 1;
      return false;
    }

    total += intervalMs;
    samples += 1;
    if (samples < opts.window) return false;

    const mean = total / samples;
    const target = 1000 / targetFps;
    resetWindow();

    if (mean > target * opts.slowFactor) return stepDown(true);
    if (mean < target * opts.fastFactor) return stepUp();
    return false;
  };

  return { collapse, freeze, sample, state };
};

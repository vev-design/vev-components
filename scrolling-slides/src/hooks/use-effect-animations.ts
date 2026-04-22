import { RefObject } from 'react';
import { useViewAnimation } from './use-view-animation';

type TransitionPhase = {
  type: string;
  settings: Record<string, any>;
  speed: string;
};

type SlideTransitionModel = {
  transitionIn: TransitionPhase | null;
  transitionOut: TransitionPhase | null;
  ownsIn: boolean;
  ownsOut: boolean;
};

/**
 * Applies effect-layer animations (opacity, scale, filter) on a slide element.
 * These run as separate WAAPI animations alongside the primary transition animation,
 * targeting non-overlapping CSS properties.
 */
export function useEffectAnimations(
  ref: RefObject<HTMLElement>,
  index: number,
  slideCount: number,
  timeline: ViewTimeline | undefined,
  disabled: boolean,
  transition: SlideTransitionModel,
) {
  const transitionCount = slideCount - 1;
  const settings = transition.transitionIn?.settings ?? transition.transitionOut?.settings ?? {};
  const { ownsIn, ownsOut } = transition;
  const inSpeed = transition.transitionIn?.speed || 'linear';
  const outSpeed = transition.transitionOut?.speed || 'linear';

  const hasFade = !!settings.fadeIn || !!settings.fadeOut || !!settings.fadeDirection;
  const hasZoom = !!settings.scale;
  const hasBlur = !!settings.blur;

  // Compute standard offsets (same logic as AnimatedSlide)
  const inFrom = (index - 1) / transitionCount;
  const inTo = index / transitionCount;
  const outFrom = index / transitionCount;
  const outTo = (index + 1) / transitionCount;

  // --- Fade (opacity) ---
  const fadeKeyframes: Keyframe[] = [];
  let fadeFrom = inFrom;
  let fadeTo = inTo;
  let fadeDisabled = disabled || !hasFade;

  if (hasFade && !fadeDisabled) {
    const isFadeOut = !!settings.fadeDirection;
    const isFadeInOut = !!settings.fadeOut && (!!settings.fadeIn || isFadeOut);

    if (isFadeInOut) {
      // Both in and out: opacity 0 → 1 → 0
      if (index === 0) {
        // First slide: only fades out
        fadeKeyframes.push({ opacity: '1', easing: outSpeed });
        fadeKeyframes.push({ opacity: '0' });
        fadeFrom = outFrom;
        fadeTo = outTo;
        fadeDisabled = !ownsOut;
      } else if (index === transitionCount) {
        // Last slide: only fades in
        fadeKeyframes.push({ opacity: '0', easing: inSpeed });
        fadeKeyframes.push({ opacity: '1' });
        fadeDisabled = !ownsIn;
      } else if (ownsIn && ownsOut) {
        fadeKeyframes.push({ opacity: '0', easing: inSpeed });
        fadeKeyframes.push({ opacity: '1', easing: outSpeed });
        fadeKeyframes.push({ opacity: '0' });
        fadeFrom = inFrom;
        fadeTo = outTo;
      } else if (ownsIn) {
        fadeKeyframes.push({ opacity: '0', easing: inSpeed });
        fadeKeyframes.push({ opacity: '1' });
      } else if (ownsOut) {
        fadeKeyframes.push({ opacity: '1', easing: outSpeed });
        fadeKeyframes.push({ opacity: '0' });
        fadeFrom = outFrom;
        fadeTo = outTo;
      } else {
        fadeDisabled = true;
      }
    } else if (isFadeOut) {
      // Fade out only (reverse: outgoing slide fades out)
      if (index === slideCount - 1) {
        fadeDisabled = true;
      } else if (ownsOut) {
        fadeKeyframes.push({ opacity: '1', easing: outSpeed });
        fadeKeyframes.push({ opacity: '0' });
        fadeFrom = outFrom;
        fadeTo = outTo;
      } else {
        fadeDisabled = true;
      }
    } else {
      // Fade in only
      if (index === 0) {
        fadeDisabled = true;
      } else if (ownsIn) {
        fadeKeyframes.push({ opacity: '0', easing: inSpeed });
        fadeKeyframes.push({ opacity: '1' });
      } else {
        fadeDisabled = true;
      }
    }
  }

  if (fadeKeyframes.length === 1) fadeKeyframes.push(fadeKeyframes[0]);

  useViewAnimation(
    ref,
    fadeKeyframes.length > 0 ? fadeKeyframes : [{ opacity: '1' }, { opacity: '1' }],
    timeline,
    fadeDisabled || fadeKeyframes.length === 0,
    undefined,
    fadeFrom,
    fadeTo,
  );

  // --- Zoom (scale) ---
  const zoom = settings.scale || 0;
  const zoomIn = 1 + zoom;
  const zoomOut = 1 / zoomIn;
  const zoomKeyframes: Keyframe[] = [];
  let zoomFrom = inFrom;
  let zoomTo = inTo;
  let zoomDisabled = disabled || !hasZoom;

  if (hasZoom && !zoomDisabled) {
    const isFadeOut = !!settings.fadeDirection;

    if (isFadeOut) {
      // Zoom out direction (outgoing gets smaller)
      if (index === slideCount - 1) {
        zoomDisabled = true;
      } else if (ownsOut) {
        zoomKeyframes.push({ scale: '1', easing: outSpeed });
        zoomKeyframes.push({ scale: `${zoomOut}` });
        zoomFrom = outFrom;
        zoomTo = outTo;
      } else {
        zoomDisabled = true;
      }
    } else {
      // Zoom in direction (incoming starts zoomed)
      if (index === 0) {
        zoomDisabled = true;
      } else if (ownsIn) {
        zoomKeyframes.push({ scale: `${zoomIn}`, easing: inSpeed });
        zoomKeyframes.push({ scale: '1' });
      } else {
        zoomDisabled = true;
      }
    }
  }

  if (zoomKeyframes.length === 1) zoomKeyframes.push(zoomKeyframes[0]);

  useViewAnimation(
    ref,
    zoomKeyframes.length > 0 ? zoomKeyframes : [{ scale: '1' }, { scale: '1' }],
    timeline,
    zoomDisabled || zoomKeyframes.length === 0,
    undefined,
    zoomFrom,
    zoomTo,
  );

  // --- Filter (blur) ---
  const blur = settings.blur || 0;
  const filterKeyframes: Keyframe[] = [];
  let filterFrom = inFrom;
  let filterTo = inTo;
  let filterDisabled = disabled || !hasBlur;

  if (hasBlur && !filterDisabled) {
    if (index === 0) {
      // First slide: only blurs out
      if (ownsOut) {
        filterKeyframes.push({ filter: 'blur(0px)', easing: outSpeed });
        filterKeyframes.push({ filter: `blur(${blur}px)` });
        filterFrom = outFrom;
        filterTo = outTo;
      } else {
        filterDisabled = true;
      }
    } else if (index === transitionCount) {
      // Last slide: only blurs in
      if (ownsIn) {
        filterKeyframes.push({ filter: `blur(${blur}px)`, easing: inSpeed });
        filterKeyframes.push({ filter: 'blur(0px)' });
      } else {
        filterDisabled = true;
      }
    } else if (ownsIn && ownsOut) {
      filterKeyframes.push({ filter: `blur(${blur}px)`, easing: inSpeed });
      filterKeyframes.push({ filter: 'blur(0px)', easing: outSpeed });
      filterKeyframes.push({ filter: `blur(${blur}px)` });
      filterFrom = inFrom;
      filterTo = outTo;
    } else if (ownsIn) {
      filterKeyframes.push({ filter: `blur(${blur}px)`, easing: inSpeed });
      filterKeyframes.push({ filter: 'blur(0px)' });
    } else if (ownsOut) {
      filterKeyframes.push({ filter: 'blur(0px)', easing: outSpeed });
      filterKeyframes.push({ filter: `blur(${blur}px)` });
      filterFrom = outFrom;
      filterTo = outTo;
    } else {
      filterDisabled = true;
    }
  }

  if (filterKeyframes.length === 1) filterKeyframes.push(filterKeyframes[0]);

  useViewAnimation(
    ref,
    filterKeyframes.length > 0 ? filterKeyframes : [{ filter: 'none' }, { filter: 'none' }],
    timeline,
    filterDisabled || filterKeyframes.length === 0,
    undefined,
    filterFrom,
    filterTo,
  );

  // Return initial styles for effects (applied before animation starts)
  const initialStyle: React.CSSProperties = {};
  if (hasFade && !fadeDisabled && index !== 0 && !settings.fadeDirection) {
    initialStyle.opacity = 0;
  }
  if (hasZoom && !zoomDisabled && index !== 0 && !settings.fadeDirection) {
    (initialStyle as any).scale = `${zoomIn}`;
  }
  if (hasBlur && !filterDisabled && index !== 0) {
    initialStyle.filter = `blur(${blur}px)`;
  }

  return initialStyle;
}

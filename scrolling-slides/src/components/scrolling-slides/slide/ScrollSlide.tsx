import React, { useRef } from 'react';
import { useViewAnimation } from '../../../hooks';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

export function ScrollSlide({
  id,
  selected,
  index,
  slideCount,
  timeline,
  disabled,
  style,
  transition,
}: BaseSlideProps) {
  const ref = useRef<HTMLDivElement>(null);
  const transitionCount = slideCount - 1;

  const phaseSettings = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const inSpeed = transition.transitionIn?.speed || 'linear';
  const outSpeed = transition.transitionOut?.speed || 'linear';

  const isReverse = !!phaseSettings?.reverse;
  const zoomAmount = typeof phaseSettings?.zoomScroll === 'number' ? phaseSettings.zoomScroll : 0;
  const blurPx = typeof phaseSettings?.blurScroll === 'number' ? phaseSettings.blurScroll : 0;
  const direction = isReverse ? -1 : 1;

  // Container-translate model: every slide runs across the full scroll range in
  // perfect lockstep, as if a strip containing all slides were translating as a
  // single unit. At timeline offset t, the virtual container is at
  // translateX(-t*(N-1)*100%), so slide i sits at (i - t*(N-1))*100%.
  //
  // Keyframes are placed at each gap boundary k (offset = k/(N-1)). The easing
  // between gaps is driven by the adjacent-gap speed we know about (inSpeed for
  // gap index-1, outSpeed for gap index). Remote gaps fall back to linear, which
  // is visually irrelevant because this slide is off-screen during those gaps.
  const scaleStr = zoomAmount > 0 ? ` scale(${1 / (1 + zoomAmount)})` : '';
  const blurOn = blurPx > 0 ? `blur(${blurPx}px)` : undefined;
  const blurOff = blurPx > 0 ? 'blur(0px)' : undefined;

  const buildKeyframe = (k: number): Keyframe => {
    const offset = transitionCount === 0 ? 0 : k / transitionCount;
    const translate = (index - k) * 100 * direction;
    const centered = k === index;
    const kf: Keyframe = {
      transform: `translateX(${translate}%)${!centered ? scaleStr : ''}`,
      offset,
    };
    if (blurPx > 0) kf.filter = centered ? blurOff : blurOn;
    return kf;
  };

  const keyframes: Keyframe[] = [];
  if (transitionCount === 0) {
    const kf = buildKeyframe(0);
    keyframes.push(kf, { ...kf });
  } else {
    for (let k = 0; k <= transitionCount; k++) {
      const kf = buildKeyframe(k);
      if (k < transitionCount) {
        // Easing applies from this keyframe to the next. Use our own speeds at
        // the gaps we "own" (adjacent to this slide); linear elsewhere.
        kf.easing = k === index - 1 ? inSpeed : k === index ? outSpeed : 'linear';
      }
      keyframes.push(kf);
    }
  }

  useViewAnimation(ref, keyframes, timeline, selected || disabled, undefined, 0, 1);

  // Initial inline style: position slide at its starting offset in the strip.
  const initialStyle: React.CSSProperties =
    !disabled && transitionCount > 0
      ? {
          transform: `translateX(${index * 100 * direction}%)${index !== 0 ? scaleStr : ''}`,
          ...(blurPx > 0 && index !== 0 ? { filter: `blur(${blurPx}px)` } : {}),
        }
      : {};

  return (
    <BaseSlide
      ref={ref}
      id={id}
      selected={selected}
      index={index}
      slideCount={slideCount}
      timeline={timeline}
      disabled={disabled}
      transition={transition}
      style={{ ...style, ...initialStyle }}
    />
  );
}

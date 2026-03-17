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
  const { ownsIn, ownsOut } = transition;

  const phaseSettings = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const inSpeed = transition.transitionIn?.speed || 'linear';
  const outSpeed = transition.transitionOut?.speed || 'linear';

  const isReverse = !!phaseSettings?.reverse;
  const zoomAmount = typeof phaseSettings?.zoomScroll === 'number' ? phaseSettings.zoomScroll : 0;
  const blurPx = typeof phaseSettings?.blurScroll === 'number' ? phaseSettings.blurScroll : 0;
  const enterFrom = isReverse ? '-100%' : '100%';
  const exitTo = isReverse ? '100%' : '-100%';

  const hasIn = ownsIn && index > 0;
  const hasOut = ownsOut && index < transitionCount;

  // Helpers
  const sc = zoomAmount > 0 ? `scale(${1 / (1 + zoomAmount)})` : '';
  const tfm = (translate: string, scaled: boolean) =>
    `translateX(${translate})${scaled && sc ? ` ${sc}` : ''}`;
  const blurOn = blurPx > 0 ? { filter: `blur(${blurPx}px)` } : {};
  const blurOff = blurPx > 0 ? { filter: 'blur(0px)' } : {};

  const keyframes: Keyframe[] = [];

  if (zoomAmount > 0) {
    // Zoom scroll: zoom happens in the 20% edges of each phase.
    // Both in and out slides translate over the same middle 60% so they stay in sync.
    //
    // hasOut only:  [zoom-out 20%] [translate 60% w/ easing] [hold 20%]
    // hasIn only:   [wait 20%]     [translate 60% w/ easing] [zoom-in 20%]
    // hasIn+hasOut:  per half — same pattern scaled to 0-0.5 and 0.5-1
    if (hasIn && hasOut) {
      // In-half (offsets 0–0.5): wait, translate in, zoom in
      keyframes.push({ transform: tfm(enterFrom, true), ...blurOn, offset: 0 });
      keyframes.push({ transform: tfm(enterFrom, true), ...blurOn, offset: 0.1, easing: inSpeed });
      keyframes.push({ transform: tfm('0%', true), ...blurOn, offset: 0.4 });
      keyframes.push({ transform: tfm('0%', false), ...blurOff, offset: 0.5 });
      // Out-half (offsets 0.5–1): zoom out, translate out, hold
      keyframes.push({ transform: tfm('0%', true), ...blurOn, offset: 0.6, easing: outSpeed });
      keyframes.push({ transform: tfm(exitTo, true), ...blurOn, offset: 0.9 });
      keyframes.push({ transform: tfm(exitTo, true), ...blurOn, offset: 1 });
    } else if (hasIn) {
      // Wait while adjacent slide zooms out, then translate in, then zoom in
      keyframes.push({ transform: tfm(enterFrom, true), ...blurOn, offset: 0 });
      keyframes.push({ transform: tfm(enterFrom, true), ...blurOn, offset: 0.2, easing: inSpeed });
      keyframes.push({ transform: tfm('0%', true), ...blurOn, offset: 0.8 });
      keyframes.push({ transform: tfm('0%', false), ...blurOff, offset: 1 });
    } else if (hasOut) {
      // Zoom out, then translate out, then hold while adjacent slide zooms in
      keyframes.push({ transform: tfm('0%', false), ...blurOff, offset: 0 });
      keyframes.push({ transform: tfm('0%', true), ...blurOn, offset: 0.2, easing: outSpeed });
      keyframes.push({ transform: tfm(exitTo, true), ...blurOn, offset: 0.8 });
      keyframes.push({ transform: tfm(exitTo, true), ...blurOn, offset: 1 });
    } else {
      keyframes.push({ transform: tfm('0%', false) });
      keyframes.push({ transform: tfm('0%', false) });
    }
  } else {
    // Simple scroll (with optional blur across full range)
    if (hasIn) {
      keyframes.push({ transform: tfm(enterFrom, false), ...blurOn, easing: inSpeed });
    }
    keyframes.push({
      transform: tfm('0%', false),
      ...blurOff,
      ...(hasOut ? { easing: outSpeed } : {}),
    });
    if (hasOut) {
      keyframes.push({ transform: tfm(exitTo, false), ...blurOn });
    }
    if (keyframes.length === 1) keyframes.push(keyframes[0]);
  }

  // Compute offset range from owned phases
  let fromOffset = hasIn ? (index - 1) / transitionCount : index / transitionCount;
  let toOffset = hasOut ? (index + 1) / transitionCount : index / transitionCount;
  if (index === 0) fromOffset = 0;
  if (index === transitionCount) toOffset = 1;
  if (fromOffset === toOffset) toOffset = fromOffset;

  useViewAnimation(ref, keyframes, timeline, selected || disabled, undefined, fromOffset, toOffset);

  // Initial style before animation kicks in
  const initialStyle: React.CSSProperties =
    !disabled && hasIn
      ? {
          transform: tfm(enterFrom, zoomAmount > 0),
          ...(blurPx > 0 ? { filter: `blur(${blurPx}px)` } : {}),
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

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

  // Helper to build transform + filter strings
  const sc = zoomAmount > 0 ? `scale(${1 / (1 + zoomAmount)})` : '';
  const tfm = (translate: string, scaled: boolean) =>
    `translateX(${translate})${scaled && sc ? ` ${sc}` : ''}`;
  const blur = (on: boolean) => (blurPx > 0 ? `blur(${on ? blurPx : 0}px)` : undefined);

  const keyframes: Keyframe[] = [];

  if (zoomAmount > 0) {
    // Zoom effect: scale happens in the 20% edges, full size in the middle
    if (hasIn && hasOut) {
      keyframes.push({ transform: tfm(enterFrom, true), filter: blur(true), offset: 0, easing: inSpeed });
      keyframes.push({ transform: tfm('0%', true), filter: blur(true), offset: 0.4 });
      keyframes.push({ transform: tfm('0%', false), filter: blur(false), offset: 0.5, easing: outSpeed });
      keyframes.push({ transform: tfm('0%', true), filter: blur(true), offset: 0.6 });
      keyframes.push({ transform: tfm(exitTo, true), filter: blur(true), offset: 1 });
    } else if (hasIn) {
      keyframes.push({ transform: tfm(enterFrom, true), filter: blur(true), offset: 0, easing: inSpeed });
      keyframes.push({ transform: tfm('0%', true), filter: blur(true), offset: 0.8 });
      keyframes.push({ transform: tfm('0%', false), filter: blur(false), offset: 1 });
    } else if (hasOut) {
      keyframes.push({ transform: tfm('0%', false), filter: blur(false), offset: 0, easing: outSpeed });
      keyframes.push({ transform: tfm('0%', true), filter: blur(true), offset: 0.2 });
      keyframes.push({ transform: tfm(exitTo, true), filter: blur(true), offset: 1 });
    } else {
      keyframes.push({ transform: tfm('0%', false) });
      keyframes.push({ transform: tfm('0%', false) });
    }
  } else {
    // Simple scroll (with optional blur across full range)
    if (hasIn) {
      keyframes.push({ transform: tfm(enterFrom, false), filter: blur(true), easing: inSpeed });
    }
    keyframes.push({
      transform: tfm('0%', false),
      filter: blur(false),
      ...(hasOut ? { easing: outSpeed } : {}),
    });
    if (hasOut) {
      keyframes.push({ transform: tfm(exitTo, false), filter: blur(true) });
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

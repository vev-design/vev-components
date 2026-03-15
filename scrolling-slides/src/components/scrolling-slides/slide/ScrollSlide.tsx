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
  const zoomScroll = !!phaseSettings?.zoomScroll;
  const blurScroll = !!phaseSettings?.blurScroll;
  const enterFrom = isReverse ? '-100%' : '100%';
  const exitTo = isReverse ? '100%' : '-100%';
  const sc = 'scale(0.85)';
  const blurAmount = 'blur(20px)';
  const blurNone = 'blur(0px)';

  // Build keyframes from owned phases
  // Easing is applied per-keyframe segment so adjacent slides stay in sync
  const keyframes: Keyframe[] = [];
  if (zoomScroll) {
    // Zoom happens in 20% at each edge, scroll takes the remaining 80%
    const hasIn = ownsIn && index > 0;
    const hasOut = ownsOut && index < transitionCount;

    if (hasIn && hasOut) {
      keyframes.push({ transform: `translateX(${enterFrom}) ${sc}`, offset: 0, easing: inSpeed });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.4 });
      keyframes.push({ transform: 'translateX(0%) scale(1)', offset: 0.5, easing: outSpeed });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.6 });
      keyframes.push({ transform: `translateX(${exitTo}) ${sc}`, offset: 1 });
    } else if (hasIn) {
      keyframes.push({ transform: `translateX(${enterFrom}) ${sc}`, offset: 0, easing: inSpeed });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.8 });
      keyframes.push({ transform: 'translateX(0%) scale(1)', offset: 1 });
    } else if (hasOut) {
      keyframes.push({ transform: 'translateX(0%) scale(1)', offset: 0, easing: outSpeed });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.2 });
      keyframes.push({ transform: `translateX(${exitTo}) ${sc}`, offset: 1 });
    } else {
      keyframes.push({ transform: 'translateX(0%)' });
      keyframes.push({ transform: 'translateX(0%)' });
    }
  } else if (blurScroll) {
    // Blur transitions smoothly across the full scroll
    if (ownsIn && index > 0) {
      keyframes.push({ transform: `translateX(${enterFrom})`, filter: blurAmount, easing: inSpeed });
    }
    keyframes.push({
      transform: 'translateX(0%)',
      filter: blurNone,
      ...(ownsOut && index < transitionCount ? { easing: outSpeed } : {}),
    });
    if (ownsOut && index < transitionCount) {
      keyframes.push({ transform: `translateX(${exitTo})`, filter: blurAmount });
    }
    if (keyframes.length === 1) keyframes.push(keyframes[0]);
  } else {
    if (ownsIn && index > 0) {
      keyframes.push({ transform: `translateX(${enterFrom})`, easing: inSpeed });
    }
    keyframes.push({ transform: 'translateX(0%)', ...(ownsOut && index < transitionCount ? { easing: outSpeed } : {}) });
    if (ownsOut && index < transitionCount) {
      keyframes.push({ transform: `translateX(${exitTo})` });
    }
    if (keyframes.length === 1) keyframes.push(keyframes[0]);
  }

  // Compute offset range from owned phases
  let fromOffset = ownsIn && index > 0 ? (index - 1) / transitionCount : index / transitionCount;
  let toOffset = ownsOut && index < transitionCount ? (index + 1) / transitionCount : index / transitionCount;
  if (index === 0) fromOffset = 0;
  if (index === transitionCount) toOffset = 1;
  if (fromOffset === toOffset) toOffset = fromOffset;

  useViewAnimation(
    ref,
    keyframes,
    timeline,
    selected || disabled,
    undefined,
    fromOffset,
    toOffset,
  );

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
      style={{
        ...style,
        ...(!disabled && ownsIn && index > 0
          ? {
              transform: zoomScroll ? `translateX(${enterFrom}) ${sc}` : `translateX(${enterFrom})`,
              ...(blurScroll ? { filter: blurAmount } : {}),
            }
          : {}),
      }}
    />
  );
}

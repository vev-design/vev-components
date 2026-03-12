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
  const speed = (ownsIn ? transition.transitionIn?.speed : transition.transitionOut?.speed) ?? 'linear';

  const isReverse = !!phaseSettings?.reverse;
  const zoomScroll = !!phaseSettings?.zoomScroll;
  const enterFrom = isReverse ? '-100%' : '100%';
  const exitTo = isReverse ? '100%' : '-100%';
  const sc = 'scale(0.85)';

  // Build keyframes from owned phases
  const keyframes: Keyframe[] = [];
  if (zoomScroll) {
    // Zoom happens in 20% at each edge, scroll takes the remaining 80%
    const hasIn = ownsIn && index > 0;
    const hasOut = ownsOut && index < transitionCount;

    if (hasIn && hasOut) {
      keyframes.push({ transform: `translateX(${enterFrom}) ${sc}`, offset: 0 });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.4 });
      keyframes.push({ transform: 'translateX(0%) scale(1)', offset: 0.5 });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.6 });
      keyframes.push({ transform: `translateX(${exitTo}) ${sc}`, offset: 1 });
    } else if (hasIn) {
      keyframes.push({ transform: `translateX(${enterFrom}) ${sc}`, offset: 0 });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.8 });
      keyframes.push({ transform: 'translateX(0%) scale(1)', offset: 1 });
    } else if (hasOut) {
      keyframes.push({ transform: 'translateX(0%) scale(1)', offset: 0 });
      keyframes.push({ transform: `translateX(0%) ${sc}`, offset: 0.2 });
      keyframes.push({ transform: `translateX(${exitTo}) ${sc}`, offset: 1 });
    } else {
      keyframes.push({ transform: 'translateX(0%)' });
      keyframes.push({ transform: 'translateX(0%)' });
    }
  } else {
    if (ownsIn && index > 0) {
      keyframes.push({ transform: `translateX(${enterFrom})` });
    }
    keyframes.push({ transform: 'translateX(0%)' });
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
    { easing: speed },
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
          ? { transform: zoomScroll ? `translateX(${enterFrom}) ${sc}` : `translateX(${enterFrom})` }
          : {}),
      }}
    />
  );
}

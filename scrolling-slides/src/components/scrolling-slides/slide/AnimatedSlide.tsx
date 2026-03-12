import React, { useRef } from 'react';
import { useViewAnimation } from '../../../hooks';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

type AnimatedSlideProps = BaseSlideProps & {
  keyframes: Keyframe[];
  keyframesOut?: Keyframe[];
};

export function AnimatedSlide({
  id,
  selected,
  index,
  slideCount,
  timeline,
  disabled,
  keyframes,
  keyframesOut,
  style,
  transition,
}: AnimatedSlideProps) {
  const ref = useRef<HTMLDivElement>(null);
  const transitionCount = slideCount - 1;
  const { ownsIn, ownsOut } = transition;

  const phaseSettings = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const speed = (ownsIn ? transition.transitionIn?.speed : transition.transitionOut?.speed)
    ?? phaseSettings?.speed ?? phaseSettings?.easing ?? 'linear';

  let fromOffset = (index - 1) / transitionCount;
  let toOffset = index / transitionCount;
  const offsetRange = toOffset - fromOffset;
  let disableAnimation = index === 0;

  if (keyframesOut) {
    // Two-phase animation (in + out on same element)
    if (index === 0) {
      disableAnimation = !ownsOut;
      if (ownsOut) keyframes = keyframesOut;
      fromOffset = 0;
      toOffset = 1 / transitionCount;
    } else if (index === transitionCount) {
      disableAnimation = !ownsIn;
      fromOffset = (index - 1) / transitionCount;
      toOffset = 1;
    } else if (ownsIn && ownsOut) {
      disableAnimation = false;
      keyframes = [...keyframes, ...keyframesOut];
      fromOffset = (index - 1) / transitionCount;
      toOffset = (index + 1) / transitionCount;
    } else if (ownsOut) {
      disableAnimation = false;
      keyframes = keyframesOut;
      fromOffset = index / transitionCount;
      toOffset = (index + 1) / transitionCount;
    } else if (ownsIn) {
      disableAnimation = false;
      fromOffset = (index - 1) / transitionCount;
      toOffset = index / transitionCount;
    } else {
      disableAnimation = true;
    }
  } else {
    // Single-phase animation (in only)
    if (phaseSettings?.reverse) {
      disableAnimation = index === slideCount - 1;
      keyframes = keyframes.slice().reverse();
      fromOffset = index / transitionCount;
      toOffset = (index + 1) / transitionCount;
    }

    if (!ownsIn && index !== 0) {
      disableAnimation = true;
    }
  }

  if (phaseSettings?.offsetStart) {
    const offsetSize = offsetRange * phaseSettings.offsetStart;
    fromOffset = Math.max(0, Math.min(1, fromOffset - offsetSize));
  }

  useViewAnimation(
    ref,
    keyframes,
    timeline,
    selected || disableAnimation,
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
        ...(!disabled && index !== 0 && ownsIn ? (keyframes[0] as any) : {}),
      }}
    />
  );
}

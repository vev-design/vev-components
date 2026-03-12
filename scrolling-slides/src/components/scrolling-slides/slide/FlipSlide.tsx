import React, { useRef } from 'react';
import { useViewAnimation } from '../../../hooks';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

export function FlipSlide({
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

  const isVertical = phaseSettings?.flipDirection === 'vertical';
  const axis = isVertical ? 'rotateX' : 'rotateY';
  const inAngle = isVertical ? '180deg' : '-180deg';
  const outAngle = isVertical ? '-180deg' : '180deg';

  // Build keyframes from owned phases
  const keyframes: Keyframe[] = [];
  if (ownsIn && index > 0) {
    keyframes.push({ transform: `perspective(1200px) ${axis}(${inAngle})` });
  }
  keyframes.push({ transform: `perspective(1200px) ${axis}(0deg)` });
  if (ownsOut && index < transitionCount) {
    keyframes.push({ transform: `perspective(1200px) ${axis}(${outAngle})` });
  }
  if (keyframes.length === 1) keyframes.push(keyframes[0]);

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
        backfaceVisibility: 'hidden',
        ...(!disabled && ownsIn && index > 0
          ? { transform: `perspective(1200px) ${axis}(${inAngle})` }
          : {}),
      }}
    />
  );
}

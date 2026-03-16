import React, { useRef } from 'react';
import { useViewAnimation } from '../../../hooks';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

export function CubeSlide({
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

  const isVertical = phaseSettings?.cubeDirection === 'vertical';
  const half = isVertical ? '50cqb' : '50cqi';
  const axis = isVertical ? 'rotateX' : 'rotateY';
  const inAngle = isVertical ? '-90deg' : '90deg';
  const outAngle = isVertical ? '90deg' : '-90deg';

  const cubeTransform = (angle: string) =>
    `translateZ(-${half}) ${axis}(${angle}) translateZ(${half})`;

  // Build keyframes with per-segment easing so adjacent slides stay in sync
  const keyframes: Keyframe[] = [];
  if (ownsIn && index > 0) {
    keyframes.push({ transform: cubeTransform(inAngle), easing: inSpeed });
  }
  keyframes.push({
    transform: cubeTransform('0deg'),
    ...(ownsOut && index < transitionCount ? { easing: outSpeed } : {}),
  });
  if (ownsOut && index < transitionCount) {
    keyframes.push({ transform: cubeTransform(outAngle) });
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
        backfaceVisibility: 'hidden',
        ...(!disabled && ownsIn && index > 0
          ? { transform: cubeTransform(inAngle) }
          : {}),
      }}
    />
  );
}

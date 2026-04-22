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

  const inSettings = transition.transitionIn?.settings;
  const outSettings = transition.transitionOut?.settings;
  const inSpeed = transition.transitionIn?.speed || 'linear';
  const outSpeed = transition.transitionOut?.speed || 'linear';

  // Resolve direction per-phase so overrides only affect their own gap
  const isVerticalIn = inSettings?.flipDirection === 'vertical';
  const isVerticalOut = outSettings?.flipDirection === 'vertical';

  // Use both axes in all keyframes for consistent interpolation
  const flipTransform = (x: string, y: string) =>
    `perspective(1200px) rotateX(${x}) rotateY(${y})`;

  const inX = isVerticalIn ? '180deg' : '0deg';
  const inY = isVerticalIn ? '0deg' : '-180deg';
  const outX = isVerticalOut ? '-180deg' : '0deg';
  const outY = isVerticalOut ? '0deg' : '180deg';

  // Build keyframes with per-segment easing so adjacent slides stay in sync
  const keyframes: Keyframe[] = [];
  if (ownsIn && index > 0) {
    keyframes.push({ transform: flipTransform(inX, inY), easing: inSpeed });
  }
  keyframes.push({
    transform: flipTransform('0deg', '0deg'),
    ...(ownsOut && index < transitionCount ? { easing: outSpeed } : {}),
  });
  if (ownsOut && index < transitionCount) {
    keyframes.push({ transform: flipTransform(outX, outY) });
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
          ? { transform: flipTransform(inX, inY) }
          : {}),
      }}
    />
  );
}

import React, { useRef } from 'react';
import { useViewAnimation } from '../../../hooks';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

// iTunes Cover Flow style: active slide faces forward, adjacent slides are
// rotated ~60° and offset to the side like tilted album covers.

const ANGLE = 60;
const OFFSET = 72; // percentage translateX offset for the angled position (~55 * 1.3)
const DEPTH = 250; // px pushed back in Z for angled slides
const SCALE = 0.7; // scale down so slides don't fill the full width

const inTransform = `translateX(${OFFSET}%) translateZ(-${DEPTH}px) rotateY(-${ANGLE}deg) scale(${SCALE})`;
const centerTransform = `translateX(0%) translateZ(0px) rotateY(0deg) scale(${SCALE})`;
const outTransform = `translateX(-${OFFSET}%) translateZ(-${DEPTH}px) rotateY(${ANGLE}deg) scale(${SCALE})`;

export function CoverFlowSlide({
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

  const speed = (ownsIn ? transition.transitionIn?.speed : transition.transitionOut?.speed) ?? 'linear';

  // Build keyframes from owned phases
  const keyframes: Keyframe[] = [];
  if (ownsIn && index > 0) {
    keyframes.push({ transform: inTransform });
  }
  keyframes.push({ transform: centerTransform });
  if (ownsOut && index < transitionCount) {
    keyframes.push({ transform: outTransform });
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
        ...(!disabled && ownsIn && index > 0
          ? { transform: inTransform }
          : {}),
      }}
    />
  );
}

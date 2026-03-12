import React, { useRef } from 'react';
import { useViewAnimation } from '../../../hooks';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

const NONE_KEYFRAMES = [{ opacity: '0' }, { opacity: '1' }];

export function NoneSlide({
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
  const disableAnimation = index === 0 || !transition.ownsIn;
  const fromOffset = (index - 1) / transitionCount;
  const toOffset = index / transitionCount;

  useViewAnimation(
    ref,
    NONE_KEYFRAMES,
    timeline,
    selected || disableAnimation,
    { easing: 'steps(1, end)' },
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
        ...(!disabled && index !== 0 && transition.ownsIn ? { opacity: 0 } : {}),
      }}
    />
  );
}

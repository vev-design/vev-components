import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const KEYFRAMES: Record<string, Keyframe[]> = {
  up: [{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }],
  down: [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0%)' }],
  left: [{ transform: 'translateX(100%)' }, { transform: 'translateX(0%)' }],
  right: [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0%)' }],
};

export function StackSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  // Backwards compat: 'horizontal' maps to 'left', 'vertical' or default maps to 'up'
  let dir = s?.stackDirection || 'up';
  if (dir === 'horizontal') dir = 'left';
  if (dir === 'vertical') dir = 'up';
  return (
    <AnimatedSlide
      {...rest}
      transition={transition}
      keyframes={KEYFRAMES[dir] || KEYFRAMES.up}
    />
  );
}

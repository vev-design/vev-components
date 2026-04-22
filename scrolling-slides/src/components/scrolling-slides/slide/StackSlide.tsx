import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const TRANSLATE: Record<string, [string, string]> = {
  up: ['translateY(100%)', 'translateY(0%)'],
  down: ['translateY(-100%)', 'translateY(0%)'],
  left: ['translateX(100%)', 'translateX(0%)'],
  right: ['translateX(-100%)', 'translateX(0%)'],
};

export function StackSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  // Backwards compat: 'horizontal' maps to 'left', 'vertical' or default maps to 'up'
  let dir = s?.stackDirection || 'up';
  if (dir === 'horizontal') dir = 'left';
  if (dir === 'vertical') dir = 'up';

  const blur = s?.blur || 0;
  const zoom = s?.scale || 0;
  const zoomIn = 1 + zoom;
  const [tFrom, tTo] = TRANSLATE[dir] || TRANSLATE.up;

  const keyframes: Keyframe[] = [
    {
      transform: `${tFrom}${zoom ? ` scale(${zoomIn})` : ''}`,
      ...(blur ? { filter: `blur(${blur}px)` } : {}),
    },
    {
      transform: tTo,
      ...(blur ? { filter: 'blur(0px)' } : {}),
    },
  ];

  return (
    <AnimatedSlide
      {...rest}
      transition={transition}
      keyframes={keyframes}
    />
  );
}

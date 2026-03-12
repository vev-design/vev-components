import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const MASK_KEYFRAMES = [
  {
    '--slide-offset': '0',
  },
  {
    '--slide-offset': '1',
  },
];

export function MaskSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const clipPath =
    s?.maskShape ||
    'circle(calc(var(--slide-offset) * 150%) at calc(var(--mask-x) * 100%) calc(var(--mask-y) * 100%))';
  return (
    <AnimatedSlide
      {...rest}
      style={
        {
          clipPath,
          '--mask-x': s?.maskX,
          '--mask-y': s?.maskY,
        } as any
      }
      transition={transition}
      keyframes={MASK_KEYFRAMES}
    />
  );
}

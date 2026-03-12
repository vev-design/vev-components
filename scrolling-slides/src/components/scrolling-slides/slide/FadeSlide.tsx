import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const keyframes = [
  { opacity: '0', scale: 'var(--slide-scale)' },
  { opacity: '1', scale: '1' },
];

export function FadeSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  return (
    <AnimatedSlide
      {...rest}
      transition={transition}
      style={{ '--slide-scale': 1 + (s?.scale || 0) } as any}
      keyframes={keyframes}
    />
  );
}

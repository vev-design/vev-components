import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

export function RevealSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const direction =
    s?.revealDirection ||
    'polygon(0 0, calc(var(--slide-offset) * 100%) 0, calc(var(--slide-offset) * 100%) 100%, 0% 100%)';
  const blur = s?.blur || 0;
  const zoom = s?.scale || 0;
  const zoomIn = 1 + zoom;

  const keyframes: Keyframe[] = [
    {
      '--slide-offset': '0',
      ...(blur ? { filter: `blur(${blur}px)` } : {}),
      ...(zoom ? { scale: `${zoomIn}` } : {}),
    },
    {
      '--slide-offset': '1',
      ...(blur ? { filter: 'blur(0px)' } : {}),
      ...(zoom ? { scale: '1' } : {}),
    },
  ];

  return (
    <AnimatedSlide
      {...rest}
      style={{ clipPath: direction } as any}
      transition={transition}
      keyframes={keyframes}
    />
  );
}

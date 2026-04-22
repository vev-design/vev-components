import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

export function MaskSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const clipPath =
    s?.maskShape ||
    'circle(calc(var(--slide-offset) * 150%) at calc(var(--mask-x) * 100%) calc(var(--mask-y) * 100%))';
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
      style={
        {
          clipPath,
          '--mask-x': s?.maskX,
          '--mask-y': s?.maskY,
        } as any
      }
      transition={transition}
      keyframes={keyframes}
    />
  );
}

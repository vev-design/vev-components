import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const ZOOM_IN_KEYFRAMES = [
  { transform: 'scale(0)', opacity: '0' },
  { transform: 'scale(1)', opacity: '1' },
];

const ZOOM_OUT_KEYFRAMES = [
  { transform: 'scale(3)', opacity: '0' },
  { transform: 'scale(1)', opacity: '1' },
];

const ZOOM_ROTATE_KEYFRAMES = [
  { transform: 'scale(0) rotate(180deg)', opacity: '0' },
  { transform: 'scale(1) rotate(0deg)', opacity: '1' },
];

export function ZoomSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const variant = s?.zoomVariant || 'in';
  const keyframes =
    variant === 'out'
      ? ZOOM_OUT_KEYFRAMES
      : variant === 'rotate'
        ? ZOOM_ROTATE_KEYFRAMES
        : ZOOM_IN_KEYFRAMES;
  return <AnimatedSlide {...rest} transition={transition} keyframes={keyframes} />;
}

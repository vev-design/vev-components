import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const SWING_LEFT_KEYFRAMES = [
  { transform: 'perspective(1200px) rotateY(90deg)' },
  { transform: 'perspective(1200px) rotateY(0deg)' },
];

const SWING_RIGHT_KEYFRAMES = [
  { transform: 'perspective(1200px) rotateY(-90deg)' },
  { transform: 'perspective(1200px) rotateY(0deg)' },
];

const SWING_TOP_KEYFRAMES = [
  { transform: 'perspective(1200px) rotateX(-90deg)' },
  { transform: 'perspective(1200px) rotateX(0deg)' },
];

const SWING_BOTTOM_KEYFRAMES = [
  { transform: 'perspective(1200px) rotateX(90deg)' },
  { transform: 'perspective(1200px) rotateX(0deg)' },
];

const ORIGIN_MAP: Record<string, string> = {
  left: 'left center',
  right: 'right center',
  top: 'center top',
  bottom: 'center bottom',
};

const KEYFRAME_MAP: Record<string, Keyframe[]> = {
  left: SWING_LEFT_KEYFRAMES,
  right: SWING_RIGHT_KEYFRAMES,
  top: SWING_TOP_KEYFRAMES,
  bottom: SWING_BOTTOM_KEYFRAMES,
};

export function SwingSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const direction = s?.swingDirection || 'left';
  return (
    <AnimatedSlide
      {...rest}
      transition={transition}
      style={{ transformOrigin: ORIGIN_MAP[direction] }}
      keyframes={KEYFRAME_MAP[direction] || SWING_LEFT_KEYFRAMES}
    />
  );
}

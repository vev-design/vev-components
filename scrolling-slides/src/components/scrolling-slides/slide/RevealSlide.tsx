import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const REVEAL_KEYFRAMES = [
  {
    '--slide-offset': '0',
  },
  {
    '--slide-offset': '1',
  },
];

export function RevealSlide({ settings, ...rest }: BaseSlideProps) {
  const direction =
    settings?.revealDirection ||
    'polygon(0 0, calc(var(--slide-offset) * 100%) 0, calc(var(--slide-offset) * 100%) 100%, 0% 100%)';
  return (
    <AnimatedSlide
      {...rest}
      style={{ clipPath: direction } as any}
      settings={settings}
      keyframes={REVEAL_KEYFRAMES}
    />
  );
}

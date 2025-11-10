import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const keyframes = [
  { opacity: '0', scale: 'var(--slide-scale)' },
  { opacity: '1', scale: '1' },
];

export function FadeSlide({ settings, section, ...rest }: BaseSlideProps) {
  return (
    <AnimatedSlide
      {...rest}
      settings={settings}
      section={section}
      style={{ '--slide-scale': 1 + (settings?.scale || 0) } as any}
      keyframes={keyframes}
    />
  );
}

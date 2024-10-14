import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

const VERTICAL_STACK_KEYFRAMES = [
  { transform: 'translateY(100%)' },
  { transform: 'translateY(0%)' },
];

const HORIZONTAL_STACK_KEYFRAMES = [
  { transform: 'translateX(100%)' },
  { transform: 'translateX(0%)' },
];

export function StackSlide({ settings, ...rest }: BaseSlideProps) {
  return (
    <AnimatedSlide
      {...rest}
      settings={settings}
      keyframes={
        settings?.stackDirection === 'horizontal'
          ? HORIZONTAL_STACK_KEYFRAMES
          : VERTICAL_STACK_KEYFRAMES
      }
    />
  );
}

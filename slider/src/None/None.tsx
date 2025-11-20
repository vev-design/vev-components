import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../types';

export const None = ({ slides, index }: Props) => {
  const slide = slides[index];
  if (!slide) return null;
  return <WidgetNode id={slide} />;
};

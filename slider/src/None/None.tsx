import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slider';

export const None = ({ slides, index, section }: Props) => {
  return <WidgetNode contentClassName={section ? '__sc' : null} id={slides[index]} />;
};

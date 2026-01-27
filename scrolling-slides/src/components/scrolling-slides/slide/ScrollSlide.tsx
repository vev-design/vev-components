import React from 'react';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

export function ScrollSlide(props: BaseSlideProps) {
  const slideCount = props.slideCount;
  const isReverse = props.settings?.reverse;
  const index = isReverse ? slideCount - 1 - props.index : props.index;
  return <BaseSlide {...props} style={{ ...props.style, translate: `${index * 100}% 0` }} />;
}

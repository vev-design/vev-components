import React from 'react';
import { Props } from '../Slideshow';
import Zoom from '../Zoom';

export const Fade = (props: Omit<Props, 'children'> & { index: number }) => {
  return <Zoom {...props} scaleFactor={100} />;
};

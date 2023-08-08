import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Slide.module.css';

export const Slide = ({
  vertical,
  index,
  speed,
  children,
  onNextSlide,
}: Props & { index: number; onNextSlide: () => void }) => {
  const direction = vertical ? 'Y' : 'X';

  return (
    <div
      className={styles.wrapper + ' __sc __c'}
      style={{
        transform: `translate${direction}(${-100 * index}%)`,
        transition: `transform ${speed || 200}ms linear`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'transform') {
          onNextSlide();
        }
      }}
    >
      {children?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={child}
            style={{
              transform: `translate${direction}(${100 * i}%)`,
            }}
          >
            <WidgetNode id={child} />
          </div>
        );
      })}
    </div>
  );
};

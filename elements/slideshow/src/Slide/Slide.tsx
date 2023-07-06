import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Slide.module.css';

export const Slide = ({ vertical, index, speed, children }: Props & { index: number }) => {
  const direction = vertical ? 'Y' : 'X';

  return (
    <div
      className={styles.wrapper + ' __sc __c'}
      style={{
        transform: `translate${direction}(${-100 * index}%)`,
        transition: `transform ${speed || 200}ms linear`,
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

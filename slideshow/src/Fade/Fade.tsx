import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Fade.module.css';

export const Fade = ({ index, speed, slides }: Omit<Props, 'children'> & { index: number }) => {
  return (
    <div className={styles.wrapper}>
      {slides?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={i + child}
            style={{
              transition: `opacity ${speed || 200}ms`,
              opacity: i === index ? '1' : '0',
            }}
          >
            {child && <WidgetNode id={child} section />}
          </div>
        );
      })}
    </div>
  );
};

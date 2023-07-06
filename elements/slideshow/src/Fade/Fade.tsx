import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Fade.module.css';

export const Fade = ({ index, speed, children }: Props & { index: number }) => {
  return (
    <div className={styles.wrapper + ' __sc __c'}>
      {children?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={child}
            style={{
              transition: `opacity ${speed || 200}ms`,
              opacity: i === index ? 1 : 0,
            }}
          >
            <WidgetNode id={child} section />
          </div>
        );
      })}
    </div>
  );
};

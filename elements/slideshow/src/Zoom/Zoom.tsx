import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Zoom.module.css';

export const Zoom = ({ index, speed, children }: Props & { index: number }) => {
  const nextSlide = children?.length === index + 1 ? 0 : index + 1;

  return (
    <div className={styles.wrapper + ' __sc __c'}>
      {children?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={child}
            style={{
              transition: `all ${speed || 200}ms`,
              opacity: i === index ? 1 : 0,
              transform: (i === index || i === nextSlide) && 'none',
            }}
          >
            <WidgetNode id={child} />
          </div>
        );
      })}
    </div>
  );
};

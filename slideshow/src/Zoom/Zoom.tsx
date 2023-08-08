import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Zoom.module.css';

export const Zoom = ({
  index,
  speed,
  children,
  onNextSlide,
}: Props & { index: number; onNextSlide: () => void }) => {
  const nextSlide = children?.length === index + 1 ? 0 : index + 1;

  return (
    <div className={styles.wrapper + ' __sc __c'}>
      {children?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={child}
            onTransitionEnd={(e) => {
              if (e.propertyName === 'transform') {
                onNextSlide();
              }
            }}
            style={{
              transition: `transform ${speed || 200}ms, opacity ${speed || 200}ms`,
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

import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Fade.module.css';

export const Fade = ({
  index,
  speed,
  children,
  onNextSlide,
}: Props & { index: number; onNextSlide: () => void }) => {
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
            onTransitionEnd={(e) => {
              if (e.propertyName === 'opacity') {
                onNextSlide();
              }
            }}
          >
            <WidgetNode id={child} section />
          </div>
        );
      })}
    </div>
  );
};

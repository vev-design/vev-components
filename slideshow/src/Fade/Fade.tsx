import React, { useMemo } from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Fade.module.css';

export const Fade = ({
  index,
  speed,
  slides,
  onNextSlide,
}: Omit<Props, 'children'> & { index: number; onNextSlide: () => void }) => {
  const NEXT = useMemo(() => (index + 1 === slides.length ? 0 : index + 1), [index, slides]);
  const PREV = useMemo(() => (index === 0 ? slides.length - 1 : index - 1), [index, slides]);
  const array = [slides[PREV], slides[index], slides[NEXT]];

  return (
    <div className={styles.wrapper + ' __sc __c'}>
      {array?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={child}
            style={{
              transition: `opacity ${speed || 200}ms`,
              opacity: i === 1 ? 1 : 0,
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

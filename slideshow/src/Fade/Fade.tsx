import React from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';
import { useNext, usePrev } from '../hooks';

import styles from './Fade.module.css';

export const Fade = ({
  index,
  speed,
  slides,
  onNextSlide,
}: Omit<Props, 'children'> & { index: number; onNextSlide: () => void }) => {
  const NEXT = useNext(index, slides);
  const PREV = usePrev(index, slides);
  const array = [slides[PREV], slides[index], slides[NEXT]];

  return (
    <div className={styles.wrapper}>
      {array?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={i + child}
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
            {child && <WidgetNode id={child} section />}
          </div>
        );
      })}
    </div>
  );
};

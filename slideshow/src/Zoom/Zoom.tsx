import React, { useMemo } from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Zoom.module.css';

export const Zoom = ({
  index,
  speed,
  children,
  onNextSlide,
}: Props & { index: number; onNextSlide: () => void }) => {
  const NEXT = useMemo(() => (index + 1 === children.length ? 0 : index + 1), [index, children]);
  const PREV = useMemo(() => (index === 0 ? children.length - 1 : index - 1), [index, children]);
  const slides = [children[PREV], children[index], children[NEXT]];

  return (
    <div className={styles.wrapper + ' __sc __c'}>
      {slides?.map((child: string, i: number) => {
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
              opacity: i === 1 ? 1 : 0,
              transform: i === 2 ? 'scale(400%)' : 'none',
            }}
          >
            <WidgetNode id={child} />
          </div>
        );
      })}
    </div>
  );
};

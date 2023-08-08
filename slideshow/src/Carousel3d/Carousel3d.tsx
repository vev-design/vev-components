import React, { useState, useEffect, useRef } from 'react';
import { WidgetNode, useSize } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Carousel3d.module.css';

export const Carousel3d = ({
  index,
  speed,
  children,
  hostRef,
  gap = 30,
  onNextSlide,
}: Props & { index: number; onNextSlide: () => void }) => {
  const [rounds, setRounds] = useState(1);
  const [radius, setRadius] = useState(0);
  const size = useSize(hostRef);
  const prevIndex = useRef(0);

  useEffect(() => {
    if (index < prevIndex.current && prevIndex.current === children?.length - 1) {
      setRounds(rounds + 1);
    }
    prevIndex.current = index;
  }, [children, index, rounds]);

  useEffect(() => {
    const val = Math.round(size.width / 2 / Math.tan(Math.PI / children.length));
    setRadius(val);
  }, [size.width, children.length]);

  const percentage = 360 / children.length;
  const perspective = `${radius * 2 + gap * 2}px`;

  return (
    <div
      className={styles.wrapper + ' __sc __c'}
      style={{
        perspective,
        transform: 'scale(0.5)',
      }}
    >
      <div
        className={styles.carousel}
        style={{
          transform: `rotateY(-${percentage * (index + rounds * children.length)}deg) `,
          transition: `transform ${speed || 200}ms`,
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
                transform: `rotateY(${percentage * i}deg) translateZ(${radius + gap}px)`,
              }}
            >
              <WidgetNode id={child} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

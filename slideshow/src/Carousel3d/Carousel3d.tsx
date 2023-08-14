import React, { useState, useEffect, useRef } from 'react';
import { WidgetNode, useSize } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Carousel3d.module.css';

export const Carousel3d = ({
  index,
  speed,
  slides,
  hostRef,
  gap = 30,
  onNextSlide,
}: Omit<Props, 'children'> & { index: number; onNextSlide: () => void }) => {
  const [rounds, setRounds] = useState(1);
  const [radius, setRadius] = useState(0);
  const size = useSize(hostRef);
  const prevIndex = useRef(0);

  useEffect(() => {
    if (index < prevIndex.current && prevIndex.current === slides?.length - 1) {
      setRounds(rounds + 1);
    }
    prevIndex.current = index;
  }, [slides, index, rounds]);

  useEffect(() => {
    const val = Math.round(size.width / 2 / Math.tan(Math.PI / slides?.length));
    setRadius(val);
  }, [size.width, slides.length]);

  const percentage = 360 / slides.length;
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
          transform: `rotateY(-${percentage * (index + rounds * slides?.length)}deg) `,
          transition: `transform ${speed || 200}ms`,
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'transform') {
            onNextSlide();
          }
        }}
      >
        {slides?.map((child: string, i: number) => {
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

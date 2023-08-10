import React, { useMemo, useState, useEffect, useRef } from 'react';
import { WidgetNode } from '@vev/react';
import { Props } from '../Slideshow';

import styles from './Slide.module.css';

export const Slide = ({
  vertical,
  index,
  speed,
  children,
  onNextSlide,
}: Props & { index: number; onNextSlide: () => void }) => {
  const prevIndex = useRef(0);
  const [move, setMove] = useState(-100);
  const [transitionSpeed, setTransitionSpeed] = useState(speed || 200);
  const direction = vertical ? 'Y' : 'X';

  const NEXT = useMemo(() => (index + 1 === children.length ? 0 : index + 1), [index, children]);
  const PREV = useMemo(() => (index === 0 ? children.length - 1 : index - 1), [index, children]);
  const [slides, setSlides] = useState([children[PREV], children[index], children[NEXT]]);

  useEffect(() => {
    if (
      index === prevIndex.current + 1 ||
      (prevIndex.current === children.length - 1 && index === 0)
    ) {
      prevIndex.current = index;
      setTransitionSpeed(speed || 200);
      setMove(-200);
    }

    if (
      index === prevIndex.current - 1 ||
      (prevIndex.current === 0 && index === children.length - 1)
    ) {
      prevIndex.current = index;
      setTransitionSpeed(speed || 200);
      setMove(0);
    }
  }, [index, prevIndex, speed]);

  return (
    <div
      className={styles.wrapper + ' __sc __c'}
      style={{
        transform: `translate${direction}(${move}%)`,
        transition: `transform ${transitionSpeed}ms linear`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'transform') {
          onNextSlide();
          setTransitionSpeed(0);
          setMove(-100);
          setSlides([children[PREV], children[index], children[NEXT]]);
        }
      }}
    >
      {slides?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={child}
            style={{
              transform: `translate${direction}(${100 * i}%)`,
            }}
          >
            <WidgetNode id={child} />
          </div>
        );
      })}
    </div>
  );
};

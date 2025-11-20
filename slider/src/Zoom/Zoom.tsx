import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useDispatchVevEvent, WidgetNode } from '@vev/react';
import { Events, Props } from '../types';
import { isGoingForward, isGoingBackward, getNextSlideIndex, getPrevSlideIndex, checkIfKeyIsDuplicatedInArray } from '../utils';

import styles from './Zoom.module.css';

export const Zoom = ({
  index = 0,
  easing,
  slides,
  direction,
  scaleFactor = 300,
  transitionSpeed,
  resetTransitionSpeed,
}: Omit<Props, 'children'> & {
  index: number;
  preview?: boolean;
}) => {
  const dispatch = useDispatchVevEvent();

  const reverse = !direction?.includes('REVERSE');
  const [currentSlides, setCurrentSlides] = useState<string[]>([]);
  const [move, setMove] = useState(1);
  const prevIndex = useRef(index);

  useEffect(() => {
    setSlides();
  }, [reverse]);

  const setSlides = useCallback(() => {
    const currentSlide = slides[index] || slides[0];
    const nextSlideIndex = getNextSlideIndex(index, slides);
    const prevSlideIndex = getPrevSlideIndex(index, slides);
    const nextSlide = slides[nextSlideIndex] || slides[0];
    const prevSlide = slides[prevSlideIndex] || slides[0];

    setCurrentSlides(
      reverse ? [nextSlide, currentSlide, prevSlide] : [prevSlide, currentSlide, nextSlide],
    );
  }, [index, slides, reverse]);

  useEffect(() => {
    const isJumping = prevIndex.current - index > 1 || index - prevIndex.current > 1;

    if (isGoingForward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      reverse ? setMove(0) : setMove(2);
    } else if (isGoingBackward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      reverse ? setMove(2) : setMove(0);
    } else if (isJumping) {
      prevIndex.current = index;
      setSlides();
    }
  }, [index, prevIndex, setSlides]);

  return (
    <div
      className={styles.wrapper}
      style={{
        transition: `transform ${transitionSpeed}ms ${easing || 'ease'}`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'opacity') {
          resetTransitionSpeed();
          setSlides();
          setMove(1);
          dispatch(Events.SLIDE_DID_CHANGED, {
            currentSlide: index + 1,
          });
        }
      }}
    >
      {currentSlides?.map((child: string, i: number) => {
        if (!child) return null;
        // If only two slides, and index to prevent duplicate keys
        return (
          <div
            className={[styles.slide, i === move ? styles.active : ''].join(' ')}
            key={checkIfKeyIsDuplicatedInArray(currentSlides, child) ? `${child}${i}` : child}
            style={{
              transition: `opacity ${transitionSpeed}ms, transform ${transitionSpeed}ms`,
              opacity: i === move ? 1 : 0,
              zIndex: scaleFactor === 100 ? (i === move ? 'auto' : -1) : 'auto',
              transform: i === move || i === move - 1 ? 'scale(1)' : `scale(${scaleFactor}%)`,
            }}
          >
            {child && <WidgetNode id={child} />}
          </div>
        );
      })}
    </div>
  );
};

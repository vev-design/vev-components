import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatchVevEvent, WidgetNode } from '@vev/react';
import { isGoingForward, isGoingBackward, getNextSlideIndex, getPrevSlideIndex, checkIfKeyIsDuplicatedInArray } from '../utils';
import { Events, Props } from '../types';

import styles from './Slide.module.css';

const getSlideScale = (
  index: number,
  centerSlideIndex: number,
  scaleFactor: number,
  move: number,
) => {
  const distance =
    move === -200
      ? Math.abs(centerSlideIndex - index + 1)
      : move === 0
        ? Math.abs(centerSlideIndex - index - 1)
        : Math.abs(index - centerSlideIndex);
  return distance === 0 ? '1' : `${1 - scaleFactor / 100}`;
};

export const Slide = ({
  index,
  easing,
  slides,
  direction,
  infinite,
  slidesToLoad: slidesToLoadProp,
  shrinkFactorBeforeAfter,
  transitionSpeed,
  resetTransitionSpeed,
}: Omit<Props, 'children' | 'speed'> & {
  index: number;
}) => {
  const slidesToLoad = Math.min(Math.max(slidesToLoadProp, 1), 5) || 1;
  const [currentSlides, setCurrentSlides] = useState<string[]>([]);
  const [move, setMove] = useState(-100);
  const [idle, setIdle] = useState(true);
  const prevIndex = useRef(0);
  const dispatch = useDispatchVevEvent();

  const moveDirection = ['VERTICAL', 'VERTICAL_REVERSE'].includes(direction) ? 'Y' : 'X';

  const reverse = direction?.includes('REVERSE');
  const scaleBeforeAfter = shrinkFactorBeforeAfter && shrinkFactorBeforeAfter > 0;
  const centerSlideIndex = Math.floor(currentSlides.length / 2);

  const setSlides = useCallback(() => {
    const getIndexValue = (val: any, curr: number) => (val === undefined ? curr : val);

    const indexes = [
      ...Array(slidesToLoad)
        .fill(null)
        .reduce((res) => {
          const prevIndex = getPrevSlideIndex(getIndexValue(res[0], index), slides);
          return [!infinite && prevIndex > index ? -1 : prevIndex, ...res];
        }, []),
      index,
      ...Array(slidesToLoad)
        .fill(null)
        .reduce((res) => {
          const nextIndex = getNextSlideIndex(getIndexValue(res[res.length - 1], index), slides);
          return [...res, !infinite && nextIndex < index ? -1 : nextIndex];
        }, []),
    ];
    const slideKeys = indexes.map((index) => slides[index] ? slides[index] : infinite && slides[0]);
    setCurrentSlides(reverse ? slideKeys.reverse() : slideKeys);
  }, [reverse, slidesToLoad, infinite, index]);

  useEffect(() => {
    if (currentSlides.length > 0) {
      dispatch(Events.SLIDE_DID_CHANGED, {
        currentSlide: index + 1,
      });
    }
  }, [currentSlides]);

  useEffect(() => {
    setSlides();
  }, [reverse, slidesToLoad, infinite]);

  useEffect(() => {
    const isJumping = prevIndex.current !== index;

    const moveLeft = () => {
      setMove(-200);
    };

    const moveRight = () => {
      setMove(0);
    };

    if (isGoingForward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      return reverse ? moveRight() : moveLeft();
    } else if (isGoingBackward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      return reverse ? moveLeft() : moveRight();
    }

    if (isJumping) {
      prevIndex.current = index;
      return setSlides();
    }

  }, [index, prevIndex, setIdle]);

  return (
    <div
      className={styles.wrapper}
      style={{
        transform: `translate${moveDirection}(${-100 * (slidesToLoad - 1)}%)`,
      }}
    >
      <div
        className={styles.wrapper}
        style={{
          transform: `translate${moveDirection}(${move}%)`,
          transition: `transform ${transitionSpeed}ms ${easing || 'ease'}`,
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'transform') {
            resetTransitionSpeed();
            setMove(-100);
            setSlides();
          }
        }}
      >
        {currentSlides?.map((child: string, i: number) => {
          if (!child) return null;
          return (
            <div
              className={styles.slide}
              key={checkIfKeyIsDuplicatedInArray(currentSlides, child) ? `${child}${i}` : child}
              style={{
                transform: `translate${moveDirection}(${100 * i}%)`,
                width: '100%',
                zIndex: i === centerSlideIndex ? '1' : '0',
                pointerEvents: i === centerSlideIndex ? 'auto' : 'none',
              }}
            >
              {scaleBeforeAfter ? (
                <div
                  className={styles.inner}
                  style={{
                    scale: getSlideScale(i, centerSlideIndex, shrinkFactorBeforeAfter, move),
                    transition: `scale ${transitionSpeed}ms ${easing || 'ease'}`,
                  }}
                >
                  {child && <WidgetNode id={child} />}
                </div>
              ) : (
                <WidgetNode id={child} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


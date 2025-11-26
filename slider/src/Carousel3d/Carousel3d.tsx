import React, { useState, useEffect, useRef } from 'react';
import { WidgetNode, useSize } from '@vev/react';
import { Props } from '../Slider';
import { isGoingForward, isGoingBackward } from '../utils';

import styles from './Carousel3d.module.css';

const Slide3d = ({
  contentKey,
  angle,
  radius,
  active,
  isVertical,
}: {
  contentKey: string;
  angle: number;
  radius: number;
  size: number;
  active: boolean;
  isVertical: boolean;
}) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return (
    <div
      className={styles.slide + (!active ? (' ' + styles.notActive) : '')}
      style={{
        rotate: isVertical ? `1 0 0 ${-angle}rad` : `0 1 0 ${angle}rad`,
        translate: isVertical
          ? `0 ${sin * radius}px ${cos * radius - radius}px`
          : `${sin * radius}px 0 ${cos * radius - radius}px`,
        zIndex: active ? 1 : -1,
        pointerEvents: active ? 'all' : 'none',
      }}
    >
      <WidgetNode id={contentKey} />
    </div>
  );
};

export const Carousel3d = ({
  hostRef,
  index,
  speed,
  easing,
  slides,
  gap = 30,
  perspective = 800,
  editMode,
  direction,
  action,
  infinite,
}: Omit<Props, 'children'> & { index: number }) => {
  const { width, height } = useSize(hostRef);
  const [percentage, setPercentage] = useState(0);
  const angle = Math.PI * 2;
  const prevIndex = useRef(0);

  const isReverse = direction?.includes('REVERSE');
  const isVertical = ['VERTICAL', 'VERTICAL_REVERSE'].includes(direction);
  const selectSlide = 1 - index / slides.length;
  const angleStep = (Math.PI * 2) / slides.length;

  // For vertical, use height; for horizontal, use width
  const containerSize = isVertical ? height : width;
  const circleRadius = Math.max(
    0.4,
    slides.length <= 2 ? gap : (containerSize / 2 + gap) / Math.tan(Math.PI / slides.length),
  );

  useEffect(() => {
    const unit = 1 / slides.length;

    const moveLeft = () => setPercentage((percentage) => percentage - unit);
    const moveRight = () => setPercentage((percentage) => percentage + unit);

    if (isGoingForward(index, prevIndex.current, slides.length, infinite, action)) {
      (isReverse ? moveRight : moveLeft)();
    }
    if (isGoingBackward(index, prevIndex.current, slides.length)) {
      (isReverse ? moveLeft : moveRight)();
    }

    prevIndex.current = index;
  }, [index, prevIndex.current, slides.length]);

  useEffect(() => {
    if (editMode) {
      setPercentage(0);
    }
  }, [editMode]);

  return (
    <div
      className={styles.wrapper}
      style={{
        perspective,
      }}
    >
      <div
        style={{
          transition: `rotate ${speed}ms ${easing || 'ease'}`,
          rotate: isVertical
            ? `1 0 0 ${angle * (editMode ? selectSlide : percentage)}rad`
            : `0 1 0 ${angle * (editMode ? selectSlide : percentage)}rad`,
          transformOrigin: `center center -${circleRadius}px`,
          transformStyle: 'preserve-3d',
          width,
          height,
        }}
      >
        {slides?.map((child: string, i: number) => {
          return (
            <Slide3d
              key={child}
              contentKey={child}
              angle={angle + angleStep * i}
              radius={circleRadius}
              size={width}
              active={i === index}
              isVertical={isVertical}
            />
          );
        })}
      </div>
    </div>
  );
};

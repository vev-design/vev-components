import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slider";
import {
  isGoingForward,
  isGoingBackward,
  getNextSlideIndex,
  getPrevSlideIndex,
} from "../utils";

import styles from "./Slide.module.css";
const tempId = () => "tmp-" + Math.random().toString(16).slice(2);

export const Slide = ({
  index,
  speed,
  slides,
  direction,
  infinite,
  action,
  slidesToLoad: slidesToLoadProp,
}: Omit<Props, "children"> & {
  index: number;
}) => {
  const slidesToLoad =
    Math.min(Math.max(slidesToLoadProp, 1), Math.min(5, slides.length - 1)) ||
    1;
  const [currentSlides, setCurrentSlides] = useState<string[]>([]);
  const [move, setMove] = useState(-100);
  const [transitionSpeed, setTransitionSpeed] = useState(speed || 1);
  const prevIndex = useRef(0);

  const moveDirection = ["VERTICAL", "VERTICAL_REVERSE"].includes(direction)
    ? "Y"
    : "X";

  const reverse = direction?.includes("REVERSE");

  const setSlides = useCallback(() => {
    const getIndexValue = (val: any, curr: number) =>
      val === undefined ? curr : val;

    const indexes = [
      ...Array(slidesToLoad)
        .fill(null)
        .reduce((res) => {
          const prevIndex = getPrevSlideIndex(
            getIndexValue(res[0], index),
            slides
          );
          return [!infinite && prevIndex > index ? -1 : prevIndex, ...res];
        }, []),
      index,
      ...Array(slidesToLoad)
        .fill(null)
        .reduce((res) => {
          const nextIndex = getNextSlideIndex(
            getIndexValue(res[res.length - 1], index),
            slides
          );
          return [...res, !infinite && nextIndex < index ? -1 : nextIndex];
        }, []),
    ];
    const slideKeys = indexes.map((index) => slides[index] || tempId());
    setCurrentSlides(reverse ? slideKeys.reverse() : slideKeys);
  }, [reverse, slidesToLoad, infinite, index]);

  useEffect(() => {
    setSlides();
  }, [reverse, slidesToLoad, infinite]);

  useEffect(() => {
    const isJumping =
      prevIndex.current - index > 1 || index - prevIndex.current > 1;

    const moveLeft = () => {
      setTransitionSpeed(speed || 1);
      setMove(-200);
    };

    const moveRight = () => {
      setTransitionSpeed(speed || 1);
      setMove(0);
    };

    if (
      isGoingForward(index, prevIndex.current, slides.length, infinite, action)
    ) {
      prevIndex.current = index;
      return reverse ? moveRight() : moveLeft();
    }

    if (isGoingBackward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      return reverse ? moveLeft() : moveRight();
    }

    if (isJumping) {
      prevIndex.current = index;
      return setSlides();
    }
  }, [index, prevIndex, speed]);

  if (slides.length === 1) {
    return (
      <div className={styles.slide}>
        <WidgetNode id={slides[index]} />
      </div>
    );
  }

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
          transition: `transform ${transitionSpeed}ms linear`,
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform") {
            setTransitionSpeed(0);
            setMove(-100);
            setSlides();
          }
        }}
      >
        {currentSlides?.map((child: string, i: number) => {
          return (
            <div
              className={styles.slide}
              key={child}
              style={{
                transform: `translate${moveDirection}(${100 * i}%)`,
                width: "100%",
                zIndex: i === 1 ? "1" : "0",
                pointerEvents: i === 1 ? "auto" : "none",
              }}
            >
              {child && <WidgetNode id={child} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

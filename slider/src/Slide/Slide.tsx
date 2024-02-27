import React, { useState, useEffect, useRef, useCallback } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slideshow";
import { isGoingForward, isGoingBackward } from "../utils";

import styles from "./Slide.module.css";

export const Slide = ({
  index,
  speed,
  slides,
  direction,
  currentSlide,
  nextSlide,
  prevSlide,
  infinite,
  action,
}: Omit<Props, "children"> & {
  index: number;
}) => {
  const reverse = direction?.includes("REVERSE");
  const [currentSlides, setCurrentSlides] = useState<string[]>([]);

  const prevIndex = useRef(0);
  const [move, setMove] = useState(-100);
  const [transitionSpeed, setTransitionSpeed] = useState(speed || 200);
  const moveDirection = ["VERTICAL", "VERTICAL_REVERSE"].includes(direction)
    ? "Y"
    : "X";

  useEffect(() => {
    setSlides();
  }, [reverse]);

  const setSlides = useCallback(() => {
    setCurrentSlides(
      reverse
        ? [nextSlide, currentSlide, prevSlide]
        : [prevSlide, currentSlide, nextSlide]
    );
  }, [nextSlide, currentSlide, prevSlide, direction]);

  useEffect(() => {
    const isJumping =
      prevIndex.current - index > 1 || index - prevIndex.current > 1;

    const moveLeft = () => {
      setTransitionSpeed(speed || 200);
      setMove(-200);
    };

    const moveRight = () => {
      setTransitionSpeed(speed || 200);
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
        <WidgetNode id={currentSlide} />
      </div>
    );
  }

  const hideLastAndFirst = useCallback(
    (key: string, index: number, reverse: boolean) => {
      if (reverse) {
        return (
          (key == slides[slides.length - 1] &&
            currentSlides[2] === key &&
            index === 2) ||
          (key == slides[0] && currentSlides[0] === key && index === 0)
        );
      }
      return (
        (key == slides[slides.length - 1] &&
          currentSlides[0] === key &&
          index === 0) ||
        (key == slides[0] && currentSlides[2] === key && index === 2)
      );
    },
    [slides, currentSlides]
  );

  return (
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
        const key = slides.length <= 2 ? `${child}-${i}` : child;
        return (
          <div
            className={styles.slide}
            key={key}
            style={{
              transform: `translate${moveDirection}(${100 * i}%)`,
              width: "100%",
              zIndex: i === 1 ? "1" : "0",
              pointerEvents: i === 1 ? "auto" : "none",
            }}
          >
            {!infinite && hideLastAndFirst(child, i, reverse)
              ? null
              : child && <WidgetNode id={child} />}
          </div>
        );
      })}
    </div>
  );
};

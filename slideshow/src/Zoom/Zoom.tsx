import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slideshow";
import { isGoingForward, isGoingBackward } from "../utils";

import styles from "./Zoom.module.css";

export const Zoom = ({
  index,
  speed = 0.1, // Have to be 0.1 to trigger onTransitionEnd
  slides,
  direction,
  currentSlide,
  nextSlide,
  prevSlide,
  scaleFactor = 300,
}: Omit<Props, "children"> & {
  index: number;
  preview?: boolean;
}) => {
  const reverse = !direction?.includes("REVERSE");
  const [currentSlides, setCurrentSlides] = useState<string[]>([]);
  const [move, setMove] = useState(1);
  const prevIndex = useRef(index);
  const [transitionSpeed, setTransitionSpeed] = useState(speed || 0);

  useEffect(() => {
    setSlides();
  }, [reverse]);

  const setSlides = useCallback(() => {
    setCurrentSlides(
      reverse
        ? [nextSlide, currentSlide, prevSlide]
        : [prevSlide, currentSlide, nextSlide]
    );
  }, [nextSlide, currentSlide, prevSlide]);

  useEffect(() => {
    const isJumping =
      prevIndex.current - index > 1 || index - prevIndex.current > 1;

    if (
      isJumping &&
      !isGoingForward(index, prevIndex.current, slides.length) &&
      !isGoingForward(prevIndex.current, index, slides.length)
    ) {
      prevIndex.current = index;
      setTransitionSpeed(0.1);
      setMove(1);
      setSlides();
    }

    if (isGoingForward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      setTransitionSpeed(speed);
      reverse ? setMove(0) : setMove(2);
    }

    if (isGoingBackward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      setTransitionSpeed(speed);
      reverse ? setMove(2) : setMove(0);
    }
  }, [index, prevIndex, speed]);

  if (slides.length === 1) {
    return (
      <div className={styles.slide}>
        <WidgetNode id={currentSlide} />
      </div>
    );
  }

  return (
    <div
      className={styles.wrapper}
      style={{
        transition: `transform ${transitionSpeed}ms linear`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "opacity") {
          setTransitionSpeed(1);
          setSlides();
          setMove(1);
        }
      }}
    >
      {currentSlides?.map((child: string, i: number) => {
        // If only two slides, and index to prevent duplicate keys
        const key = slides.length <= 2 ? child + i : child;
        return (
          <div
            className={styles.slide}
            key={key}
            style={{
              transition: `opacity ${transitionSpeed}ms, transform ${transitionSpeed}ms`,
              opacity: i === move ? 1 : 0,
              pointerEvents: i === move ? "auto" : "none",
              zIndex: scaleFactor === 100 ? (i === move ? "auto" : -1) : "auto",
              transform:
                i === move || i === move - 1
                  ? "scale(1)"
                  : `scale(${scaleFactor}%)`,
            }}
          >
            {child && <WidgetNode id={child} />}
          </div>
        );
      })}
    </div>
  );
};

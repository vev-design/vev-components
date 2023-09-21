import React, { useState, useEffect, useRef, useCallback } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slideshow";
import { isGoingForward, isGoingBackward } from "../utils";

import styles from "./Zoom.module.css";

export const Zoom = ({
  index,
  speed,
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
  const prevIndex = useRef(0);
  const [transitionSpeed, setTransitionSpeed] = useState(speed || 200);

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
      setTransitionSpeed(0);
      setMove(1);
      setSlides();
    }

    if (isGoingForward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      setTransitionSpeed(speed || 200);
      reverse ? setMove(0) : setMove(2);
    }

    if (isGoingBackward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      setTransitionSpeed(speed || 200);
      reverse ? setMove(2) : setMove(0);
    }
  }, [index, prevIndex, speed]);

  return (
    <div
      className={styles.wrapper}
      style={{
        transition: `transform ${transitionSpeed}ms linear`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "opacity") {
          setTransitionSpeed(0);
          setSlides();
          setMove(1);
        }
      }}
    >
      {currentSlides?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={child}
            style={{
              transition: `opacity ${transitionSpeed || 200}ms, transform ${
                transitionSpeed || 200
              }ms`,
              opacity: i === move ? 1 : 0,
              pointerEvents: i === 1 ? "auto" : "none",
              transform:
                i === move || i === move - 1
                  ? "scale(100%)"
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

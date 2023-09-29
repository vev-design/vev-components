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
}: Omit<Props, "children"> & {
  index: number;
  preview?: boolean;
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
  }, [reverse, currentSlide]);

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

    if (
      isJumping &&
      !isGoingForward(index, prevIndex.current, slides.length) &&
      !isGoingForward(prevIndex.current, index, slides.length)
    ) {
      prevIndex.current = index;
      setSlides();
    }

    const moveLeft = () => {
      setTransitionSpeed(speed || 200);
      setMove(-200);
    };

    const moveRight = () => {
      setTransitionSpeed(speed || 200);
      setMove(0);
    };

    if (isGoingForward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      reverse ? moveRight() : moveLeft();
    }

    if (isGoingBackward(index, prevIndex.current, slides.length)) {
      prevIndex.current = index;
      reverse ? moveLeft() : moveRight();
    }
  }, [index, prevIndex, speed]);

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
              zIndex: i === index ? "1" : "0",
              pointerEvents: i === index ? "auto" : "none",
             // border: '20px solid red',
            }}
          >
            {child ? <WidgetNode id={child} /> : <div style={{ width: '100%', height: '100%', border: '10x solid red'}} />}
          </div>
        );
      })}
    </div>
  );
};

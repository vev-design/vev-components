import React, { useState, useEffect, useRef } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slideshow";

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
    setCurrentSlides(
      reverse
        ? [nextSlide, currentSlide, prevSlide]
        : [prevSlide, currentSlide, nextSlide]
    );
  }, [reverse]);

  useEffect(() => {
    const isForward =
      index === prevIndex.current + 1 ||
      (prevIndex.current === slides.length - 1 &&
        index === 0 &&
        slides.length !== 1);

    const isBackward =
      index === prevIndex.current - 1 ||
      (prevIndex.current === 0 &&
        index === slides.length - 1 &&
        slides.length !== 1);

    const isJumping =
      prevIndex.current - index > 1 || index - prevIndex.current > 1;

    console.log(prevIndex.current, index, isJumping);

    if (isJumping) {
      prevIndex.current = index;
      setCurrentSlides(
        reverse
          ? [nextSlide, currentSlide, prevSlide]
          : [prevSlide, currentSlide, nextSlide]
      );
    }

    const moveLeft = () => {
      setTransitionSpeed(speed || 200);
      setMove(-200);
    };

    const moveRight = () => {
      setTransitionSpeed(speed || 200);
      setMove(0);
    };

    if (isForward) {
      prevIndex.current = index;
      reverse ? moveRight() : moveLeft();
    }

    if (isBackward) {
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
          setCurrentSlides(
            reverse
              ? [nextSlide, currentSlide, prevSlide]
              : [prevSlide, currentSlide, nextSlide]
          );
        }
      }}
    >
      {currentSlides?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={i + child}
            style={{
              transform: `translate${moveDirection}(${100 * i}%)`,
              width: "100%",
              zIndex: i === index ? "1" : "0",
              pointerEvents: i === index ? "auto" : "none",
            }}
          >
            {child && <WidgetNode id={child} />}
          </div>
        );
      })}
    </div>
  );
};

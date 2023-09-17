import React, { useState, useEffect, useRef } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slideshow";
import { useNext, usePrev } from "../hooks";

import styles from "./Slide.module.css";

export const Slide = ({
  index,
  speed,
  slides,
  direction,
  currentSlides,
  onUpdateCurrentSlides,
}: Omit<Props, "children"> & {
  index: number;
  preview?: boolean;
}) => {
  const prevIndex = useRef(0);
  const [move, setMove] = useState(-100);
  const [transitionSpeed, setTransitionSpeed] = useState(speed || 200);
  const moveDirection = ["VERTICAL", "VERTICAL_REVERSE"].includes(direction)
    ? "Y"
    : "X";

  useEffect(() => {
    if (
      index === prevIndex.current + 1 ||
      (prevIndex.current === slides.length - 1 &&
        index === 0 &&
        slides.length !== 1)
    ) {
      prevIndex.current = index;
      setTransitionSpeed(speed || 200);
      setMove(-200);
    }

    if (
      index === prevIndex.current - 1 ||
      (prevIndex.current === 0 &&
        index === slides.length - 1 &&
        slides.length !== 1)
    ) {
      prevIndex.current = index;
      setTransitionSpeed(speed || 200);
      setMove(0);
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
          onUpdateCurrentSlides();
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

import React, { useState, useEffect, useRef } from "react";
import { WidgetNode, useSize } from "@vev/react";
import { Props } from "../Slideshow";
import { isGoingForward, isGoingBackward } from "../utils";

import styles from "./Carousel3d.module.css";

const Slide3d = ({
  contentKey,
  angle,
  radius,
}: {
  contentKey: string;
  angle: number;
  radius: number;
  size: number;
}) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return (
    <div
      className={styles.slide}
      style={{
        rotate: `0 1 0 ${angle}rad`,
        translate: `${sin * radius}px 0 ${cos * radius - radius}px`,
        transition: "all 500ms",
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
  slides,
  gap = 30,
  perspective = 800,
  editMode,
}: Omit<Props, "children"> & { index: number }) => {
  const { width, height } = useSize(hostRef);
  const [percentage, setPercentage] = useState(0);
  const angle = Math.PI * 2;
  const prevIndex = useRef(0);

  const selectSlide = 1 - index / slides.length;
  const angleStep = (Math.PI * 2) / slides.length;
  const circleRadius = Math.max(
    0.4,
    slides.length <= 2
      ? gap
      : (width / 2 + gap) / Math.tan(Math.PI / slides.length)
  );

  useEffect(() => {
    const unit = 1 / slides.length;

    if (isGoingForward(index, prevIndex.current, slides.length)) {
      console.log("forward");
      setPercentage((percentage) => percentage - unit);
    }
    if (isGoingBackward(index, prevIndex.current, slides.length)) {
      console.log("backward");
      setPercentage((percentage) => percentage + unit);
    }

    prevIndex.current = index;
  }, [index, prevIndex.current, slides.length]);

  return (
    <div
      className={styles.wrapper}
      style={{
        perspective,
      }}
    >
      <div
        style={{
          transition: `rotate ${speed}ms linear`,
          rotate: `0 1 0 ${angle * (editMode ? selectSlide : percentage)}rad`,
          transformOrigin: `center center -${circleRadius}px`,
          width,
          height,
          transformStyle: "preserve-3d",
        }}
      >
        {slides?.map((child: string, i: number) => {
          return (
            <Slide3d
              contentKey={child}
              angle={angle + angleStep * i}
              radius={circleRadius}
              size={width}
            />
          );
        })}
      </div>
    </div>
  );
};

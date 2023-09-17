import React, { useEffect, useState } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slideshow";

import styles from "./Zoom.module.css";

export const Zoom = ({
  index,
  speed,
  slides,
}: Omit<Props, "children"> & { index: number }) => {
  return (
    <div className={styles.wrapper}>
      {slides?.map((child: string, i: number) => {
        return (
          <div
            className={styles.slide}
            key={i + child}
            style={{
              transition: `transform ${speed || 200}ms, opacity ${
                speed || 200
              }ms`,
              opacity: i === index ? 1 : 0,
              transform: i === index - 1 ? "scale(400%)" : "none",
            }}
          >
            {child && <WidgetNode id={child} />}
          </div>
        );
      })}
    </div>
  );
};

import React, { useEffect, useState } from "react";
import styles from "./ImageCompare.module.css";
import { Gesture, registerVevComponent, useImage } from "@vev/react";
import {
  DEFAULT_LEFT_ICON,
  DEFAULT_LEFT_IMAGE,
  DEFAULT_RIGHT_ICON,
  DEFAULT_RIGHT_IMAGE,
} from "./defaults";

type Props = {
  left: { key: string };
  right: { key: string };
  leftIcon: { path: any };
  rightIcon: { path: any };
  hideHandle: boolean;
  animate: boolean;
  hostRef: React.RefObject<HTMLDivElement>;
};

const ImageCompare = ({
  left,
  right,
  hostRef,
  leftIcon,
  rightIcon,
  hideHandle = false,
  animate = false,
}: Props) => {
  const [offset, setOffset] = useState(50);
  const [shouldAnimate, setShouldAnimate] = useState(animate);

  const leftImage: { src: string } = useImage(left?.key);
  const rightImage: { src: string } = useImage(right?.key);

  leftIcon = leftIcon ? leftIcon : DEFAULT_LEFT_ICON;
  rightIcon = rightIcon ? rightIcon : DEFAULT_RIGHT_ICON;

  useEffect(() => {
      window.requestAnimationFrame(() => {

      });
    
  }, [shouldAnimate]);

  return (
    <>
      <div draggable={false} className={styles.wrapper}>
        <div
          className={styles.image}
          style={{
            backgroundImage: `url("${rightImage?.src || DEFAULT_RIGHT_IMAGE}")`,
          }}
        />
        <div
          className={styles.image}
          style={{
            backgroundImage: `url("${leftImage?.src || DEFAULT_LEFT_IMAGE}")`,
            clipPath: `inset(0px ${100 - offset}% 0px 0px)`,
          }}
        />
      </div>
      <Gesture
        onTouchMove={(e) => {
          let pageX = e.pageX;
          if (e.touches) {
            pageX = e.touches[0].pageX;
          }
          const rect = hostRef.current.getBoundingClientRect();
          const newOffset =
            Math.max(0, Math.min(1, (pageX - rect.left) / rect.width)) * 100;
          setOffset(newOffset);
        }}
      >
        <div style={{ left: `${offset}%` }} className={styles.handleContainer}>
          {!hideHandle && (
            <svg
              className={`${styles.iconLeft} ${styles.icon}`}
              viewBox={`0 0 ${leftIcon.path[0]} ${leftIcon.path[1]}`}
            >
              <path d={leftIcon.path[2]} />
            </svg>
          )}
          <div className={styles.handle}></div>
          {!hideHandle && (
            <svg
              className={`${styles.iconRight} ${styles.icon}`}
              viewBox={`0 0 ${rightIcon.path[0]} ${rightIcon.path[1]}`}
            >
              <path d={rightIcon.path[2]} />
            </svg>
          )}
        </div>
      </Gesture>
    </>
  );
};

registerVevComponent(ImageCompare, {
  name: "Image Compare",
  props: [
    { name: "left", title: "Left Image", type: "image" },
    { name: "right", title: "Right Image", type: "image" },
    { name: "leftIcon", title: "Left handle", type: "icon" },
    { name: "rightIcon", title: "Right handle", type: "icon" },
    {
      name: "hideHandle",
      title: "Hide handles",
      type: "boolean",
      initialValue: false,
    },
    {
      name: "animate",
      title: "Animate handle",
      type: "boolean",
      initialValue: false,
    },
  ],
  editableCSS: [
    {
      title: "Handle color",
      selector: styles.handle,
      properties: ["background"],
    },
    {
      title: "Handle icon color",
      selector: styles.icon,
      properties: ["fill"],
    },
  ],
  type: "both",
});

export default ImageCompare;

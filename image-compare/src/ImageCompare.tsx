import React, { useEffect, useRef, useState } from 'react';
import styles from "./ImageCompare.module.css";
import { Gesture, registerVevComponent, useHover, useImage } from "@vev/react";
import {
  DEFAULT_LEFT_ICON,
  DEFAULT_LEFT_IMAGE,
  DEFAULT_RIGHT_ICON,
  DEFAULT_RIGHT_IMAGE,
} from "./defaults";

type Props = {
  left: { key: string };
  right: { key: string };
  handles: {
    leftIcon: { path: any };
    rightIcon: { path: any };
    hideHandle: boolean;
  }
  animation: {
    animate: boolean;
    animationLength: number;
  }
  hostRef: React.RefObject<HTMLDivElement>;
};

const ImageCompare = ({
  left,
  right,
  hostRef,
  handles = {
    leftIcon: DEFAULT_LEFT_ICON,
    rightIcon: DEFAULT_RIGHT_ICON,
    hideHandle: false,
  },
  animation = {
    animate: false,
    animationLength: 10,
  }
}: Props) => {
  const insetImageRef = useRef<HTMLDivElement>();
  const handleRef = useRef<HTMLDivElement>();
  const [offset, setOffset] = useState(50);
  const [hover, setHover] = useState<boolean>(false);
  const leftImage: { src: string } = useImage(left?.key);
  const rightImage: { src: string } = useImage(right?.key);

  const animate = animation.animate || false;
  const animationLength = animation.animationLength || 10;

  const leftIcon = handles.leftIcon || DEFAULT_LEFT_ICON;
  const rightIcon = handles.rightIcon || DEFAULT_RIGHT_ICON;
  const hideHandle = handles.hideHandle || false;

  const lastImageClassname =
    hover || !animate
      ? styles.image
      : `${styles.animateInsetImage} ${styles.image}`;

  const handleClassname =
    hover || !animate
      ? styles.handleContainer
      : `${styles.handleContainer} ${styles.animateHandle}`;

  useEffect(() => {
    const hoverHandler = () => {
      setHover(true);
    };
    const removeHoverHandler = () => {
      setHover(false);
    };

    hostRef.current.addEventListener("mouseenter", hoverHandler);
    hostRef.current.addEventListener("mouseleave", removeHoverHandler);

    return () => {
      if (hostRef.current) {
        hostRef.current.removeEventListener("mouseenter", hoverHandler);
        hostRef.current.removeEventListener("mouseleave", removeHoverHandler);
      }
    };
  }, []);

  useEffect(() => {
    if(insetImageRef.current && handleRef.current) {
      insetImageRef.current.style.animationDuration = `${animationLength}s`
      handleRef.current.style.animationDuration = `${animationLength}s`
    }
  }, [handleRef, insetImageRef, animationLength]);

  return (
    <div className={styles.host}>
      <div draggable={false} className={styles.wrapper}>
        <div
          className={styles.image}
          style={{
            backgroundImage: `url("${rightImage?.src || DEFAULT_RIGHT_IMAGE}")`,
          }}
        />
        <div
          ref={insetImageRef}
          className={lastImageClassname}
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
        <div ref={handleRef} style={{ left: `${offset}%` }} className={handleClassname}>
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
    </div>
  );
};

registerVevComponent(ImageCompare, {
  name: "Image Compare",
  props: [
    { name: "left", title: "Left Image", type: "image" },
    { name: "right", title: "Right Image", type: "image" },
    {
      name: "handles",
      title: "Handles",
      type: "object",
      fields: [
        { name: "leftIcon", title: "Left handle", type: "icon" },
        { name: "rightIcon", title: "Right handle", type: "icon" },
        {
          name: "hideHandle",
          title: "Hide handles",
          type: "boolean",
          initialValue: false,
        },
      ]
    },
    {
      name: "animation",
      title: "Animation",
      type: "object",
      fields: [
        {
          name: "animate",
          title: "Animate handle",
          type: "boolean",
          initialValue: false,
        },
        {
          name: "animationLength",
          title: "Animation duration",
          type: "number",
          initialValue: 10,
        },
      ]
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
    {
      title: "Border",
      selector: styles.host,
      properties: ["border", "border-radius"],
    },
  ],
  type: "both",
});

export default ImageCompare;

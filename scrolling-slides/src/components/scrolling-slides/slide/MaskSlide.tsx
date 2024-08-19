import React from "react";
import { AnimatedSlide } from "./AnimatedSlide";
import { BaseSlideProps } from "./BaseSlide";

const MASK_KEYFRAMES = [
  {
    "--slide-offset": "0",
  },
  {
    "--slide-offset": "1",
  },
];
export function MaskSlide({ settings, ...rest }: BaseSlideProps) {
  const clipPath =
    settings?.maskShape ||
    "circle(calc(var(--slide-offset) * 150%) at calc(var(--mask-x) * 100%) calc(var(--mask-y) * 100%))";
  return (
    <AnimatedSlide
      {...rest}
      style={
        {
          clipPath,
          "--mask-x": settings?.maskX,
          "--mask-y": settings?.maskY,
        } as any
      }
      settings={settings}
      keyframes={MASK_KEYFRAMES}
    />
  );
}

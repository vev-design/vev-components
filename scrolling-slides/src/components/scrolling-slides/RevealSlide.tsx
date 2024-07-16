import { WidgetNode } from "@vev/react";
import React, { useMemo, useRef } from "react";
import { useViewAnimation } from "../../hooks";
import styles from "./ScrollingSlide.module.css";
import { SimpleSlideProps } from "./SimpleSlide";

export function RevealSlide({
  id,
  selected,
  index,
  slideCount,
  timeline,
  settings,
  disabled,
}: SimpleSlideProps) {
  const ref = useRef<HTMLDivElement>(null);
  let cl = styles.content;
  if (selected) cl += " " + styles.selected;
  const keyframes = useRevealAnimation(index, slideCount, settings?.effect);
  useViewAnimation(ref, keyframes, timeline, selected || index === 0);
  return (
    <div ref={ref} className={cl}>
      <WidgetNode id={id} />
    </div>
  );
}

function useRevealAnimation(
  index: number,
  slideCount: number,
  effect: "vertical-reveal" | "horizontal-reveal" | "circle" | "fade" = "fade"
): Keyframe[] {
  return useMemo(() => {
    const stepSize = 1 / slideCount;
    const toOffset = index / slideCount;
    const fromOffset = Math.max(0, toOffset - stepSize / 2);

    const fromCSS: Keyframe = {};
    const toCSS: Keyframe = {};

    if (effect === "vertical-reveal") {
      fromCSS.clipPath = "inset(0 0 100% 0)";
      toCSS.clipPath = "inset(0 0 0 0)";
    } else if (effect === "horizontal-reveal") {
      fromCSS.clipPath = "inset(0 100% 0 0)";
      toCSS.clipPath = "inset(0 0 0 0)";
    } else if (effect === "circle") {
      fromCSS.clipPath = "circle(0% at 50% 50%)";
      toCSS.clipPath = "circle(100% at 50% 50%)";
    } else {
      fromCSS.opacity = 0;
      toCSS.opacity = 1;
    }

    return [
      {
        offset: 0,
        // opacity: 0,
        ...fromCSS,
      },
      {
        offset: fromOffset,
        // opacity: 0,
        ...fromCSS,
      },
      {
        offset: toOffset,
        opacity: 1,
        ...toCSS,
      },
      {
        offset: 1,
        opacity: 1,
        ...toCSS,
      },
    ];
  }, [index, slideCount, effect]);
}

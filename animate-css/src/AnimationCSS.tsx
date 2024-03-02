import { useVisible } from "@vev/react";
import React, { ReactNode, useEffect, useRef } from "react";
import { useViewTimeline } from "./utils/hooks";
import {
  AnimationType,
  VevAnimation,
  createCSSKeyframe,
  getWillChange,
  listenForAnimationRange,
} from "./utils";

type AnimationCSSProps = {
  className?: string;
  animations: VevAnimation[];
  children: ReactNode;
};

export default function AnimationCSS({
  className,
  animations,
  children,
}: AnimationCSSProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisible(ref);
  const viewTimeline = useViewTimeline(ref);
  useEffect(() => {
    const el = ref.current;
    if (!visible || !el || !viewTimeline || !animations?.length) return;

    let willChange = [];

    const unsubscribes: (() => void)[] = [];

    if (!Array.isArray(animations)) return;
    for (const animation of animations) {
      willChange.push(getWillChange(animation.keyframes));

      let keyframes: Keyframe[] = animation.keyframes.map(createCSSKeyframe);

      const isScrollAnimation = animation.type === AnimationType.scroll;
      const options: KeyframeAnimationOptions = {
        fill: "both",
        duration:
          typeof animation.duration !== "number"
            ? Number((animation.duration || "").replace("s", "")) * 1000 || 1000
            : animation.duration,
        delay: animation.delay || 0,
        easing: animation.easing || "ease-out",
        iterations: animation.type === "visible" ? Infinity : 1,
      };
      console.log(options, animation);
      const start = animation.start || "entry-crossing";
      const startOffset = animation.startOffset || 0;
      const end = animation.end || "exit-crossing";
      const endOffset = animation.endOffset || 0;

      if (animation.type === AnimationType.scroll) {
        options.timeline = viewTimeline;
        options.rangeStart = `${start} ${startOffset * 100}%`;
        options.rangeEnd = `${end} ${endOffset * 100}%`;
        options.easing = "linear";
        delete options.delay;
      }

      const cssAnimation = el.animate && el.animate(keyframes, options);

      if (animation.type === AnimationType.visible) {
        cssAnimation.pause();
        const listener = listenForAnimationRange(
          el,
          start,
          startOffset,
          viewTimeline,
          () => {
            console.log("PLAY");
            cssAnimation.play();
          }
        );

        unsubscribes.push(listener);
      } else if (animation.type === AnimationType.hover) {
        cssAnimation.pause();
        const onHover = () => {
          if (cssAnimation.playbackRate < 0) cssAnimation.reverse();
          else cssAnimation.play();
        };

        const onLeave = () => {
          if (cssAnimation.playbackRate > 0) cssAnimation.reverse();
          else cssAnimation.play();
        };

        el.addEventListener("mouseenter", onHover);
        el.addEventListener("mouseleave", onLeave);
        unsubscribes.push(() => {
          el.removeEventListener("mouseenter", onHover);
          el.removeEventListener("mouseleave", onLeave);
        });
      }

      unsubscribes.push(() => {
        cssAnimation.cancel();
      });
    }

    el.style.willChange = willChange.join(", ");

    return () => {
      el.style.willChange = "";

      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [viewTimeline, visible, animations]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

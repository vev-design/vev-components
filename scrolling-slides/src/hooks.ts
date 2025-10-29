import { s, useViewport } from "@vev/react";
import { RefObject, useEffect, useState } from "react";

type ViewTimelineOptions = {
  axis: "block" | "inline";
  subject: HTMLElement;
};

declare global {
  class ViewTimeline extends AnimationTimeline {
    constructor(options: ViewTimelineOptions);
  }
}

const isSupported = () => CSS.supports("animation-timeline: --works");

export function useViewTimeline(
  sourceRef: RefObject<HTMLElement | null>,
  disabled?: boolean
): ViewTimeline | undefined {
  const [supported, setSupported] = useState(isSupported);
  const [timeline, setTimeline] = useState<any>();
  const el = sourceRef.current;
  useEffect(() => {
    if (!el || disabled) return;
    // Polyfill for Safari
    if (!supported) {
      let cancel = false;
      console.log("Scroll timelines not supported, loading polyfill");
      s.fetch(
        "https://cdn.vev.design/v/scrolling-timeline/scroll-timeline-lite.js"
      ).then(() => {
        if (!cancel) setSupported(true);
      });

      return () => {
        cancel = true;
      };
    }
    setTimeline(
      new ViewTimeline({
        axis: "block",
        subject: el,
      })
    );
  }, [supported, el, disabled]);

  return timeline;
}

export function useViewAnimation(
  ref: RefObject<HTMLElement>,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  timeline?: ViewTimeline,
  disable?: boolean,
  options?: KeyframeAnimationOptions,
  offsetStart = 0,
  offsetEnd = 1
) {
  const { scrollHeight, height: windowHeight } = useViewport();
  useEffect(() => {
    const el = ref.current;
    if (disable || !timeline || !el || !el.parentElement) return;

    // Guard against invalid windowHeight to prevent division by zero
    if (!windowHeight || windowHeight <= 0 || !isFinite(windowHeight)) return;

    const { top, bottom, height } = el.parentElement.getBoundingClientRect();
    const rootOffset = top + window.scrollY;
    const isLessThanViewport = height < windowHeight;

    // Ensure offsetStart and offsetEnd are finite numbers
    let computedOffsetStart = Number(offsetStart);
    let computedOffsetEnd = Number(offsetEnd);

    if (!isFinite(computedOffsetStart)) computedOffsetStart = 0;
    if (!isFinite(computedOffsetEnd)) computedOffsetEnd = 1;

    if (isLessThanViewport && rootOffset < windowHeight) {
      const adjustment = 1 - (rootOffset + height) / windowHeight;
      if (isFinite(adjustment)) {
        computedOffsetStart += adjustment;
      }
    }

    const scrollBottomTop = scrollHeight - windowHeight;

    if (isLessThanViewport && rootOffset > scrollBottomTop) {
      const endOffset = (rootOffset - scrollBottomTop) / windowHeight;
      if (isFinite(endOffset)) {
        computedOffsetStart -= endOffset;
        computedOffsetEnd -= endOffset;
      }
    }

    // Clamp values to reasonable range (0-1) and ensure they're finite
    computedOffsetStart = Math.max(0, Math.min(1, computedOffsetStart));
    computedOffsetEnd = Math.max(0, Math.min(1, computedOffsetEnd));

    if (!isFinite(computedOffsetStart)) computedOffsetStart = 0;
    if (!isFinite(computedOffsetEnd)) computedOffsetEnd = 1;

    // Type assertion needed because rangeStart/rangeEnd are not yet in KeyframeAnimationOptions types
    const animationOptions = {
      fill: "both" as const,
      timeline,
      easing: "linear",
      ...options,
      duration: "auto" as const,
      // Use string format for better Safari compatibility (matches keyframe.ts)
      rangeStart: `contain ${computedOffsetStart * 100}%`,
      rangeEnd: `contain ${computedOffsetEnd * 100}%`,
    } as any;

    const animation = el.animate(keyframes, animationOptions);
    return () => {
      animation.cancel();
    };
  }, [
    timeline,
    JSON.stringify(keyframes),
    disable,
    JSON.stringify(options),
    offsetStart,
    offsetEnd,
    windowHeight,
    scrollHeight,
  ]);
}

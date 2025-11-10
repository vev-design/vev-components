import { s, useViewport } from "@vev/react";
import { MutableRefObject, RefObject, useEffect, useState } from "react";

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
  sourceRef: RefObject<HTMLElement>,
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
    const el = ref.current as HTMLElement;
    if (disable || !timeline || !el || !el.parentElement) return;

    const { top, bottom, height } = el.parentElement.getBoundingClientRect();
    const rootOffset = top + window.scrollY;
    const isLessThanViewport = height < windowHeight;

    if (isLessThanViewport && rootOffset < windowHeight) {
      // console.log(offsetStart, el);
      offsetStart += 1 - (rootOffset + height) / windowHeight;
    }

    const scrollBottomTop = scrollHeight - windowHeight;

    if (isLessThanViewport && rootOffset > scrollBottomTop) {
      const endOffset = (rootOffset - scrollBottomTop) / windowHeight;
      offsetStart -= endOffset;
      offsetEnd -= endOffset;
    }

    const animation = el.animate(keyframes, {
      fill: "both",
      timeline,
      easing: "linear",
      ...options,
      duration: "auto",
      rangeStart: {
        rangeName: "contain",
        offset: CSS.percent(offsetStart * 100),
      },
      rangeEnd: {
        rangeName: "contain",
        offset: CSS.percent(offsetEnd * 100),
      },
      // rangeStart: isLessThanViewport ? enterCrossing : exitCrossing,
      // rangeEnd: isLessThanViewport ? exitCrossing : enterCrossing,
    });
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

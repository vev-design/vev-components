import { s } from "@vev/react";
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
  sourceRef: RefObject<HTMLElement>
): ViewTimeline | undefined {
  const [supported, setSupported] = useState(isSupported);
  const [timeline, setTimeline] = useState<any>();
  useEffect(() => {
    const el = sourceRef.current;
    if (!el) return;
    // Polyfill for Safari
    if (!supported) {
      let cancel = false;
      console.log("Scroll timelines not supported, loading polyfill");
      s.fetch(
        "https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js"
      ).then(() => {
        if (!cancel) setSupported(true);
      });

      return () => {
        cancel = true;
      };
    } else {
      setTimeline(
        new ViewTimeline({
          axis: "block",
          subject: el,
        })
      );
    }
  }, [supported, sourceRef]);

  return timeline;
}

export function useViewAnimation(
  ref: RefObject<HTMLElement>,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  timeline?: ViewTimeline,
  disable?: boolean
) {
  useEffect(() => {
    const el = ref.current;
    if (disable || !timeline || !el || !el.parentElement) return;

    const isLessThanViewport =
      el.parentElement.clientHeight < window.innerHeight;

    const enterCrossing = {
      rangeName: "entry-crossing",
      offset: CSS.percent(100),
    };

    const exitCrossing = {
      rangeName: "exit-crossing",
      offset: CSS.percent(0),
    };
    const animation = el.animate(keyframes, {
      fill: "both",
      timeline,
      duration: "auto",
      easing: "linear",
      rangeStart: isLessThanViewport ? enterCrossing : exitCrossing,
      rangeEnd: isLessThanViewport ? exitCrossing : enterCrossing,
    });
    return () => {
      animation.cancel();
    };
  }, [timeline, JSON.stringify(keyframes), disable]);
}

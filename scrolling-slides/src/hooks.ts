import { useViewport } from "@vev/react";
import { RefObject, useEffect, useState } from "react";

type ViewTimelineOptions = {
  axis: 'block' | 'inline';
  subject: HTMLElement;
};

declare global {
  class ViewTimeline extends AnimationTimeline {
    constructor(options: ViewTimelineOptions);
  }
}

export function useViewTimeline(
  sourceRef: RefObject<HTMLElement>,
  disabled?: boolean,
): ViewTimeline | undefined {
  const [timeline, setTimeline] = useState<any>();
  const el = sourceRef.current;
  useEffect(() => {
    if (!el || disabled) return;

    // Note: Polyfill is loaded by the wrapper app
    // There's a known issue with the polyfill causing "non-finite" errors in Safari
    // See: https://github.com/flackr/scroll-timeline/issues/205

    // Ensure element is connected to DOM before creating timeline
    if (!el.isConnected) return;

    try {
      setTimeline(
        new ViewTimeline({
          axis: "block",
          subject: el,
        })
      );
    } catch (error) {
      console.error('[useViewTimeline] Error creating ViewTimeline:', error);
    }
  }, [el, disabled]);

  return timeline;
}

export function useViewAnimation(
  ref: RefObject<HTMLElement>,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  timeline?: ViewTimeline,
  disable?: boolean,
  options?: KeyframeAnimationOptions,
  offsetStart = 0,
  offsetEnd = 1,
) {
  const { scrollHeight, height: windowHeight } = useViewport();
  useEffect(() => {
    const el = ref.current;
    if (disable || !timeline || !el || !el.parentElement) return;

    // Check element is actually an Element instance (fixes getComputedStyle error)
    if (!(el instanceof Element)) return;

    // Ensure element is connected to DOM (polyfill needs this for getComputedStyle)
    if (!el.isConnected) return;

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

    // Calculate percentages (polyfill bug with non-finite values happens internally, not from our values)
    const percentStart = offsetStart * 100;
    const percentEnd = offsetEnd * 100;

    // Type assertion needed because rangeStart/rangeEnd are not yet in KeyframeAnimationOptions types
    const animationOptions = {
      fill: "both" as const,
      timeline,
      easing: 'linear',
      ...options,
      duration: "auto" as const,
      rangeStart: {
        rangeName: "contain",
        offset: CSS.percent(percentStart),
      },
      rangeEnd: {
        rangeName: "contain",
        offset: CSS.percent(percentEnd),
      },
      // rangeStart: isLessThanViewport ? enterCrossing : exitCrossing,
      // rangeEnd: isLessThanViewport ? exitCrossing : enterCrossing,
    } as any;

    try {
      const animation = el.animate(keyframes, animationOptions);
      return () => {
        try {
          animation.cancel();
        } catch (error) {
          // Silently handle polyfill errors
        }
      };
    } catch (error) {
      // Polyfill errors are caught but can't be fixed from here
      return () => { };
    }
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

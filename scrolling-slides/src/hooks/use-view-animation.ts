import { useViewport } from '@vev/react';
import { RefObject, useEffect } from 'react';
import { calculateScrollAnimationOffset } from '../utils/calculations';

export function useViewAnimation(
  ref: RefObject<HTMLElement>,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  timeline?: ViewTimeline,
  disable?: boolean,
  options?: KeyframeAnimationOptions,
  offsetStart?: number,
  offsetEnd?: number,
) {
  const { scrollHeight, height: windowHeight } = useViewport();
  useEffect(() => {
    const el = ref.current;
    if (disable || !timeline || !el || !el.parentElement) return;

    // Check element is actually an Element instance (fixes getComputedStyle error)
    if (!(el instanceof Element)) return;

    const parent = el.parentElement;
    // Ensure element is connected to DOM (polyfill needs this for getComputedStyle)
    if (!el.isConnected || !parent) return;

    if (offsetStart === undefined || offsetEnd === undefined) {
      const { offsetStart: offsetStartCalculated, offsetEnd: offsetEndCalculated } =
        calculateScrollAnimationOffset(parent);
      offsetStart = offsetStartCalculated || 0;
      offsetEnd = offsetEndCalculated || 1;
    }

    //    const { offsetStart, offsetEnd } = calculateScrollAnimationOffset(parent);

    // Calculate percentages (polyfill bug with non-finite values happens internally, not from our values)
    const percentStart = offsetStart * 100;
    const percentEnd = offsetEnd * 100;

    // Type assertion needed because rangeStart/rangeEnd are not yet in KeyframeAnimationOptions types
    const animationOptions = {
      fill: 'both' as const,
      timeline,
      easing: 'linear',
      ...options,
      duration: 'auto' as const,
      rangeStart: {
        rangeName: 'contain',
        offset: CSS.percent(percentStart),
      },
      rangeEnd: {
        rangeName: 'contain',
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
      return () => {};
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

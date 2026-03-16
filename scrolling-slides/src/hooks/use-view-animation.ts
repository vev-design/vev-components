import { useEditorState, useViewport } from '@vev/react';
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
  const { disabled: editorDisabled } = useEditorState();
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

    // Adjust for edge proximity.
    // The contain range may extend beyond the available scroll when the element
    // is near the page top or bottom. We switch to cover range and compute exact
    // scroll-position-to-percentage mappings so the animation fits the available scroll.
    //
    // For LARGE elements (taller than viewport):
    //   contain: [rootOffset, rootOffset + height - windowHeight]
    //   Near top when rootOffset < windowHeight (dead scroll before contain starts)
    //   Near bottom when element bottom is within windowHeight of page bottom
    //
    // For SMALL elements (shorter than viewport):
    //   contain: [rootOffset + height - windowHeight, rootOffset]
    //   Near top when rootOffset + height < windowHeight (contain starts at negative scroll)
    //   Near bottom when rootOffset > maxScroll (contain ends past max scroll)
    const parentRect = parent.getBoundingClientRect();
    const rootOffset = parentRect.top + window.scrollY;
    const parentHeight = parentRect.height;
    const containDist = parentHeight - windowHeight;
    const maxScroll = scrollHeight - windowHeight;
    let rangeName = 'contain';

    // Contain range scroll boundaries (works for both small and large elements)
    const containStartScroll = Math.min(rootOffset, rootOffset + containDist);
    const containEndScroll = Math.max(rootOffset, rootOffset + containDist);

    const nearTop = containDist > 0
      ? rootOffset > 0 && rootOffset < windowHeight
      : containStartScroll < 0;
    const nearBottom = containDist > 0
      ? (scrollHeight - (rootOffset + parentHeight)) > 0 &&
        (scrollHeight - (rootOffset + parentHeight)) < windowHeight
      : containEndScroll > maxScroll && maxScroll > 0;

    if ((nearTop || nearBottom) && containStartScroll !== containEndScroll) {
      const effectiveScrollStart = nearTop
        ? (containDist > 0 ? 0 : Math.max(0, containStartScroll))
        : containStartScroll;
      const effectiveScrollEnd = nearBottom
        ? (containDist > 0 ? maxScroll : Math.min(maxScroll, containEndScroll))
        : containEndScroll;
      const effectiveRange = effectiveScrollEnd - effectiveScrollStart;

      if (effectiveRange <= 0) {
        // No usable scroll range — skip animation, inline styles show initial state
        return;
      }

      // Switch to cover range — all percentages stay in valid 0-100% bounds.
      rangeName = 'cover';
      const coverStart = rootOffset - windowHeight;
      const coverDist = parentHeight + windowHeight;

      // Map slide offsets → scroll positions → cover percentages
      const scrollA = effectiveScrollStart + offsetStart * effectiveRange;
      const scrollB = effectiveScrollStart + offsetEnd * effectiveRange;
      offsetStart = (scrollA - coverStart) / coverDist;
      offsetEnd = (scrollB - coverStart) / coverDist;
    }

    // Calculate percentages
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
        rangeName,
        offset: CSS.percent(percentStart),
      },
      rangeEnd: {
        rangeName,
        offset: CSS.percent(percentEnd),
      },
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
    editorDisabled,
  ]);
}

import { useEditorState } from '@vev/react';
import { RefObject, useLayoutEffect, useRef } from 'react';

const SNAP_DELAY = 250;
const SCROLL_DEBOUNCE = 300;
const SCROLL_UNLOCK_DELAY = 200;

export function useSlideEditMode(
  hostRef: RefObject<HTMLDivElement>,
  children: string[],
  timeline?: ViewTimeline
): void {
  const {
    disabled,
    activeContentChild,
    onRequestActiveContentChange,
    onRequestScrollTop,
  } = useEditorState();

  const lastScrollY = useRef<number>(window.scrollY);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number>();

  // Store callbacks in a ref to avoid effect dependencies
  const callbacksRef = useRef({
    onRequestActiveContentChange,
    onRequestScrollTop,
  });
  callbacksRef.current = { onRequestActiveContentChange, onRequestScrollTop };

  // Track the previous state to handle external vs internal updates
  const prevStateRef = useRef({ disabled, activeContentChild });

  useLayoutEffect(() => {
    const element = hostRef.current;

    // Only run if we have all requirements and the editor is in the correct state
    if (!timeline || !element || !activeContentChild || !disabled) {
      prevStateRef.current = { disabled, activeContentChild };
      return;
    }

    const { clientHeight: hostHeight } = element;
    const { top: hostTop } = element.getBoundingClientRect();
    const absoluteTop = hostTop + window.scrollY;
    const windowHeight = window.innerHeight;

    // Calculate scroll boundaries
    // If the content is smaller than the viewport, we adjust the start position
    const isSmallerThanViewport = hostHeight < windowHeight;
    const scrollStart = isSmallerThanViewport
      ? absoluteTop - (windowHeight - hostHeight)
      : absoluteTop;

    const scrollEnd = isSmallerThanViewport
      ? absoluteTop
      : absoluteTop + hostHeight - windowHeight;

    const scrollRange = scrollEnd - scrollStart;

    const getTimelineProgress = () => {
      const currentTime = timeline.currentTime;
      if (!currentTime) return 0;
      // Handle CSSNumericValue which might be returned by timeline.currentTime
      const value =
        typeof currentTime === 'number'
          ? currentTime
          : (currentTime as any).value;
      return (value || 0) / 100;
    };

    const getSlideIndexFromProgress = () => {
      const progress = getTimelineProgress();
      // Map progress (0-1) to child index with some padding at start/end
      const paddedLength = children.length + 2;
      const rawIndex = Math.round(progress * paddedLength - 1.5);
      return Math.max(0, Math.min(children.length - 1, rawIndex));
    };

    const changeSlide = (index: number) => {
      const slideKey = children[index];
      // Update local ref so we know this change originated from here
      prevStateRef.current.activeContentChild = slideKey;
      callbacksRef.current.onRequestActiveContentChange?.(slideKey);
    };

    const onScrollAnimationFinished = () => {
      setTimeout(() => {
        isScrollingRef.current = false;
      }, SCROLL_UNLOCK_DELAY);
    };

    const scrollToSlide = (index: number = getSlideIndexFromProgress()) => {
      changeSlide(index);
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      const targetScrollY =
        scrollStart + (index * scrollRange) / (children.length - 1);

      isScrollingRef.current = true;
      callbacksRef.current.onRequestScrollTop?.(
        targetScrollY,
        SNAP_DELAY,
        onScrollAnimationFinished
      );
    };

    // Handle initial sync or external updates
    const prevActiveChild = prevStateRef.current.activeContentChild;
    
    if (!prevActiveChild) {
      // Initial mount: snap to the preferred slide based on current scroll
      scrollToSlide();
    } else if (prevActiveChild !== activeContentChild) {
      // External update: scroll to the new active child
      const index = children.indexOf(activeContentChild);
      if (index !== -1) {
        scrollToSlide(index);
      }
    }

    // Update ref to current props after handling sync
    prevStateRef.current = { disabled, activeContentChild };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      if (delta === 0) return;
      lastScrollY.current = currentScrollY;

      if (isScrollingRef.current) return;

      // Update active slide as we scroll
      changeSlide(getSlideIndexFromProgress());

      // Debounce snapping to the nearest slide
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToSlide(getSlideIndexFromProgress());
      }, SCROLL_DEBOUNCE);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [activeContentChild, disabled, children, timeline, hostRef]);
}

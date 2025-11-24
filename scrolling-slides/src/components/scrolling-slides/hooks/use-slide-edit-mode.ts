import { useEditorState } from '@vev/react';
import { MutableRefObject, RefObject, useLayoutEffect, useRef } from 'react';

const SNAP_TIME = 250;
const SCROLL_TIMEOUT = 300;

const getScrollProgress = (scrollAnimationStartPos: number, scrollAnimationEndPos: number) => {
  const scrollPositionInside = window.scrollY - scrollAnimationStartPos;
  const distance = scrollAnimationEndPos - scrollAnimationStartPos;
  const clampedScroll = Math.max(0, Math.min(distance, scrollPositionInside));
  return clampedScroll / distance;
};

/**
 * Determines the preferred slide index based on scroll position and direction.
 * - Calculates how far the element has been scrolled relative to its total scrollable distance.
 * - Uses scroll direction to round the index up or down.
 * - Clamps the index to valid range.
 */
const getPreferredSlideIndex = (scrollProgress: number, children: string[], dir: 1 | -1 | 0) => {
  console.log('Preffered scroll index ', scrollProgress, children.length, dir);
  // Depending on scroll direction, round index up or down
  const roundFn = dir === 1 ? Math.ceil : dir === -1 ? Math.floor : Math.round;
  const roundedIndex = roundFn(scrollProgress * children.length);

  // Clamp the index to the last slide
  const maxIndex = children.length - 1;
  return Math.min(maxIndex, roundedIndex);
};

export function useSlideEditMode(hostRef: RefObject<HTMLDivElement>, children: string[], timeline?:ViewTimeline): void {
  const { disabled, activeContentChild, onRequestActiveContentChange, onRequestScrollTop } =
    useEditorState();

  const prevScrollTop = useRef<number>(window.scrollY);
  const scrollDir = useRef<1 | -1 | 0>(1);

  const requestSlideChange = useRef<(slideKey: string) => void>();
  requestSlideChange.current = onRequestActiveContentChange;
  const requestScrollTop = useRef<(scrollTop: number, duration: number, onEnd?: () => void) => void>();
  requestScrollTop.current = onRequestScrollTop;

  const prevEditorState = useRef<{ disabled: boolean; activeContentChild: string }>({
    disabled: false,
    activeContentChild: '',
  });

  useLayoutEffect(() => {
    const el = hostRef.current;
    
    if (timeline && el && activeContentChild && disabled) {
      const ogHeight = el.clientHeight;
      // No need to pin position if content is smaller than viewport
      const { top } = el.getBoundingClientRect();

      const originalOffsetTop = top + window.scrollY;
      const winHeight = window.innerHeight;
      const scrollAnimationStartPos =
        ogHeight < winHeight ? originalOffsetTop - (winHeight - ogHeight) : originalOffsetTop;
      const scrollAnimationEndPos =
        ogHeight < winHeight ? originalOffsetTop : originalOffsetTop + ogHeight - winHeight;
      let scrollTimeout: any;
      let disableScroll = false;

      const getProgress = () => {
        const currentTime = timeline?.currentTime;
        if (!currentTime) return 0;
        const value = typeof currentTime === 'number' ? currentTime : (currentTime as any).value;
        return (value || 0) / 100;
      };

      const getIndex = () => {
        const progress = getProgress();
        //const dir = scrollDir.current || 0;
        //const roundFn = dir === 1 ? Math.ceil : dir === -1 ? Math.floor : Math.round;
        
        const childLenght = children.length + 2;
        const indexWithPading = Math.round(progress * childLenght - 1.5);
        const index = Math.max(0, Math.min((children.length- 1), indexWithPading));
        return index;
      }
      const handleScrollFinished = () => {
        setTimeout(() => (disableScroll = false), 200);
        clearTimeout(scrollTimeout);
      };

      const scrollToPreferred = (
        index: number = getIndex()
      ) => {
        changeToSlide(index);
        clearTimeout(scrollTimeout);
        

        const distance = scrollAnimationEndPos - scrollAnimationStartPos;
        const scrollPos = scrollAnimationStartPos + (index * distance) / (children.length - 1);

        disableScroll = true;
        requestScrollTop.current?.(scrollPos, SNAP_TIME, handleScrollFinished);
      };

      const changeToSlide = (index: number) => {
        const slideKey = children[index];
        prevEditorState.current.activeContentChild = slideKey;
        requestSlideChange.current?.(slideKey);
      }

      // When going into edit mode, scroll to the active content
      if (!prevEditorState.current.activeContentChild) {
        scrollToPreferred();
      } else if (prevEditorState.current.activeContentChild !== activeContentChild) {
        scrollToPreferred(children.indexOf(activeContentChild));
      }

      prevEditorState.current = { disabled, activeContentChild };

      const update = () => {
        const newScrollTop = window.scrollY;
        const diff = newScrollTop - prevScrollTop.current;
        if(!diff) return;

        scrollDir.current = Math.sign(diff) as 1 | -1;
        prevScrollTop.current = newScrollTop;
        if (disableScroll) return;
        changeToSlide(getIndex());

        clearTimeout(scrollTimeout);
       scrollTimeout = setTimeout(() => scrollToPreferred(), SCROLL_TIMEOUT);
      };
      window.addEventListener('scroll', update);

      return () => {
        clearTimeout(scrollTimeout);
        window.removeEventListener('scroll', update);
      };
    } else {
      scrollDir.current = 0;
      prevEditorState.current = { disabled, activeContentChild };
    }
  }, [activeContentChild, disabled, children, timeline]);
}

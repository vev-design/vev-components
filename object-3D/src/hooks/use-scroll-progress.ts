import { MutableRefObject, RefObject, useEffect, useRef } from 'react';

export type ScrollTarget = 'page' | 'section' | 'element';

/**
 * Tracks scroll progress (0-1) of a target element relative to the viewport.
 * Returns a ref to avoid re-renders on every scroll event.
 */
export function useScrollProgress(
  hostRef: RefObject<HTMLDivElement> | undefined,
  enabled: boolean,
  scrollTarget: ScrollTarget = 'section',
): MutableRefObject<number> {
  const progressRef = useRef(0);

  useEffect(() => {
    if (!enabled || !hostRef?.current) return;

    const host = hostRef.current;

    const getSubject = (): HTMLElement => {
      switch (scrollTarget) {
        case 'page':
          return document.documentElement;
        case 'section':
          return (host.closest('.__section') as HTMLElement) || host;
        case 'element':
        default:
          return host;
      }
    };

    const subject = getSubject();

    const update = () => {
      if (scrollTarget === 'page') {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progressRef.current = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
      } else {
        const rect = subject.getBoundingClientRect();
        const vh = window.innerHeight;
        // "cover" range: 0 when element bottom enters viewport, 1 when element top exits
        const raw = (vh - rect.top) / (vh + rect.height);
        progressRef.current = Math.max(0, Math.min(1, raw));
      }
    };

    update();

    // Find the nearest scrollable ancestor
    let scrollEl: HTMLElement | Window = window;
    let parent = host.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (
        ['auto', 'scroll'].includes(style.overflow) ||
        ['auto', 'scroll'].includes(style.overflowY)
      ) {
        scrollEl = parent;
        break;
      }
      parent = parent.parentElement;
    }

    scrollEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    return () => {
      scrollEl.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled, scrollTarget, hostRef]);

  return progressRef;
}

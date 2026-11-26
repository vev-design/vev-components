import { RefObject, useEffect } from 'react';

/**
 * Vev image widgets render `<img loading="lazy">`. The browser does not fetch a lazy image
 * until it is near the viewport, so the slide that moves into view during a transition starts
 * its download mid-animation and shows blank for a moment.
 *
 * When the slider is near the viewport, switch every image inside it to `loading="eager"`.
 * The browser then fetches the slides in the render window (`slidesToLoad` before/after)
 * before they become visible. A MutationObserver catches slides mounted on later changes.
 */
export function useEagerImages(ref: RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const makeEager = () => {
      el.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
        img.loading = 'eager';
      });
    };

    let mutationObserver: MutationObserver | undefined;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        intersectionObserver.disconnect();
        makeEager();
        mutationObserver = new MutationObserver(makeEager);
        mutationObserver.observe(el, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['loading'],
        });
      },
      { rootMargin: '100% 0px' },
    );
    intersectionObserver.observe(el);

    return () => {
      intersectionObserver.disconnect();
      mutationObserver?.disconnect();
    };
  }, [ref, enabled]);
}

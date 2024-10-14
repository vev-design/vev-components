import { RefObject, useLayoutEffect } from 'react';

export function useSlideEditMode(
  hostRef: RefObject<HTMLDivElement>,
  disabled: boolean,
  showSlideKey?: string,
): void {
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (el && showSlideKey && disabled) {
      const ogHeight = el.clientHeight;
      // No need to pin position if content is smaller than viewport
      if (ogHeight < window.innerHeight) return;

      const originalOffsetTop = el.getBoundingClientRect().top + window.scrollY;
      const update = () => {
        el.style.marginTop = window.scrollY - originalOffsetTop + 'px';
        // hack to force editor to update frame
        el.style.height = `${ogHeight + Math.random()}px`;
      };
      window.addEventListener('scroll', update);
      update();
      return () => {
        window.removeEventListener('scroll', update);
        el.style.removeProperty('height');
        el.style.removeProperty('margin-top');
      };
    }
  }, [showSlideKey, disabled]);
}

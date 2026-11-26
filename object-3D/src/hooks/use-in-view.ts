import { useEffect, useState } from 'react';

/**
 * True while `element` is within `rootMargin` of the viewport.
 * With `once`, the value stays true after the element came into view the first time.
 */
export function useInView(element: Element | null, rootMargin = '0px', once = false) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (once && entry.isIntersecting) observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [element, rootMargin, once]);

  return inView;
}

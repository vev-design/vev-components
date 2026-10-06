import { useCallback, useEffect, useRef } from 'react';

// Grace period after the transition duration before we stop waiting for `transitionend`
const FALLBACK_DELAY = 100;

/**
 * Calls `onEnd` once a slide transition has finished.
 * `transitionend` is not enough on its own: if the slider is hidden (e.g. inside an inactive tab)
 * the browser cancels the transition or never runs it, and the slider would wait forever.
 * `start` arms a fallback timeout, `end` finishes early when `transitionend` fires.
 */
export function useTransitionEnd(onEnd: () => void) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const timeout = useRef<number>();

  const end = useCallback(() => {
    if (timeout.current === undefined) return;
    clearTimeout(timeout.current);
    timeout.current = undefined;
    onEndRef.current();
  }, []);

  const start = useCallback(
    (duration: number) => {
      clearTimeout(timeout.current);
      timeout.current = self.setTimeout(end, duration + FALLBACK_DELAY);
    },
    [end],
  );

  useEffect(() => () => clearTimeout(timeout.current), []);

  return { start, end };
}

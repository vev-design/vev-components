/**
 * Calculate scroll progress based on element's position relative to viewport.
 * Progress is 0 when element's top enters the viewport bottom,
 * and 1 when element's bottom exits the viewport top.
 */
export const computeInViewProgress = (
  el: HTMLElement | null,
  scrollTop: number,
  viewportHeight: number,
): number => {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const elementTop = rect.top + scrollTop;
  const elementHeight = rect.height || el.offsetHeight || 0;
  const viewportBottom = scrollTop + viewportHeight;
  // Progress is 0 when the element's top is at viewportBottom (just entering),
  // and 1 when the element's bottom is at viewportTop (just exiting).
  const distance = elementHeight + viewportHeight;
  if (!distance) return 0;
  return (viewportBottom - elementTop) / distance;
};

/**
 * Calculate scroll progress when element reaches top of viewport.
 * Progress is 0 when element enters viewport bottom,
 * and 1 when element reaches viewport top.
 */
export const computeWidgetProgress = (
  element: HTMLElement | null,
  scrollTop: number,
  viewportHeight: number,
): number => {
  const offsetTop = element?.offsetTop || 0;
  return (scrollTop - offsetTop + viewportHeight) / viewportHeight;
};

/**
 * Calculate scroll progress based on offset values.
 */
export const computeOffsetProgress = (
  scrollTop: number,
  scrollOffsetStart: number,
  scrollHeight: number,
  viewportHeight: number,
  scrollOffsetStop: number,
): number => {
  return (
    (scrollTop - scrollOffsetStart) /
    (scrollHeight - scrollOffsetStart - viewportHeight - scrollOffsetStop)
  );
};

/**
 * Clamp a value between 0 and 1.
 */
export const clampProgress = (progress: number): number => {
  if (progress < 0) return 0;
  if (progress > 1) return 1;
  return progress;
};

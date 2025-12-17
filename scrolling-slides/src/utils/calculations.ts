export function calculateScrollAnimationOffset(el: HTMLElement): {
  startPosition: number;
  endPosition: number;
  offsetStart: number;
  offsetEnd: number;
} {
  const { top, height } = el.getBoundingClientRect();
  const rootOffset = top + window.scrollY;
  const windowHeight = window.innerHeight;
  const scrollHeight = document.documentElement.scrollHeight;

  let offsetStart = 0;
  let offsetEnd = 1;
  let startPosition = 0;
  let endPosition = 0;

  // If element is smaller than viewport
  if (height < windowHeight) {
    // Scroll animation starts when it is fully inside the viewport, and ends when it hits the top of the viewport
    const durationHeight = windowHeight - height;
    startPosition = rootOffset - durationHeight;
    endPosition = rootOffset;
    // If start position is less than 0 means it starts before the viewport
    if (startPosition < 0) {
      offsetStart = (-1 * startPosition) / durationHeight;
      endPosition = durationHeight + startPosition;
      startPosition = 0;
    }
    if (endPosition > scrollHeight - windowHeight) {
      offsetEnd = 1 - (endPosition - scrollHeight + windowHeight) / durationHeight;
      endPosition = scrollHeight - windowHeight;
    }
  } else {
    startPosition = rootOffset;
    endPosition = rootOffset + height - windowHeight;
  }

  return {
    startPosition,
    endPosition,
    offsetStart,
    offsetEnd,
  };
}

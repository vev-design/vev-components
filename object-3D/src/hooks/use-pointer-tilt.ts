import { MutableRefObject, useEffect, useRef } from 'react';

export interface PointerOffset {
  x: number;
  y: number;
}

/**
 * Tracks the mouse position relative to `element`, from -1 to 1 on each axis.
 * The range covers the full window, so the model follows the cursor anywhere on the page.
 * Returns a ref to avoid re-renders on every pointer move.
 */
export function usePointerTilt(
  element: HTMLElement | null,
  enabled: boolean,
): MutableRefObject<PointerOffset> {
  const offset = useRef<PointerOffset>({ x: 0, y: 0 });

  useEffect(() => {
    offset.current = { x: 0, y: 0 };
    if (!enabled || !element) return;

    const clamp = (value: number) => Math.max(-1, Math.min(1, value));

    const onMove = (event: PointerEvent) => {
      // A touch has no hover position, so tilt would only jump on each tap
      if (event.pointerType === 'touch') return;
      const rect = element.getBoundingClientRect();
      offset.current = {
        x: clamp((event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)),
        y: clamp((event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)),
      };
    };

    const onLeave = () => {
      offset.current = { x: 0, y: 0 };
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [element, enabled]);

  return offset;
}

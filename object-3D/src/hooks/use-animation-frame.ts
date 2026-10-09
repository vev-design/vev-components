import { useCallback, useLayoutEffect, useRef } from 'react';

type AnimationCallback = (args: { delta: number; frameCount: number }) => void;

// A long pause (hidden tab, scrolled away) must not make animations jump
const MAX_DELTA = 0.1;

// Cannot use the one provided by the viewer here as the 3D component is used both in the editor and the viewer
export function useAnimationFrame(cb: AnimationCallback, enabled = false) {
  const cbRef = useRef<AnimationCallback>(cb);
  const frame = useRef<number | undefined>(undefined);
  const frameCount = useRef(0);
  const last = useRef(0);

  cbRef.current = cb;

  const animate = useCallback((now: number) => {
    frameCount.current = frameCount.current + 1;
    cbRef.current({
      frameCount: frameCount.current,
      delta: Math.min((now - last.current) / 1000, MAX_DELTA),
    });
    last.current = now;
    frame.current = requestAnimationFrame(animate);
  }, []);

  useLayoutEffect(() => {
    if (enabled) {
      last.current = performance.now();
      frame.current = requestAnimationFrame(animate);
      return () => frame.current && cancelAnimationFrame(frame.current);
    }
  }, [animate, enabled]);
}

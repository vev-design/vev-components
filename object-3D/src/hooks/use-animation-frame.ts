import { useCallback, useLayoutEffect, useRef } from 'react';

type AnimationCallback = (args: { delta: number; frameCount: number }) => void;

// Cannot use the one provided by the viewer here as the 3D component is used both in the editor and the viewer
export function useAnimationFrame(cb: AnimationCallback, enabled = false) {
  const cbRef = useRef<AnimationCallback>();
  const frame = useRef<number>();
  const frameCount = useRef(0);
  const last = useRef(performance.now());

  cbRef.current = cb;

  const animate = useCallback((now: number) => {
    cbRef.current({
      frameCount: frameCount.current + 1,
      delta: (now - last.current) / 1000,
    });
    last.current = now;
    frameCount.current = frameCount.current + 1;
    frame.current = requestAnimationFrame(animate);
  }, []);

  useLayoutEffect(() => {
    if (enabled) {
      frame.current = requestAnimationFrame(animate);
      return () => frame.current && cancelAnimationFrame(frame.current);
    }
  }, [animate, enabled]);
}

import { useCallback, useLayoutEffect, useRef } from 'react';

type AnimationCallback = (args: { time: number; delta: number }) => void;

// Cannot use the one provided by the viewer here as the 3D component is used both in the editor and the viewer
export function useAnimationFrame(cb: AnimationCallback) {
  const cbRef = useRef<AnimationCallback>();
  const frame = useRef<number>();
  const init = useRef(performance.now());
  const last = useRef(performance.now());

  cbRef.current = cb;

  const animate = useCallback((now: number) => {
    cbRef.current({
      time: (now - init.current) / 1000,
      delta: (now - last.current) / 1000,
    });
    last.current = now;
    frame.current = requestAnimationFrame(animate);
  }, []);

  useLayoutEffect(() => {
    frame.current = requestAnimationFrame(animate);
    return () => frame.current && cancelAnimationFrame(frame.current);
  }, [animate]);
}

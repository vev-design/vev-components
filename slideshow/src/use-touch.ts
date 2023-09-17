import { useEffect, RefObject, useState } from "react";

const getX = (e) => e.touches[0].clientX;

export function useTouch(ref: RefObject<HTMLElement>, cb) {
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const handleTouchStart = (e) => {
      setDragging(true);
      setX(getX(e));
    };

    const handleTouchEnd = (e) => {
      setDragging(false);
      setX(0);
    };

    const handleTouch = (e) => {
      if (!dragging) return;

      if (getX(e) < x - 100) {
        cb.onNext();
        setDragging(false);
      }

      if (getX(e) > x + 100) {
        cb.onPrev();
        setDragging(false);
      }
    };

    ref.current.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    ref.current.addEventListener("touchend", handleTouchEnd, { passive: true });
    ref.current.addEventListener("touchmove", handleTouch, { passive: true });

    return () => {
      if (!ref.current) return;
      ref.current.removeEventListener("touchstart", handleTouchStart);
      ref.current.removeEventListener("touchend", handleTouchEnd);
      ref.current.removeEventListener("touchmove", handleTouch);
    };
  }, [ref, dragging, cb, x]);
}

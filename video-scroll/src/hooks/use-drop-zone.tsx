import { MutableRefObject, RefObject, useEffect, useRef } from 'react';

export function useCallbackRef<T>(cb: T): MutableRefObject<T> {
  const ref = useRef<T>(cb);
  ref.current = cb;
  return ref;
}

function preventDefault(e: Event) {
  e.preventDefault();
}

function preventDragDefault(el: HTMLElement) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((e) =>
    el.addEventListener(e, preventDefault),
  );
}

export function useDropZone(
  target: RefObject<HTMLElement>,
  onDrop: (e: DragEvent) => void,
  onEnter?: (e: DragEvent) => void,
  onLeave?: (e: DragEvent) => void,
) {
  const dropRef = useCallbackRef(onDrop);
  const enterRef = useCallbackRef(onEnter);
  const leaveRef = useCallbackRef(onLeave);
  useEffect(() => {
    const el = target.current;
    if (el) {
      let eventTarget: EventTarget | null;
      preventDragDefault(el);
      const onEnter = (e: DragEvent) => {
        if (eventTarget === e.target) return null;
        eventTarget = e.target;

        e.stopPropagation();
        e.preventDefault();
        if (enterRef.current) enterRef.current(e);
      };
      const onLeave = (e: DragEvent) => {
        if (leaveRef.current && e.target === eventTarget) {
          eventTarget = null;
          e.stopPropagation();
          e.preventDefault();
          leaveRef.current(e);
        }
      };
      const onDrop = (e: DragEvent) => {
        eventTarget = null;
        e.stopPropagation();
        e.preventDefault();
        if (dropRef.current) dropRef.current(e);
      };
      el.addEventListener('dragenter', onEnter);
      el.addEventListener('dragover', onEnter);
      el.addEventListener('dragleave', onLeave);
      el.addEventListener('drop', onDrop);
      return () => {
        el.removeEventListener('dragenter', onEnter);
        el.removeEventListener('dragover', onEnter);
        el.removeEventListener('dragleave', onLeave);
        el.removeEventListener('drop', onDrop);
      };
    }
  }, [target, dropRef, enterRef, leaveRef]);
}
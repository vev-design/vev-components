import { RefObject, useEffect, useState } from "react";

type ViewTimelineOptions = {
  axis: 'block' | 'inline';
  subject: HTMLElement;
};

declare global {
  class ViewTimeline extends AnimationTimeline {
    constructor(options: ViewTimelineOptions);
  }
}


export function useViewTimeline(
  sourceRef: RefObject<HTMLElement>,
  disabled?: boolean,
): ViewTimeline | undefined {
  const [timeline, setTimeline] = useState<any>();
  const el = sourceRef.current;
  useEffect(() => {
    if (!el || disabled) return;

    // Note: Polyfill is loaded by the wrapper app
    // There's a known issue with the polyfill causing "non-finite" errors in Safari
    // See: https://github.com/flackr/scroll-timeline/issues/205

    // Ensure element is connected to DOM before creating timeline
    if (!el.isConnected) return;

    try {
      setTimeline(
        new ViewTimeline({
          axis: "block",
          subject: el,
          
        })
      );
    } catch (error) {
      console.error('[useViewTimeline] Error creating ViewTimeline:', error);
    }
  }, [el, disabled]);

  return timeline;
}

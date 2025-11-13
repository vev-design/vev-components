export enum AnimationType {
  scroll = 'scroll',
  visible = 'visible',
  hover = 'hover',
}

export type TimelineRange = 'entry-crossing' | 'exit-crossing' | 'entry' | 'exit';

export type AnimationKeyframe = {
  offset?: number;
  translate?: string;
  opacity?: string;
  clipPath?: string;
  rotate?: string;
  scale?: string;
  color?: string;
  backgroundColor?: string;
};
export type VevAnimation = {
  type: AnimationType;
  duration?: string;
  delay?: string;
  easing?: string;
  start?: TimelineRange;
  startOffset?: number;
  end?: TimelineRange;
  endOffset?: number;
  keyframes: AnimationKeyframe[];
};

export function createCSSKeyframe(keyframe: AnimationKeyframe): Keyframe {
  const result: Keyframe = {};
  if (typeof keyframe.offset === 'number') result.offset = keyframe.offset;
  for (const key in keyframe) {
    if (key === 'offset') continue;
    result[key] = keyframe[key as keyof AnimationKeyframe] as string;
  }
  return result;
}

const willChangeAttr: Record<keyof AnimationKeyframe, string | false> = {
  offset: false,
  translate: 'translate',
  opacity: 'opacity',
  clipPath: 'clip-path',
  rotate: 'rotate',
  scale: 'scale',
  color: 'color',
  backgroundColor: 'background-color',
};

export function getWillChange(keyframes: AnimationKeyframe[]): string[] {
  const result: string[] = [];
  for (const keyframe of keyframes) {
    for (const key in keyframe) {
      const willChange = willChangeAttr[key as keyof AnimationKeyframe];
      if (willChange && !result.includes(willChange)) result.push(willChange);
    }
  }
  return result;
}

const OFFSET_RANGE = 0.5;

export function listenForAnimationRange(
  el: HTMLElement,
  rangeName: string,
  offset: number,
  viewTimeline: ViewTimeline,
  cb: () => void,
) {
  // Validate element is actually an Element instance (fixes getComputedStyle error in polyfill)
  if (!(el instanceof Element) || !el.isConnected) {
    return () => { };
  }

  if (offset === 1) offset -= OFFSET_RANGE;

  try {
    // Type assertion needed because rangeStart/rangeEnd are not yet in KeyframeAnimationOptions types
    const animationOptions = {
      duration: 1,
      timeline: viewTimeline,
      rangeStart: `${rangeName} ${offset * 100}%`,
      rangeEnd: `${rangeName} ${(offset + OFFSET_RANGE) * 100}%`,
    } as any;

    const animation = el.animate({ opacity: [0, 1] }, animationOptions);

    animation.onfinish = cb;

    return () => {
      try {
        animation.cancel();
      } catch (error) {
        // Silently handle polyfill errors
      }
    };
  } catch (error) {
    // Polyfill errors are caught but can't be fixed from here
    return () => { };
  }
}

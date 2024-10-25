import React, { useRef } from 'react';
import { useViewAnimation } from '../../../hooks';
import styles from '../ScrollingSlide.module.css';
import { BaseSlide, BaseSlideProps } from './BaseSlide';

type AnimatedSlideProps = BaseSlideProps & {
  keyframes: Keyframe[];
};

export function AnimatedSlide({
  id,
  selected,
  index,
  slideCount,
  timeline,
  settings,
  disabled,
  keyframes,
  style,
  transitionOut,
}: AnimatedSlideProps) {
  const ref = useRef<HTMLDivElement>(null);
  let cl = styles.content;
  if (selected) cl += ' ' + styles.selected;
  const transitionCount = slideCount - 1;
  let fromOffset = (index - 1) / transitionCount;
  let toOffset = index / transitionCount;
  const offsetRange = toOffset - fromOffset;
  let disableAnimation = index === 0;
  if (settings?.reverse) {
    disableAnimation = index === slideCount - 1;
    keyframes = keyframes.slice().reverse();

    fromOffset = index / transitionCount;
    toOffset = (index + 1) / transitionCount;
  }

  if (transitionOut && index < transitionCount) {
    disableAnimation = false;
    toOffset = (index + 1) / transitionCount;
    if (index === 0) {
      fromOffset = fromOffset + (toOffset - fromOffset) / 2;
      keyframes = keyframes.slice().reverse();
    } else if (index < transitionCount) {
      keyframes = [...keyframes, ...keyframes.slice().reverse()];
    }
  }

  if (settings?.offsetStart) {
    const offsetSize = offsetRange * settings.offsetStart;
    fromOffset = Math.max(0, Math.min(1, fromOffset - offsetSize));
  }

  useViewAnimation(
    ref,
    keyframes,
    timeline,
    selected || disableAnimation,
    {
      easing: settings?.easing || 'linear',
    },
    fromOffset,
    toOffset,
  );
  return (
    <BaseSlide
      ref={ref}
      id={id}
      selected={selected}
      index={index}
      slideCount={slideCount}
      timeline={timeline}
      settings={settings}
      disabled={disabled}
      style={{ ...style, ...(keyframes[0] as any) }}
    />
  );
}

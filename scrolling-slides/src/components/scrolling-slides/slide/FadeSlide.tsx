import React from 'react';
import { AnimatedSlide } from './AnimatedSlide';
import { BaseSlideProps } from './BaseSlide';

export function FadeSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const isFadeOut = !!s?.fadeDirection;
  const fadeOut = !!s?.fadeOut;
  const blur = s?.blur || 0;
  const zoom = s?.scale || 0;
  const zoomIn = 1 + zoom;
  const zoomOut = 1 / zoomIn;

  if (isFadeOut) {
    // Outgoing slide fades out to reveal the next slide underneath.
    // reverse: outgoing slide animates + gets higher z-index (stays in front).
    const keyframes: Keyframe[] = [
      { opacity: '0', scale: `${zoomOut}`, filter: `blur(${blur}px)` },
      { opacity: '1', scale: '1', filter: 'blur(0px)' },
    ];

    // "With fade in": incoming slide also fades in
    const keyframesOutReversed: Keyframe[] = [
      { opacity: '1', scale: '1', filter: 'blur(0px)' },
      { opacity: '0', scale: `${zoomIn}`, filter: `blur(${blur}px)` },
    ];

    const reversedTransition = {
      ...transition,
      transitionIn: transition.transitionIn
        ? { ...transition.transitionIn, settings: { ...transition.transitionIn.settings, reverse: true } }
        : transition.transitionIn,
      transitionOut: transition.transitionOut
        ? { ...transition.transitionOut, settings: { ...transition.transitionOut.settings, reverse: true } }
        : transition.transitionOut,
    };

    return (
      <AnimatedSlide
        {...rest}
        transition={reversedTransition}
        keyframes={keyframes}
        keyframesOut={fadeOut ? keyframesOutReversed : undefined}
      />
    );
  }

  // Fade in: incoming starts zoomed in (bigger) and settles to normal.
  const keyframesIn: Keyframe[] = [
    { opacity: '0', scale: `${zoomIn}`, filter: `blur(${blur}px)` },
    { opacity: '1', scale: '1', filter: 'blur(0px)' },
  ];

  // "With fade out": outgoing slide shrinks away.
  const keyframesOut: Keyframe[] = [
    { opacity: '1', scale: '1', filter: 'blur(0px)' },
    { opacity: '0', scale: `${zoomOut}`, filter: `blur(${blur}px)` },
  ];

  return (
    <AnimatedSlide
      {...rest}
      transition={transition}
      keyframes={keyframesIn}
      keyframesOut={fadeOut ? keyframesOut : undefined}
    />
  );
}

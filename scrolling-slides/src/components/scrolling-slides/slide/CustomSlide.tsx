import React, { useMemo } from 'react';
import { BaseSlideProps } from './BaseSlide';
import { AnimatedSlide } from './AnimatedSlide';

function dashToCamelCase(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

export function CustomSlide({ transition, ...rest }: BaseSlideProps) {
  const s = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
  const keyframes = useMemo(() => {
    if (!s?.keyframes) return [{ opacity: '0' }, { opacity: '1' }];
    const frames = s.keyframes;
    const keyframes: Keyframe[] = [];
    for (const { style } of frames) {
      const css: Keyframe = {};
      const attrs = style.split(';') as string[];
      for (const attr of attrs) {
        const [key, value] = attr.split(':');
        if (!key?.trim() || !value?.trim()) continue;
        css[dashToCamelCase(key.trim())] = value.trim();
      }

      keyframes.push(css);
    }

    return keyframes;
  }, [s?.keyframes]);

  return <AnimatedSlide {...rest} transition={transition} keyframes={keyframes} />;
}

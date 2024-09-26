import React, { useMemo } from 'react';
import { BaseSlideProps } from './BaseSlide';
import { AnimatedSlide } from './AnimatedSlide';

function dashToCamelCase(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

type CustomSlideProps = BaseSlideProps;

export function CustomSlide({ settings, ...rest }: CustomSlideProps) {
  const keyframes = useMemo(() => {
    if (!settings?.keyframes) return [{ opacity: '0' }, { opacity: '1' }];
    const frames = settings.keyframes;
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
  }, [settings?.keyframes]);

  return <AnimatedSlide {...rest} settings={settings} keyframes={keyframes} />;
}

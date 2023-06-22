import React, { useEffect, useState, useRef, useMemo } from 'react';
import { registerVevComponent, useHover, useModel, useScrollTop, useVisible } from '@vev/react';
import LottieWeb from 'lottie-web';
import { colorify, getColors } from 'lottie-colorify';
import { File, LottieColor, LottieColorReplacement } from './types';
import defaultSettings from './constants/defaultSettings';
import defaultAnimation from './constants/defaultAnimation';
import ColorPicker from './components/ColorPicker';

import styles from './Lottie.module.css';

type Props = {
  file: File;
  trigger: 'visible' | 'hover' | 'click' | 'scroll';
  hostRef: React.RefObject<HTMLDivElement>;
  loop: boolean;
  speed: number;
  colors: LottieColorReplacement[];
  offsetStart?: number;
  offsetStop?: number;
};

const Lottie = ({
  file,
  trigger,
  hostRef,
  loop = true,
  speed = 1,
  colors,
  offsetStart = 0,
  offsetStop = 0,
}: Props) => {
  const model = useModel();
  const lottieRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isVisible = useVisible(canvasRef);
  const scrollTop = useScrollTop(true);

  const [json, setJson] = useState();
  const [lottieColors, setLottieColors] = useState<LottieColor[]>([]);
  const [isHovering, bindHover] = useHover();

  const path = (file && file.url) || defaultAnimation;
  const autoplay = trigger === 'visible' && isVisible;

  const colorOverrides = useMemo(() => {
    return lottieColors.map((lc) => {
      const match = colors?.find((c) => String(c.oldColor) === String(lc));
      return match ? match.newColor : lc;
    });
  }, [JSON.stringify(colors)]);

  // Fetch json data when file url changes
  useEffect(() => {
    const fetchJson = async () => {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const result = await response.json();
          setJson(result);

          const colors = getColors(result);
          setLottieColors(colors);
        }
      } catch (e) {
        setJson(undefined);
      }
    };

    fetchJson();
  }, [path]);

  // Initial setup
  useEffect(() => {
    const settings: any = {
      ...defaultSettings,
      animationData: colorOverrides && json && colorify(colorOverrides, json),
      container: canvasRef.current,
      autoplay,
      loop,
    };

    lottieRef.current = LottieWeb.loadAnimation(settings);
    if (speed !== 1) lottieRef.current.setSpeed(speed);

    return () => {
      if (lottieRef.current) {
        lottieRef.current.destroy();
      }
    };
  }, [json, colorOverrides, loop, autoplay]);

  // Listen for speed changes
  useEffect(() => {
    if (!lottieRef.current) return;

    lottieRef.current.setSpeed(speed);
  }, [speed]);

  // Hover trigger
  useEffect(() => {
    if (!lottieRef.current || trigger !== 'hover') return;

    if (isHovering) {
      lottieRef.current.play();
    } else {
      lottieRef.current.pause();
    }
  }, [isVisible, isHovering, lottieRef]);

  // Scroll trigger
  useEffect(() => {
    if (!lottieRef.current || !canvasRef.current || !hostRef.current || trigger !== 'scroll')
      return;

    if (lottieRef.current.totalFrames) {
      let percent = scrollTop;
      if (!hostRef.current.classList.contains('__f') && isVisible) {
        const rect = canvasRef.current.getBoundingClientRect();
        percent =
          (rect.top + offsetStart + rect.height) / (window.innerHeight + rect.height + offsetStop);
      } else {
        percent = 1 - scrollTop;
      }
      lottieRef.current.goToAndStop(
        (lottieRef.current.totalFrames / lottieRef.current.frameRate) * 1000 * (1 - percent),
      );
    }
  }, [scrollTop]);

  // Click listener
  const onClick = () => {
    if (!lottieRef.current) return;

    if (trigger === 'click') {
      lottieRef.current[lottieRef.current.isPaused ? 'play' : 'pause']();
    }
  };

  return (
    <>
      <div
        data-lottie-id={model.key}
        className={styles.wrapper}
        ref={canvasRef}
        onClick={onClick}
        {...bindHover}
      />
    </>
  );
};

registerVevComponent(Lottie, {
  name: 'Lottie Animation',
  events: [],
  props: [
    {
      name: 'file',
      title: 'Lottie file',
      type: 'upload',
      accept: 'application/json',
      description: 'JSON file exported from After Effects with Bodymovin',
    },
    {
      name: 'trigger',
      title: 'Trigger',
      type: 'select',
      initialValue: 'visible',
      options: {
        display: 'radio',
        items: [
          { label: 'Play when visible', value: 'visible' },
          { label: 'Play on hover', value: 'hover' },
          { label: 'Play on click', value: 'click' },
          { label: 'Play on scroll', value: 'scroll' },
        ],
      },
    },
    {
      name: 'offsetStart',
      type: 'number',
      title: 'Offset top',
      description:
        'If you want the animation to start before it is in view, add a pixel value for this offset.',
      initialValue: 0,
      hidden: (context) => context?.value?.trigger !== 'scroll',
    },
    {
      name: 'offsetStop',
      type: 'number',
      title: 'Offset bottom',
      description:
        'If you want the animation to end before it leaves the view, add a pixel value for this offset.',
      initialValue: 0,
      hidden: (context) => context?.value?.trigger !== 'scroll',
    },
    {
      name: 'loop',
      title: 'Loop',
      type: 'boolean',
      initialValue: true,
      hidden: (context) => context?.value?.trigger === 'scroll',
    },
    {
      name: 'speed',
      title: 'Speed',
      type: 'number',
      initialValue: 1,
      options: {
        display: 'slider',
        min: -2,
        max: 2,
      },
      hidden: (context) => context?.value?.trigger === 'scroll',
    },
    {
      name: 'colors',
      title: 'Colors',
      type: 'array',
      of: 'string',
      component: ColorPicker,
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background'],
    },
  ],
  type: 'both',
});

export default Lottie;

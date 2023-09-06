import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useHover,
  useModel,
  useScrollTop,
  useVevEvent,
  useVisible
} from '@vev/react';
import LottieWeb, {AnimationConfigWithData, AnimationItem} from 'lottie-web';
import {colorify, getColors} from 'lottie-colorify';
import {File, LottieColor, LottieColorReplacement} from './types';
import defaultSettings from './constants/defaultSettings';
import defaultAnimation from './constants/defaultAnimation';
import ColorPicker from './components/ColorPicker';

import styles from './Lottie.module.css';
import SpeedSlider from './components/SpeedSlider';
import {Events, Interactions} from "./events";

type Props = {
  file: File;
  trigger: 'visible' | 'hover' | 'click' | 'scroll' | 'never';
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
  const lottieRef = useRef<AnimationItem | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isVisible = useVisible(canvasRef);
  const scrollTop = useScrollTop(true);
  const dispatchVevEvent = useDispatchVevEvent();

  const [json, setJson] = useState();
  const [lottieColors, setLottieColors] = useState<LottieColor[]>([]);
  const [isHovering, bindHover] = useHover();

  const path = (file && file.url) || defaultAnimation;
  const autoplay = trigger === 'visible' && isVisible;
  const colorsChanged = JSON.stringify({ lottieColors, colors });

  const colorOverrides = useMemo(() => {
    return lottieColors.map((lc) => {
      const match = colors?.find((c) => String(c.oldColor) === String(lc));
      return match ? match.newColor : lc;
    });
  }, [colorsChanged]);

  useVevEvent(Interactions.PLAY, () => {
    if(lottieRef.current) {
      lottieRef.current.play();
    }
  });

  useVevEvent(Interactions.PAUSE, () => {
    if(lottieRef.current) {
      lottieRef.current.pause();
    }
  })

  useVevEvent(Interactions.TOGGLE, () => {
    if(lottieRef.current) {
      if(lottieRef.current.isPaused) {
        lottieRef.current?.play()
      } else {
        lottieRef.current?.pause()
      }
    }
  })

  useVevEvent(Interactions.RESET_ANIMATION, () => {
    if(lottieRef.current) {
      lottieRef.current?.goToAndPlay(0)
    }
  })

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
    const settings: AnimationConfigWithData = {
      ...defaultSettings,
      animationData: colorOverrides && json && colorify(colorOverrides, json),
      container: canvasRef.current,
      autoplay,
      loop,
    };

    lottieRef.current = LottieWeb.loadAnimation(settings);
    if (speed !== 1) lottieRef.current.setSpeed(speed);

    // @ts-expect-error
    lottieRef.current.addEventListener('_pause', () => {
      dispatchVevEvent(Events.PAUSE);
    });

    lottieRef.current.addEventListener('loopComplete', () => {
      dispatchVevEvent(Events.LOOP_COMPLETED);
    });


    lottieRef.current.addEventListener('complete', () => {
      dispatchVevEvent(Events.COMPLETE);
    });



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
  description:
    'Lottie is a JSON-based animation file format that enables designers to ship animations on any platform as easily as shipping static assets. Make your own Lottie animations in Adobe After Effects, or more easily, find animations on [lottiefiles.com](https://lottiefiles.com/featured) \n\nUse this element to upload and display your JSON file containing the Lottie animation.',
  icon: 'https://cdn.vev.design/private/pK53XiUzGnRFw1uPeFta7gdedx22/5Vtsm6QxVv_lottieFiles.png.png',
  events: [{
    type: Events.PLAY,
    description: 'Playing'
    },
    {
      type: Events.PAUSE,
      description: 'Paused'
    },
    {
      type: Events.LOOP_COMPLETED,
      description: 'Loop completed'
    },
    {
      type: Events.COMPLETE,
      description: 'Completed'
    }
  ],
  interactions: [
    {
      type: Interactions.PLAY,
      description: 'Play'
    },
    {
      type: Interactions.PAUSE,
      description: 'Pause'
    },
    {
      type: Interactions.TOGGLE,
      description: 'Toggle'
    },
    {
      type: Interactions.RESET_ANIMATION,
      description: 'Reset animation'
    }
  ],
  props: [
    {
      name: 'file',
      title: 'Lottie file',
      type: 'upload',
      accept: 'application/json',
      description: 'JSON file exported from After Effects or downloaded from lottiefiles.com',
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
          { label: 'No trigger', value: 'never' },
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
      // options: {
      //   display: 'slider',
      //   min: -2,
      //   max: 2,
      // },
      component: SpeedSlider,
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
      title: 'Container',
      properties: ['background', 'border', 'border-radius', 'padding', 'opacity', 'filter'],
    },
  ],
  type: 'both',
});

export default Lottie;

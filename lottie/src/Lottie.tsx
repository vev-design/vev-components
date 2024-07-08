import React, { useEffect, useRef, useState } from 'react';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useScrollTop,
  useVevEvent,
  useViewport,
} from '@vev/react';
import { colorify, getColors } from 'lottie-colorify';
import { File, LottieColorReplacement } from './types';
import defaultAnimation from './constants/defaultAnimation';
import ColorPicker from './components/ColorPicker';
import {
  Controls,
  DotLottieCommonPlayer,
  DotLottiePlayer,
  PlayerEvents,
} from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';

import styles from './Lottie.module.css';
import { Events, Interactions } from './events';

type Props = {
  file: File;
  hostRef: React.RefObject<HTMLDivElement>;
  autoplay: boolean;
  loop: boolean;
  speed: number;
  colors: LottieColorReplacement[];
  hideControls: boolean;
  scroll: boolean;
  scrollOffsetStart: number;
  scrollOffsetStop: number;
};

const Lottie = ({
  file,
  loop = true,
  speed = 1,
  colors,
  autoplay = true,
  hideControls = false,
  scroll = false,
  scrollOffsetStart = 0,
  scrollOffsetStop = 0,
}: Props) => {
  const lottieRef = useRef<DotLottieCommonPlayer | null>(null);
  const dispatchVevEvent = useDispatchVevEvent();
  const isJSON = (file?.url && file?.type === 'application/json') || !file?.url;
  const [json, setJson] = useState({});
  const { scrollHeight, height: viewportHeight } = useViewport();

  const path = (file && file.url) || defaultAnimation;
  const colorsChanged = JSON.stringify(colors);

  const scrollTop = useScrollTop();

  useEffect(() => {
    if (scroll) {
      if (lottieRef.current) {
        const { totalFrames } = lottieRef.current;
        const progress =
          (scrollTop - scrollOffsetStart) /
          (scrollHeight - scrollOffsetStart - viewportHeight - scrollOffsetStop);
        if (progress >= 0 && progress <= 1) {
          lottieRef.current.goToAndStop(Math.min(totalFrames * progress, totalFrames * 0.99), true);
        }
      }
    }
  }, [scroll, scrollOffsetStart, scrollOffsetStop, scrollTop]);

  useVevEvent(Interactions.PLAY, () => {
    if (lottieRef.current) {
      lottieRef.current.setDirection(1);
      lottieRef.current?.play();
    }
  });

  useVevEvent(Interactions.PLAY_REVERSE, () => {
    if (lottieRef.current) {
      lottieRef.current.setDirection(-1);
      lottieRef.current?.play();
    }
  });

  useVevEvent(Interactions.PAUSE, () => {
    if (lottieRef.current) {
      lottieRef.current.pause();
    }
  });

  useVevEvent(Interactions.TOGGLE, () => {
    if (lottieRef.current) {
      if (lottieRef.current.currentState === 'paused') {
        lottieRef.current?.play();
      } else {
        lottieRef.current?.pause();
      }
    }
  });

  useVevEvent(Interactions.RESET_ANIMATION, () => {
    if (lottieRef.current) {
      lottieRef.current?.goToAndStop(0);
    }
  });

  // Fetch json data when file url changes
  useEffect(() => {
    const fetchJson = async () => {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const result = await response.json();
          const lottieColors = getColors(result);

          const colorOverrides = lottieColors.map((lc: string | { oldColor: string }) => {
            const match = colors?.find((c) => String(c.oldColor) === String(lc));
            return match ? match.newColor : lc;
          });

          if (colorOverrides.length && isJSON) {
            const jsonWithColor = colorify(colorOverrides, result);
            setJson(jsonWithColor);
          } else {
            setJson(json);
          }
        }
      } catch (e) {
        console.log('error', e);
        setJson({});
      }
    };

    isJSON && fetchJson();
  }, [colorsChanged, file]);

  return (
    <DotLottiePlayer
      key={`id-${scroll}-${autoplay}`}
      src={isJSON ? json : path}
      ref={lottieRef}
      autoplay={scroll ? false : autoplay}
      loop={scroll ? false : loop}
      speed={speed}
      className={styles.wrapper}
      onEvent={(event: PlayerEvents) => {
        const events = {
          [PlayerEvents.Play]: Events.PLAY,
          [PlayerEvents.Pause]: Events.PAUSE,
          [PlayerEvents.Complete]: Events.COMPLETE,
          [PlayerEvents.LoopComplete]: Events.LOOP_COMPLETED,
        };

        if (Object.keys(events).includes(event)) {
          dispatchVevEvent(events[event as keyof typeof events]);
        }
      }}
    >
      {!hideControls && <Controls />}
    </DotLottiePlayer>
  );
};

registerVevComponent(Lottie, {
  name: 'Lottie Animation',
  description:
    'Lottie is a JSON-based animation file format that enables designers to ship animations on any platform as easily as shipping static assets. Make your own Lottie animations in Adobe After Effects, or more easily, find animations on [lottiefiles.com](https://lottiefiles.com/featured) \n\nUse this element to upload and display your JSON file containing the Lottie animation.',
  icon: 'https://cdn.vev.design/private/pK53XiUzGnRFw1uPeFta7gdedx22/5Vtsm6QxVv_lottieFiles.png.png',
  events: [
    {
      type: Events.PLAY,
      description: 'On play',
    },
    {
      type: Events.PAUSE,
      description: 'On pause',
    },
    {
      type: Events.LOOP_COMPLETED,
      description: 'On loop end',
    },
    {
      type: Events.COMPLETE,
      description: 'On end',
    },
  ],
  interactions: [
    {
      type: Interactions.PLAY,
      description: 'Play',
    },
    {
      type: Interactions.PLAY_REVERSE,
      description: 'Play reverse',
    },
    {
      type: Interactions.PAUSE,
      description: 'Pause',
    },
    {
      type: Interactions.TOGGLE,
      description: 'Toggle',
    },
    {
      type: Interactions.RESET_ANIMATION,
      description: 'Reset animation',
    },
  ],
  props: [
    {
      name: 'file',
      title: 'Lottie file',
      type: 'upload',
      accept: '.lottie,.json',
      description: 'Only .lottie or JSON files are supported',
    },
    {
      name: 'scroll',
      title: 'Progress by scroll',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'scrollOffsetStart',
      title: 'Scroll offset start',
      description: 'Number of pixels from the top before the scroll animation starts',
      type: 'number',
      options: {
        format: 'px',
      },
      hidden: (context) => !context?.value?.scroll,
    },
    {
      name: 'scrollOffsetStop',
      title: 'Scroll offset stop',
      description:
        'Number of pixels from the bottom of the screen before the scroll animation stops',
      type: 'number',
      options: {
        format: 'px',
      },
      hidden: (context) => !context?.value?.scroll,
    },
    {
      name: 'autoplay',
      title: 'Autoplay',
      type: 'boolean',
      initialValue: true,
      hidden: (context) => context?.value?.scroll === true,
    },
    {
      name: 'loop',
      title: 'Loop',
      type: 'boolean',
      initialValue: true,
      hidden: (context) => context?.value?.scroll === true,
    },
    {
      name: 'hideControls',
      title: 'Hide controls',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'speed',
      title: 'Playback speed',
      type: 'number',
      initialValue: 1,
      options: {
        display: 'slider',
        min: -2,
        max: 4,
        format: 'x',
      },
      hidden: (context) => context?.value?.scroll === true,
    },
    {
      name: 'colors',
      title: 'Colors',
      type: 'array',
      of: 'string',
      component: ColorPicker,
      hidden(context) {
        const isDotLottie =
          context?.value?.file && context?.value?.file?.type !== 'application/json';
        return isDotLottie;
      },
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

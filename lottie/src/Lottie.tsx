import React, { useEffect, useRef, useState } from 'react';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useEditorState,
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
// Vendored copy of '@dotlottie/react-player/dist/index.css' with the bundled
// Karla @font-face removed so the Vev CLI build doesn't fail resolving the font.
import './dotlottie-player.css';

import styles from './Lottie.module.css';
import { Events, Interactions } from './events';
import {
  computeInViewProgress,
  computeWidgetProgress,
  computeOffsetProgress,
  clampProgress,
} from './utils/scrollProgress';

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
  scrollType: 'enterView' | 'widget' | 'offset' | 'timeline';
  scrollWidget: string;
  scrollTimelineWidget: string;
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
  scrollType = 'enterView',
  scrollWidget,
  scrollTimelineWidget,
  hostRef,
}: Props) => {
  const lottieRef = useRef<DotLottieCommonPlayer | null>(null);
  const dispatchVevEvent = useDispatchVevEvent();
  const isJSON = (file?.url && file?.type === 'application/json') || !file?.url;
  const [json, setJson] = useState<null | Record<string, unknown>>(null);
  const { scrollHeight, height: viewportHeight } = useViewport();
  const path = (file && file.url) || defaultAnimation;
  const colorsChanged = JSON.stringify(colors);
  const { disabled } = useEditorState();

  const scrollTop = useScrollTop();

  useEffect(() => {
    if (scroll) {
      if (lottieRef.current) {
        let progress = 0;
        const { totalFrames } = lottieRef.current;

        if (scrollType === 'offset') {
          progress = computeOffsetProgress(
            scrollTop,
            scrollOffsetStart,
            scrollHeight,
            viewportHeight,
            scrollOffsetStop,
          );
        } else if (scrollType === 'enterView') {
          progress = computeInViewProgress(hostRef.current || null, scrollTop, viewportHeight);
        } else if (scrollType === 'widget') {
          const element = document.getElementById(scrollWidget);
          progress = computeWidgetProgress(element || null, scrollTop, viewportHeight);
        } else if (scrollType === 'timeline') {
          const el = document.getElementById(scrollTimelineWidget);
          progress = computeInViewProgress(el, scrollTop, viewportHeight);
        }

        progress = clampProgress(progress);

        lottieRef.current.goToAndStop(Math.min(totalFrames * progress, totalFrames * 0.99), true);
      }
    }
  }, [
    scroll,
    scrollOffsetStart,
    scrollOffsetStop,
    scrollTop,
    viewportHeight,
    scrollType,
    scrollWidget,
    scrollTimelineWidget,
    hostRef,
  ]);

  // Always (re)start playback from the beginning of the given direction.
  //
  // Once a non-looping animation finishes, its playhead is parked at the end
  // frame. Calling the player's play() from there does nothing, which is why the
  // Play interaction appeared to "only play once". By seeking back to the start
  // frame and playing, the Play / Play reverse interactions can be triggered
  // repeatedly and play every time.
  const startPlayback = (direction: 1 | -1) => {
    const player = lottieRef.current;
    if (!player) return;

    player.setDirection(direction);
    player.goToAndPlay(direction === -1 ? player.totalFrames : 0, true);
  };

  useVevEvent(Interactions.PLAY, () => {
    startPlayback(1);
  });

  useVevEvent(Interactions.PLAY_REVERSE, () => {
    startPlayback(-1);
  });

  useVevEvent(Interactions.PAUSE, () => {
    lottieRef.current?.pause();
  });

  useVevEvent(Interactions.TOGGLE, () => {
    const player = lottieRef.current;
    if (!player) return;

    if (player.currentState === 'playing') {
      player.pause();
      return;
    }

    // Resume when paused mid-way, but restart when the playhead is parked at
    // either end (finished) — otherwise play() would do nothing.
    const total = player.totalFrames;
    const { frame } = player.getState();

    if (total && (frame <= 0 || frame >= total - 1)) {
      player.goToAndPlay(player.direction === -1 ? total : 0, true);
    } else {
      player.play();
    }
  });

  useVevEvent(Interactions.RESET_ANIMATION, () => {
    lottieRef.current?.goToAndStop(0);
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

    colorsChanged && isJSON && fetchJson();
  }, [colorsChanged, file]);

  return (
    <div key={`id-${scroll}-${autoplay}-${disabled}`}>
      <DotLottiePlayer
        src={isJSON && json ? json : path}
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
    </div>
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
      name: 'scrollType',
      type: 'select',
      options: {
        display: 'dropdown',
        items: [
          { label: 'Start when entering view', value: 'enterView' },
          { label: 'Start when element enters view', value: 'widget' },
          { label: 'Run while element is in view', value: 'timeline' },
          { label: 'Offset', value: 'offset' },
        ],
      },
      initialValue: 'enterView',
      hidden: (context) => !context?.value?.scroll,
    },
    {
      name: 'scrollWidget',
      title: 'Element',
      description: 'Animation starts when element enters view',
      type: 'widgetSelect',
      hidden: (context) => {
        return !context?.value?.scroll || context?.value?.scrollType !== 'widget';
      },
    },
    {
      name: 'scrollTimelineWidget',
      title: 'Element',
      description: 'Animation runs while element is in view',
      type: 'widgetSelect',
      hidden: (context) => {
        return !context?.value?.scroll || context?.value?.scrollType !== 'timeline';
      },
    },
    {
      name: 'scrollOffsetStart',
      title: 'Scroll offset start',
      description: 'Number of pixels from the top before the scroll animation starts',
      type: 'number',
      options: {
        format: 'px',
      },
      hidden: (context) => {
        return !context?.value?.scroll || context?.value?.scrollType !== 'offset';
      },
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
      hidden: (context) => {
        return !context?.value?.scroll || context?.value?.scrollType !== 'offset';
      },
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

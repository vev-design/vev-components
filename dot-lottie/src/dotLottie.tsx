import React, { useEffect, useMemo, useRef } from 'react';
import styles from './dotLottie.module.css';
import {
  registerVevComponent,
  useScrollTop,
  useVisible,
  View,
  useDispatchVevEvent,
  useVevEvent,
} from '@vev/react';
import { DotLottiePlayer, PlayMode } from '@johanaarstein/dotlottie-player';
import { EventTypes, InteractionTypes } from './event-types';
import SpeedSlider from './SpeedSlider';

type Props = {
  file: {
    name: string;
    size: number;
    type: string;
    url: string;
  };
  loop: boolean;
  controls: boolean;
  speed: number;
  delay: number;
  scrollOffsetStart: number;
  scrollOffsetStop: number;
  onscroll: boolean;
  mode: 'normal' | 'bounce';
};

const defaultAnimation =
  'https://cdn.vev.design/private/an2K3NyIunQ4E5tG3LwwGhVDbi23/cea-animation.lottie';

const DotLottie = ({
  file,
  loop = true,
  controls = false,
  onscroll = false,
  speed = 1000,
  delay = 0,
  scrollOffsetStart = 0,
  scrollOffsetStop = 0,
  mode,
}: Props) => {
  const animation = useRef<DotLottiePlayer | null>(null);
  const isVisible = useVisible(animation);
  const scrollTop = useScrollTop(true);
  const actualUrl = (file && file.url) || defaultAnimation;
  const dispatch = useDispatchVevEvent();

  useVevEvent(InteractionTypes.PLAY, () => {
    if (animation.current) {
      setTimeout(() => {
        animation.current.play();
      }, delay);
    }
  });

  useVevEvent(InteractionTypes.PAUSE, () => {
    if (animation.current) {
      animation.current.pause();
    }
  });

  useVevEvent(InteractionTypes.TOGGLE, () => {
    if (animation.current) {
      setTimeout(() => {
        animation.current.togglePlay();
      }, delay);
    }
  });

  useEffect(() => {
    if (animation.current) {
      // Hack to make the DotLottiePlayer respect the values set, even if it is seems to be available :(
      setTimeout(() => {
        animation.current.controls = controls;
        animation.current.getLottie().setLoop(loop);
        animation.current.setSpeed(speed / 1000);
        animation.current.mode = mode === 'normal' ? PlayMode.Normal : PlayMode.Bounce;

        animation.current.onplay = () => {
          dispatch(EventTypes.PLAY);
        };

        animation.current.onpause = () => {
          dispatch(EventTypes.PAUSE);
        };

        animation.current.addEventListener('complete', () => {
          dispatch(EventTypes.COMPLETE);
        });

        animation.current.addEventListener('loop', () => {
          dispatch(EventTypes.LOOP_COMPLETE);
        });
      }, 100);
    }
  }, [animation, speed, loop, controls, mode]);

  // Scroll trigger
  useEffect(() => {
    const lottie = animation && animation.current && animation.current.getLottie();
    if (lottie) {
      if (onscroll && lottie.totalFrames) {
        let percent: number;
        if (isVisible) {
          const rect = animation.current.getBoundingClientRect();
          percent =
            (rect.top + scrollOffsetStart + rect.height) /
            (View.height + rect.height + scrollOffsetStop);
        } else percent = 1 - scrollTop;
        lottie.goToAndStop((lottie.totalFrames / lottie.frameRate) * 1000 * (1 - percent));
      }
    }
  }, [onscroll, isVisible, scrollOffsetStart, scrollOffsetStop, scrollTop]);

  // Hack to make this annoying web component thing reload its props when it should
  const comp = useMemo(() => {
    return (
      <div key={Date.now()}>
        <dotlottie-player ref={animation} src={actualUrl} />
      </div>
    );
  }, [actualUrl, onscroll, mode]);

  return <div className={styles.wrapper}>{comp}</div>;
};

registerVevComponent(DotLottie, {
  name: 'dotLottie',
  props: [
    {
      title: 'Upload .lottie file',
      name: 'file',
      type: 'upload',
    },
    {
      title: 'Animate on scroll',
      name: 'onscroll',
      type: 'boolean',
      initialValue: false,
    },
    {
      title: 'Loop',
      name: 'loop',
      type: 'boolean',
      initialValue: true,
      hidden: (context) => {
        return context.value.onscroll === true;
      },
    },
    {
      title: 'Loop behavior',
      name: 'mode',
      type: 'select',
      initialValue: 'normal',
      options: {
        display: 'dropdown',
        items: [
          { label: 'Normal', value: 'normal' },
          { label: 'Bounce', value: 'bounce' },
        ],
      },
      hidden: (context) => {
        return context.value.onscroll === true;
      },
    },
    {
      title: 'Show controls',
      name: 'controls',
      type: 'boolean',
      initialValue: false,
    },
    {
      title: 'Speed',
      name: 'speed',
      type: 'number',
      initialValue: 1000,
      component: SpeedSlider,
      hidden: (context) => context?.value?.onscroll === true,
    },
    {
      title: 'Delay (ms)',
      name: 'delay',
      type: 'number',
      initialValue: 0,
      hidden: (context) => context.value.onscroll === true,
    },
    {
      title: 'Scroll offset start',
      name: 'scrollOffsetStart',
      description: 'Start animation x pixels later',
      type: 'number',
      initialValue: 0,
      hidden: (context) => {
        return context.value.onscroll !== true;
      },
    },
    {
      title: 'Scroll offset stop',
      name: 'scrollOffsetStop',
      description: 'Stop animation x pixels later',
      type: 'number',
      initialValue: 0,
      hidden: (context) => {
        return context.value.onscroll !== true;
      },
    },
  ],
  interactions: [
    {
      type: InteractionTypes.PLAY,
      description: 'Play',
    },
    {
      type: InteractionTypes.PAUSE,
      description: 'Pause',
    },
    {
      type: InteractionTypes.TOGGLE,
      description: 'Toggle',
    },
  ],
  events: [
    {
      type: EventTypes.PLAY,
      description: 'on Play',
    },
    {
      type: EventTypes.PAUSE,
      description: 'on Pause',
    },
    {
      type: EventTypes.COMPLETE,
      description: 'on Complete',
    },
    {
      type: EventTypes.LOOP_COMPLETE,
      description: 'on Loop Complete',
    },
  ],
  editableCSS: [
    {
      title: 'Animation',
      selector: styles.wrapper,
      properties: ['background', 'padding', 'border', 'border-radius'],
    },
  ],
  type: 'standard',
});

export default DotLottie;

import React, { useEffect, useMemo, useRef } from 'react';
import styles from './dotLottie.module.css';
import { registerVevComponent, useScrollTop, useVisible, View } from '@vev/react';
import '@johanaarstein/dotlottie-player';
import { DotLottiePlayer, PlayMode } from '@johanaarstein/dotlottie-player';

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
  scrollOffsetStart: number;
  scrollOffsetStop: number;
  animationTrigger: 'visible' | 'hover' | 'click' | 'scroll';
  mode: 'normal' | 'bounce';
};

const defaultAnimation =
  'https://cdn.vev.design/private/an2K3NyIunQ4E5tG3LwwGhVDbi23/cea-animation.lottie';

const DotLottie = ({
  file,
  loop = true,
  controls = false,
  animationTrigger = 'visible',
  speed = 1000,
  scrollOffsetStart = 0,
  scrollOffsetStop = 0,
  mode,
}: Props) => {
  const animation = useRef<DotLottiePlayer | null>(null);
  const isVisible = useVisible(animation);
  const scrollTop = useScrollTop(true);
  const actualUrl = (file && file.url) || defaultAnimation;

  useEffect(() => {
    if (animation.current) {
      // Hack to make the DotLottiePlayer respect the values set, even if it is seems to be available :(
      setTimeout(() => {
        animation.current.controls = controls;
        animation.current.loop = loop;
        animation.current.setSpeed(speed / 1000);
        animation.current.mode = mode === 'normal' ? PlayMode.Normal : PlayMode.Bounce;

        switch (animationTrigger) {
          case 'hover':
            animation.current.stop();
            animation.current.hover = true;
            break;
          case 'click':
            animation.current.stop();
            animation.current.addEventListener('click', () => {
              animation.current.play();
            });
            break;
          case 'scroll':
            break;
        }
      }, 100);
    }
  }, [animation, speed, loop, controls, animationTrigger, mode]);

  // OnClick trigger
  useEffect(() => {
    if (animation && animationTrigger === 'visible') {
      if (isVisible) {
        setTimeout(() => {
          animation.current.play();
        }, 50);
      } else {
        if (!loop) {
          animation.current.stop();
        }
      }
    }
  }, [isVisible, animation, loop, animationTrigger]);

  // Scroll trigger
  useEffect(() => {
    const lottie = animation && animation.current && animation.current.getLottie();
    if (lottie) {
      if (animationTrigger === 'scroll' && lottie.totalFrames) {
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
  }, [animationTrigger, isVisible, scrollOffsetStart, scrollOffsetStop, scrollTop]);

  // Hack to make this annoying web component thing reload its props when it should
  const comp = useMemo(() => {
    return (
      <div key={Date.now()}>
        <dotlottie-player ref={animation} loop={loop} src={actualUrl} />
      </div>
    );
  }, [loop, actualUrl, animationTrigger, mode]);

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
      title: 'Play trigger',
      name: 'animationTrigger',
      type: 'select',
      initialValue: 'visible',
      options: {
        display: 'dropdown',
        items: [
          { label: 'When visible', value: 'visible' },
          { label: 'On hover', value: 'hover' },
          { label: 'On click', value: 'click' },
          { label: 'On scroll', value: 'scroll' },
        ],
      },
    },
    {
      title: 'Loop',
      name: 'loop',
      type: 'boolean',
      initialValue: true,
      hidden: (context) => {
        return context.value.animationTrigger === 'scroll';
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
        return context.value.animationTrigger === 'scroll';
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
      hidden: (context) => {
        return context.value.animationTrigger === 'scroll';
      },
    },
    {
      title: 'Scroll offset start',
      name: 'scrollOffsetStart',
      description: 'Start animation x pixels later',
      type: 'number',
      initialValue: 0,
      hidden: (context) => {
        return context.value.animationTrigger !== 'scroll';
      },
    },
    {
      title: 'Scroll offset stop',
      name: 'scrollOffsetStop',
      description: 'Stop animation x pixels later',
      type: 'number',
      initialValue: 0,
      hidden: (context) => {
        return context.value.animationTrigger !== 'scroll';
      },
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background'],
    },
  ],
  type: 'standard',
});

export default DotLottie;

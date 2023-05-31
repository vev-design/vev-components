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
  animationTrigger: 'visible' | 'hover' | 'click' | 'scroll';
};

const defaultAnimation =
  'https://cdn.vev.design/private/an2K3NyIunQ4E5tG3LwwGhVDbi23/cea-animation.lottie';

const DotLottie = ({
  file,
  loop = true,
  controls = false,
  animationTrigger = 'visible',
  speed = 100,
}: Props) => {
  const animation = useRef<DotLottiePlayer | null>(null);
  const visible = useVisible(animation);
  const scrollTop = useScrollTop(true);
  const actualUrl = (file && file.url) || defaultAnimation;

  useEffect(() => {
    if (animation.current) {
      animation.current.controls = controls;
      animation.current.loop = loop;
      animation.current.setSpeed(speed / 1000);
      animation.current.mode = PlayMode.Normal;

      switch (animationTrigger) {
        case 'hover':
          animation.current.hover = true;
          break;
        case 'click':
          animation.current.addEventListener('click', () => {
            animation.current.play();
          });
          break;
        case 'scroll':
          break;
      }
    }
  }, [animation, speed, loop, controls, animationTrigger]);

  // OnClick trigger
  useEffect(() => {
    if (animation && animationTrigger === 'visible') {
      if (visible) {
        setTimeout(() => {
          animation.current.play();
        }, 50);
      } else {
        if (!loop) {
          animation.current.stop();
        }
      }
    }
  }, [visible, animation, loop, animationTrigger]);

  useEffect(() => {
    if (animation && animationTrigger === 'scroll') {
      const seek = `${scrollTop * 100}%`;
      console.log('seek', seek);
      animation.current.seek(seek);
    }
  }, [animationTrigger, scrollTop]);

  useEffect(() => {
    const lottie = animation && animation.current && animation.current.getLottie();
    if (lottie) {
      if (animationTrigger === 'scroll' && lottie.totalFrames) {
        let percent;
        if (visible) {
          const rect = animation.current.getBoundingClientRect();
          percent = (rect.top + rect.height) / (View.height + rect.height);
        } else percent = 1 - scrollTop;
        lottie.goToAndStop((lottie.totalFrames / lottie.frameRate) * 1000 * (1 - percent));
      }
    }
  }, [scrollTop]);

  // Hack to make this annoying web component thing reload its props when it should
  const comp = useMemo(() => {
    return (
      <div>
        <dotlottie-player key={Date.now()} ref={animation} loop={loop} src={actualUrl} />
      </div>
    );
  }, [loop, actualUrl, animationTrigger]);

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
      display: 'slider',
      initialValue: 100,
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

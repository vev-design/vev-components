import React, { useEffect, RefObject, useMemo } from 'react';
import { registerVevComponent, useVevEvent, useEditorState, useGlobalState } from '@vev/react';
import { randomize } from './utils';

import Slide from './Slide';
import Fade from './Fade';
import Zoom from './Zoom';
import Carousel from './Carousel3d';
import { useTouch } from './use-touch';

import styles from './Slideshow.module.css';

export type Props = {
  hostRef: RefObject<any>;
  children: string[];
  animation: 'slide' | 'zoom' | 'fade' | '3d';
  speed?: number;
  vertical?: boolean;
  autoplay: boolean;
  autoplayInterval: number;
  selectedIndex?: number;
  clipContent?: boolean;
  gap?: number;
  random?: boolean;
  infinite?: boolean;
};

enum Events {
  NEXT = 'NEXT',
  PREV = 'PREV',
  SET = 'SET',
}

export const Slideshow = (props: Props) => {
  const editor = useEditorState();
  const [state, setState] = useGlobalState();
  const { autoplay, autoplayInterval = 5000, animation, selectedIndex } = props;

  useTouch(props.hostRef, {
    onNext: () => {
      setState(NEXT_SLIDE);
    },
    onPrev: () => {
      setState(PREV_SLIDE);
    },
  });

  const index = state?.index || 0;
  const slides = props?.children || [];
  const numberOfSlides = slides?.length || 0;

  const NEXT_SLIDE = useMemo(
    () => ({
      index: props.random
        ? randomize(numberOfSlides, index)
        : numberOfSlides === index + 1
        ? 0
        : index + 1,
      length: numberOfSlides || 0,
    }),
    [numberOfSlides, index, props.random, props.infinite],
  );

  const PREV_SLIDE = useMemo(
    () => ({
      index: props.random
        ? randomize(numberOfSlides, index)
        : index === 0
        ? numberOfSlides - 1
        : index - 1,
      length: numberOfSlides || 0,
    }),
    [numberOfSlides, index, props.random],
  );

  useEffect(() => {
    setState({ ...state, length: numberOfSlides || 0 });
  }, [numberOfSlides, setState]);

  useVevEvent(Events.NEXT, () => {
    setState(NEXT_SLIDE);
  });

  useVevEvent(Events.PREV, () => {
    setState(PREV_SLIDE);
  });

  useVevEvent(Events.SET, (args: { index: number }) => {
    setState({
      index: args.index,
      length: numberOfSlides || 0,
    });
  });

  /*   useEffect(() => {
    if (animation === '3d') return;

    if (index === numberOfSlides - 1) {
      props.children = props.children.push(props.children[0]);
    }
  }, [numberOfSlides, index]);
 */
  if (!props?.children?.length) {
    return <div className={styles.empty}>No slides</div>;
  }

  const render = {
    slide: Slide,
    fade: Fade,
    zoom: Zoom,
    '3d': Carousel,
  };

  const Comp = render[animation] || Slide;

  return (
    <div
      className={styles.wrapper}
      onTransitionEnd={() => {
        if (autoplay && !editor.disabled) {
          setTimeout(() => {
            setState(NEXT_SLIDE);
          }, autoplayInterval);
        }
      }}
      style={{
        overflow: props.clipContent ? 'hidden' : 'visible',
      }}
    >
      <Comp {...props} index={editor.disabled ? selectedIndex || 0 : index} />
    </div>
  );
};

registerVevComponent(Slideshow, {
  name: 'Slideshow',
  type: 'both',
  icon: 'https://cdn.vev.design/private/5YlQ6CapVRbr7RUqaPTH7gT1clH2/li-layer-icon-card-slider.svg',
  children: {
    name: 'Slide',
    icon: 'https://cdn.vev.design/visuals/slides.png',
  },
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['border', 'border-radius', 'box-shadow'],
    },
    {
      selector: ':host',
      properties: ['box-shadow', 'background'],
    },
  ],
  props: [
    {
      name: 'animation',
      type: 'select',
      initialValue: 'slide',
      options: {
        display: 'radio',
        items: [
          {
            label: 'Slide',
            value: 'slide',
          },
          {
            label: 'Zoom',
            value: 'zoom',
          },
          {
            label: 'Fade',
            value: 'fade',
          },
          {
            label: '3D',
            value: '3d',
          },
        ],
      },
    },
    {
      name: 'autoplay',
      title: 'Autoplay',
      type: 'boolean',
    },
    {
      name: 'autoplayInterval',
      title: 'Pause (ms)',
      type: 'number',
      hidden: (context) => !context.value?.autoplay,
    },
    {
      name: 'speed',
      type: 'number',
      description: 'Milliseconds',
      title: 'Speed (ms)',
      initialValue: 200,
    },
    {
      name: 'vertical',
      title: 'Vertical',
      type: 'boolean',
      hidden: (context) => context.value?.animation !== 'slide',
    },
    {
      name: 'clipContent',
      title: 'Clip content',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'random',
      title: 'Randomize',
      type: 'boolean',
    },
    {
      name: 'infinite',
      title: 'Infinite',
      type: 'boolean',
      hidden: (context) => ['3d'].includes(context.value?.animation),
    },
    {
      name: 'gap',
      type: 'number',
      title: 'Gap (px)',
      initialValue: 50,
      hidden: (context) => context.value?.animation !== '3d',
    },
  ],
  events: [
    {
      name: Events.NEXT,
      description: 'Go to next slide',
    },
    {
      name: Events.PREV,
      description: 'Go to previous slide',
    },
    {
      name: Events.SET,
      description: 'Go to specific slide',
      args: [
        {
          name: 'index',
          type: 'number',
        },
      ],
    },
  ],
});

export default Slideshow;

import React, { useEffect, RefObject, useMemo, useRef, useState } from 'react';
import { registerVevComponent, useVevEvent, useEditorState, useGlobalState } from '@vev/react';
import { shuffleArray } from './utils';

import Slide from './Slide';
import Fade from './Fade';
import Zoom from './Zoom';
import Carousel from './Carousel3d';
import { useTouch } from './use-touch';

import styles from './Slideshow.module.css';

export type Props = {
  hostRef: RefObject<any>;
  children: string[];
  slides: string[];
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
  const {
    children,
    autoplay,
    autoplayInterval = 5000,
    animation,
    selectedIndex,
    random,
    infinite,
    hostRef,
  } = props;

  const [slides, setSlides] = useState([]);
  console.log('children', children, slides);

  useEffect(() => {
    if (random && !editor.disabled) {
      setSlides(shuffleArray(children));
    } else {
      setSlides(children);
    }
  }, [random, slides?.length]);

  useTouch(hostRef, {
    onNext: () => setState(NEXT_SLIDE),
    onPrev: () => setState(PREV_SLIDE),
  });

  const index = state?.index || 0;
  const numberOfSlides = props?.children?.length || 0;

  const NEXT_SLIDE = useMemo(
    () => ({
      index: numberOfSlides === index + 1 ? (infinite ? 0 : numberOfSlides - 1) : index + 1,
      length: numberOfSlides || 0,
    }),
    [numberOfSlides, index, infinite],
  );

  const PREV_SLIDE = useMemo(
    () => ({
      index: index === 0 ? (infinite ? numberOfSlides - 1 : 0) : index - 1,
      length: numberOfSlides || 0,
    }),
    [numberOfSlides, index, infinite],
  );

  const SET_SLIDE = (index: number) =>
    useMemo(
      () => ({
        index,
        length: numberOfSlides || 0,
      }),
      [index],
    );

  useEffect(() => {
    setState({ ...state, length: numberOfSlides || 0 });
  }, [numberOfSlides]);

  useEffect(() => {
    if (autoplay && !editor.disabled) {
      setTimeout(() => {
        setState(NEXT_SLIDE);
      }, autoplayInterval);
    }
  }, [autoplay, editor.disabled, autoplayInterval]);

  useVevEvent(Events.NEXT, () => {
    setState(NEXT_SLIDE);
  });

  useVevEvent(Events.PREV, () => {
    setState(PREV_SLIDE);
  });

  useVevEvent(Events.SET, (args: { index: number }) => {
    setState(SET_SLIDE(args.index));
  });

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
      style={{
        overflow: animation !== '3d' ? 'hidden' : 'visible',
      }}
    >
      <Comp
        {...props}
        index={editor.disabled ? selectedIndex || 0 : index}
        slides={random ? slides : children}
        onNextSlide={() => {
          if (autoplay && !editor.disabled) {
            setTimeout(() => {
              setState(NEXT_SLIDE);
            }, autoplayInterval);
          }
        }}
      />
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
      name: 'random',
      title: 'Randomize',
      type: 'boolean',
      // hidden: (context) => ['3d'].includes(context.value?.animation),
    },
    {
      name: 'infinite',
      title: 'Infinite',
      type: 'boolean',
    },
    {
      name: 'gap',
      type: 'number',
      title: 'Gap (px)',
      initialValue: 50,
      hidden: (context) => context.value?.animation !== '3d',
    },
  ],
  interactions: [
    {
      type: Events.NEXT,
      description: 'Go to next slide',
    },
    {
      type: Events.PREV,
      description: 'Go to previous slide',
    },
    {
      type: Events.SET,
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

import React, { useEffect, RefObject, useMemo, useState } from 'react';
import { registerVevComponent, useVevEvent, useEditorState, useGlobalState } from '@vev/react';
import { shuffleArray } from './utils';
import DirectionField from './DirectionField';

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
  const index = state?.index || 0;
  const numberOfSlides = props?.children?.length || 0;

  useEffect(() => {
    if (random && !editor.disabled) {
      setSlides(shuffleArray(children));
    } else {
      setSlides(children);
    }
  }, [random, slides?.length]);

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

  useTouch(hostRef, {
    onNext: () => setState(NEXT_SLIDE),
    onPrev: () => setState(PREV_SLIDE),
  });

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

  if (editor.disabled) {
    return (
      <div
        className={styles.wrapper}
        style={{
          overflow: animation !== '3d' ? 'hidden' : 'visible',
        }}
      >
        <Fade
          {...props}
          index={editor.disabled ? selectedIndex || 0 : index}
          slides={random ? slides : children}
          speed={1}
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
  }

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
        display: 'dropdown',
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
      name: 'speed',
      type: 'number',
      description: 'Specify how long the animation should last',
      title: 'Duration',
      initialValue: 200,
    },
    {
      name: 'autoplayInterval',
      title: 'Delay',
      description: 'Specify how long to wait until the animation starts',
      type: 'number',
      hidden: (context) => !context.value?.autoplay,
    },
    {
      name: 'direction',
      type: 'string',
      component: DirectionField,
    },
    {
      name: 'autoplay',
      title: 'Autoplay',
      type: 'boolean',
    },
    /*     {
      name: 'vertical',
      title: 'Vertical',
      type: 'boolean',
      hidden: (context) => context.value?.animation !== 'slide',
    }, */
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

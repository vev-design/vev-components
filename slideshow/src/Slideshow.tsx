import React, { useEffect, RefObject, useMemo, useState, useCallback, useRef } from 'react';
import { registerVevComponent, useVevEvent, useEditorState, useGlobalState } from '@vev/react';
import { shuffleArray } from './utils';
import DirectionField from './DirectionField';

import Slide from './Slide';
import Fade from './Fade';
import Zoom from './Zoom';
import Carousel from './Carousel3d';
import { useTouch } from './use-touch';
import { getNextSlideIndex, getPrevSlideIndex } from './utils';

import styles from './Slideshow.module.css';

export type Props = {
  hostRef: RefObject<any>;
  children: string[];
  animation: 'slide' | 'zoom' | 'fade' | '3d';
  speed?: number;
  selectedIndex?: number;
  gap?: number;
  random?: boolean;
  infinite?: boolean;
  perspective?: number;
  scaleFactor?: number;
  direction: 'HORIZONTAL' | 'HORIZONTAL_REVERSE' | 'VERTICAL' | 'VERTICAL_REVERSE';

  slides: string[];
  currentSlide: string;
  nextSlide: string;
  prevSlide: string;
  editMode?: boolean;
  index: number;
};

enum Events {
  NEXT = 'NEXT',
  PREV = 'PREV',
  SET = 'SET',
}

export const Slideshow = (props: Props) => {
  const editor = useEditorState();
  const [state, setState] = useGlobalState();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { children, animation, random, hostRef } = props;
  const [slides, setSlides] = useState(children || []);
  const prevIndex = useRef(state?.index || 0);

  const numberOfSlides = props?.children?.length || 0;

  useEffect(() => {
    setState({
      index: Math.max(
        0,
        editor.activeContentChild
          ? children.indexOf(editor.activeContentChild)
          : !editor.disabled
          ? prevIndex.current || 0
          : 0,
      ),
      length: numberOfSlides || 0,
    });

    prevIndex.current = children.indexOf(editor.activeContentChild);
  }, [editor.activeContentChild, editor.disabled]);

  useEffect(() => {
    if (random && !editor.disabled) {
      // Set random
      setSlides(shuffleArray(children));
    } else {
      setSlides(children);
    }
  }, [random, editor.disabled, children]);

  const handleNextSlide = useCallback(() => {
    console.log('next');
    if (!props.infinite && state?.index === numberOfSlides - 1) return;

    setIsTransitioning(true);
    setState({
      index: getNextSlideIndex(state?.index, slides),
      length: numberOfSlides || 0,
    });
  }, [state?.index, slides, numberOfSlides, isTransitioning]);

  const handlePrevSlide = useCallback(() => {
    if (!props.infinite && state?.index === 0) return;

    setIsTransitioning(true);
    setState({
      index: getPrevSlideIndex(state?.index, slides),
      length: numberOfSlides || 0,
    });
  }, [state?.index, slides, numberOfSlides, isTransitioning]);

  useTouch(hostRef, {
    onNext: handleNextSlide,
    onPrev: handlePrevSlide,
  });

  useVevEvent(Events.NEXT, handleNextSlide);
  useVevEvent(Events.PREV, handlePrevSlide);

  useVevEvent(Events.SET, (args: { slide: number }) => {
    setState({
      index: Math.max(0, Number(args?.slide) - 1),
      length: numberOfSlides || 0,
    });
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
    <div className={styles.wrapper}>
      {slides[state?.index] && (
        <Comp
          {...props}
          slides={slides}
          currentSlide={slides[state?.index]}
          nextSlide={slides[getNextSlideIndex(state?.index, slides)]}
          prevSlide={slides[getPrevSlideIndex(state?.index, slides)]}
          speed={editor?.disabled ? 1 : props.speed}
          index={state?.index}
          editMode={editor.disabled}
        />
      )}
    </div>
  );
};

registerVevComponent(Slideshow, {
  name: 'Slider',
  type: 'standard',
  icon: 'https://cdn.vev.design/assets/slider.svg',
  description:
    'Add a dynamic slider to display diverse design elements, tailor animation, and add Interactions for custom navigation.',
  children: {
    name: 'Slide',
    icon: 'https://cdn.vev.design/visuals/slides.png',
  },
  size: {
    width: 510,
    height: 340,
  },
  editableCSS: [
    {
      selector: ':host',
      properties: ['box-shadow', 'background', 'border', 'border-radius'],
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
      name: 'direction',
      type: 'string',
      component: DirectionField,
      initialValue: 'HORIZONTAL',
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
      initialValue: true,
    },
    {
      name: 'gap',
      type: 'number',
      title: 'Gap (px)',
      initialValue: 50,
      hidden: (context) => context.value?.animation !== '3d',
    },
    {
      name: 'perspective',
      type: 'number',
      title: 'Perspective (px)',
      initialValue: 800,
      hidden: (context) => context.value?.animation !== '3d',
    },
    {
      name: 'scaleFactor',
      type: 'number',
      title: 'Scale (%)',
      initialValue: 300,
      hidden: (context) => context.value?.animation !== 'zoom',
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
          name: 'slide',
          description: 'Set slide number',
          type: 'number',
        },
      ],
    },
  ],
});

export default Slideshow;

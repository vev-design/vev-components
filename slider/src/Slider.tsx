import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  registerVevComponent,
  useVevEvent,
  useEditorState,
  useGlobalState,
  useDispatchVevEvent,
} from '@vev/react';
import { shuffleArray, getNextSlideIndex, getPrevSlideIndex } from './utils';
import DirectionField from './DirectionField';
import { Events, Interactions, Props } from './types';

import Slide from './Slide';
import Fade from './Fade';
import Zoom from './Zoom';
import Carousel from './Carousel3d';
import None from './None';

import { useTouch } from './use-touch';

import styles from './Slider.module.css';

export const Slideshow = (props: Props) => {
  const editor = useEditorState();
  const [state, setState] = useGlobalState();
  const dispatch = useDispatchVevEvent();

  const { children, animation, random, hostRef } = props;
  const [slides, setSlides] = useState(children || []);
  const prevIndex = useRef(state?.index || 0);
  const [transitionSpeed, setTransitionSpeed] = useState(1);

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
    if (state?.index !== undefined) {
      dispatch(Events.SLIDE_CHANGED, {
        currentSlide: state?.index + 1,
      });
    }
  }, [state?.index]);

  useEffect(() => {
    if (random && !editor.disabled) {
      // Set random
      setSlides(shuffleArray(children));
    } else {
      setSlides(children);
    }
  }, [random, editor.disabled, children]);

  /**
   * transitionInProgress
   */

  const transitionInProgress = useCallback(() => {
    const isTransitioning = transitionSpeed > 1;
    const supportedTypes = ['slide', 'zoom', 'fade'].includes(animation);
    if (supportedTypes && isTransitioning) {
      console.log('### transition in progress', transitionSpeed);
    }
    return supportedTypes && isTransitioning;
  }, [transitionSpeed, animation]);

  /**
   * handleNextSlide
   */

  const handleNextSlide = useCallback(() => {
    if (((!props.infinite || animation === 'none') && state?.index === numberOfSlides - 1)) return;
    if (transitionInProgress()) return;

    const nextSlideIndex = getNextSlideIndex(state?.index || 0, slides); console.log('### handleNextSlide', props.speed);

    setTransitionSpeed(props.speed || 1);

    setState({
      index: nextSlideIndex,
      length: numberOfSlides || 0,
      action: 'NEXT',
    });
  }, [state?.index, slides, numberOfSlides, props.speed, animation, transitionInProgress, animation]);

  /**
   * handlePrevSlide
   */

  const handlePrevSlide = useCallback(() => {
    if (((!props.infinite || animation === 'none') && state?.index === 0)) return;
    if (transitionInProgress()) return;


    const prevSlideIndex = getPrevSlideIndex(state?.index || 0, slides);
    setTransitionSpeed(props.speed || 1);

    setState({
      index: prevSlideIndex,
      length: numberOfSlides || 0,
      action: 'PREV',
    });
  }, [state?.index, slides, numberOfSlides, props.speed, animation, transitionInProgress, animation]);

  /**
   * useTouch
   */

  useTouch(
    hostRef,
    {
      onNext: handleNextSlide,
      onPrev: handlePrevSlide,
    },
    props.disableSwipe,
  );

  useVevEvent(Interactions.NEXT, handleNextSlide);
  useVevEvent(Interactions.PREV, handlePrevSlide);
  useVevEvent(Interactions.SET, (args: { slide: number }) => {
    setState({
      index: Math.max(0, Number(args?.slide || 0) - 1),
      length: numberOfSlides || 0,
    });
  });

  if (!props?.children?.length) return null;

  const render = {
    slide: Slide,
    fade: Fade,
    zoom: Zoom,
    '3d': Carousel,
    none: None,
  };

  const Comp = render[animation] || Slide;

  return (
    <div className={styles.wrapper}>
      {(slides[state?.index] || slides[0]) && (
        <Comp
          {...props}
          transitionSpeed={transitionSpeed}
          resetTransitionSpeed={() => {
            setTransitionSpeed(0);
          }}
          slides={slides}
          index={isNaN(state?.index) ? 0 : state?.index}
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
    width: 600,
    height: 400,
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
          {
            label: 'None',
            value: 'none',
          },
        ],
      },
    },
    {
      name: 'speed',
      type: 'number',
      title: 'Transition speed',
      initialValue: 200,
      options: {
        format: 'ms',
      } as any, // Need to update CLI
      hidden: (context) => context.value?.animation === 'none',
    },
    {
      name: 'easing',
      type: 'select',
      initialValue: 'ease',
      options: {
        display: 'dropdown',
        items: [
          {
            label: 'Ease',
            value: 'ease',
          },
          {
            label: 'Linear',
            value: 'linear',
          },
        ],
      },
      hidden: (context) => context.value?.animation === 'none',
    },
    {
      name: 'direction',
      type: 'string',
      component: DirectionField,
      initialValue: 'HORIZONTAL',
      hidden: (context) => ['none'].includes(context.value?.animation),
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
      hidden: (context) => context.value?.animation === 'none',
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
    {
      name: 'slidesToLoad',
      title: 'Slides before/after',
      description: 'Turn off clip content in the style tab to make the before/after slides visible',
      type: 'number',
      hidden: (context) => context.value?.animation !== 'slide',
      initialValue: 1,
      options: {
        min: 1,
        max: 5,
      },
    },
    {
      name: 'shrinkFactorBeforeAfter',
      type: 'number',
      title: 'Scaling',
      options: {
        display: 'slider',
        min: 0,
        max: 100,
      },
      description: 'Shrink slides before/after the current slide. 0% is no scaling.',
      initialValue: 0,
      hidden: (context) => context.value?.animation !== 'slide',
    },
    {
      name: 'disableSwipe',
      type: 'boolean',
      description: 'The slider have a default swipe to change slide on mobile that can be disabled',
    },
  ],
  events: [
    {
      type: Events.SLIDE_CHANGED,
      description: 'Slide changing',
      args: [
        {
          name: 'currentSlide',
          description: 'Slide number',
          type: 'number',
        },
      ],
    },
    {
      type: Events.SLIDE_DID_CHANGED,
      description: 'Slide was changed',
      args: [
        {
          name: 'currentSlide',
          description: 'Slide number',
          type: 'number',
        },
      ],
    },
  ],
  interactions: [
    {
      type: Interactions.NEXT,
      description: 'Go to next slide',
    },
    {
      type: Interactions.PREV,
      description: 'Go to previous slide',
    },
    {
      type: Interactions.SET,
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

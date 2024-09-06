import React, {
  useEffect,
  RefObject,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  registerVevComponent,
  useVevEvent,
  useEditorState,
  useGlobalState,
  useDispatchVevEvent,
} from "@vev/react";
import { shuffleArray } from "./utils";
import DirectionField from "./DirectionField";

import Slide from "./Slide";
import Fade from "./Fade";
import Zoom from "./Zoom";
import Carousel from "./Carousel3d";
import None from "./None";

import { useTouch } from "./use-touch";
import { getNextSlideIndex, getPrevSlideIndex } from "./utils";

import styles from "./Slider.module.css";

export type Props = {
  hostRef: RefObject<any>;
  children: string[];
  animation: "slide" | "zoom" | "fade" | "3d";
  speed?: number;
  selectedIndex?: number;
  gap?: number;
  random?: boolean;
  infinite?: boolean;
  perspective?: number;
  scaleFactor?: number;
  easing?: string;
  shrinkFactorBeforeAfter?: number;
  direction:
    | "HORIZONTAL"
    | "HORIZONTAL_REVERSE"
    | "VERTICAL"
    | "VERTICAL_REVERSE";

  slides: string[];
  editMode?: boolean;
  index: number;
  action: "NEXT" | "PREV";
  slidesToLoad: number;
};

enum Interactions {
  NEXT = "NEXT",
  PREV = "PREV",
  SET = "SET",
}

enum Events {
  SLIDE_CHANGED = "SLIDE_CHANGED",
}

export const Slideshow = (props: Props) => {
  const editor = useEditorState();
  const [state, setState] = useGlobalState();
  const dispatch = useDispatchVevEvent();
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
          : 0
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

  const handleNextSlide = useCallback(() => {
    if (
      (!props.infinite && state?.index === numberOfSlides - 1) ||
      slides.length <= 1
    )
      return;
    setIsTransitioning(true);
    setState({
      index: getNextSlideIndex(state?.index, slides),
      length: numberOfSlides || 0,
      action: "NEXT",
    });
  }, [state?.index, slides, numberOfSlides, isTransitioning]);

  const handlePrevSlide = useCallback(() => {
    if ((!props.infinite && state?.index === 0) || slides.length <= 1) return;

    setIsTransitioning(true);
    setState({
      index: getPrevSlideIndex(state?.index, slides),
      length: numberOfSlides || 0,
      action: "PREV",
    });
  }, [state?.index, slides, numberOfSlides, isTransitioning]);

  useTouch(hostRef, {
    onNext: handleNextSlide,
    onPrev: handlePrevSlide,
  });

  useVevEvent(Interactions.NEXT, handleNextSlide);
  useVevEvent(Interactions.PREV, handlePrevSlide);
  useVevEvent(Interactions.SET, (args: { slide: number }) => {
    setState({
      index: Math.max(0, Number(args?.slide || 0) - 1),
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
    "3d": Carousel,
    none: None,
  };

  const Comp = render[animation] || Slide;

  return (
    <div className={styles.wrapper}>
      {(slides[state?.index] || slides[0]) && (
        <Comp
          {...props}
          slides={slides}
          speed={editor?.disabled ? 1 : props.speed}
          index={isNaN(state?.index) ? 0 : state?.index}
          editMode={editor.disabled}
          action={state?.action}
        />
      )}
    </div>
  );
};

registerVevComponent(Slideshow, {
  name: "Slider",
  type: "standard",
  icon: "https://cdn.vev.design/assets/slider.svg",
  description:
    "Add a dynamic slider to display diverse design elements, tailor animation, and add Interactions for custom navigation.",
  children: {
    name: "Slide",
    icon: "https://cdn.vev.design/visuals/slides.png",
  },
  size: {
    width: 510,
    height: 340,
  },
  editableCSS: [
    {
      selector: ":host",
      properties: ["box-shadow", "background", "border", "border-radius"],
    },
  ],
  props: [
    {
      name: "animation",
      type: "select",
      initialValue: "slide",
      options: {
        display: "dropdown",
        items: [
          {
            label: "Slide",
            value: "slide",
          },
          {
            label: "Zoom",
            value: "zoom",
          },
          {
            label: "Fade",
            value: "fade",
          },
          {
            label: "3D",
            value: "3d",
          },
          {
            label: "None",
            value: "none",
          },
        ],
      },
    },
    {
      name: "speed",
      type: "number",
      title: "Transition speed",
      initialValue: 200,
      options: {
        format: "ms",
      } as any, // Need to update CLI
      hidden: (context) => context.value?.animation === "none",
    },
    {
      name: "easing",
      type: "select",
      initialValue: "ease",
      options: {
        display: "dropdown",
        items: [
          {
            label: "Ease",
            value: "ease",
          },
          {
            label: "Linear",
            value: "linear",
          },
        ],
      },
    },
    {
      name: "direction",
      type: "string",
      component: DirectionField,
      initialValue: "HORIZONTAL",
    },
    {
      name: "random",
      title: "Randomize",
      type: "boolean",
    },
    {
      name: "infinite",
      title: "Infinite",
      type: "boolean",
      initialValue: true,
    },
    {
      name: "gap",
      type: "number",
      title: "Gap (px)",
      initialValue: 50,
      hidden: (context) => context.value?.animation !== "3d",
    },
    {
      name: "perspective",
      type: "number",
      title: "Perspective (px)",
      initialValue: 800,
      hidden: (context) => context.value?.animation !== "3d",
    },
    {
      name: "scaleFactor",
      type: "number",
      title: "Scale (%)",
      initialValue: 300,
      hidden: (context) => context.value?.animation !== "zoom",
    },
    {
      name: "slidesToLoad",
      title: "Slides before/after",
      description:
        "Turn off clip content in the style tab to make the before/after slides visible",
      type: "number",
      hidden: (context) => context.value?.animation !== "slide",
      initialValue: 1,
      options: {
        min: 1,
        max: 5,
      },
    },
    {
      name: "shrinkFactorBeforeAfter",
      type: "number",
      title: "Shrink slides before/after (%)",
      description:
        "Shrink slides before/after the current slide progressively. 0% is no scaling.",
      initialValue: 0,
      hidden: (context) => context.value?.animation !== "slide",
    },
  ],
  events: [
    { type: Events.SLIDE_CHANGED, description: "Slide was changed" },
  ],
  interactions: [
    {
      type: Interactions.NEXT,
      description: "Go to next slide",
    },
    {
      type: Interactions.PREV,
      description: "Go to previous slide",
    },
    {
      type: Interactions.SET,
      description: "Go to specific slide",
      args: [
        {
          name: "slide",
          description: "Set slide number",
          type: "number",
        },
      ],
    },
  ],
});

export default Slideshow;

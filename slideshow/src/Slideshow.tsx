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
} from "@vev/react";
import { shuffleArray } from "./utils";
import DirectionField from "./DirectionField";

import Slide from "./Slide";
import Fade from "./Fade";
import Zoom from "./Zoom";
import Carousel from "./Carousel3d";
import { useTouch } from "./use-touch";
import { getNextSlideIndex, getPrevSlideIndex } from "./utils";

import styles from "./Slideshow.module.css";

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
  direction:
    | "HORIZONTAL"
    | "HORIZONTAL_REVERSE"
    | "VERTICAL"
    | "VERTICAL_REVERSE";

  slides: string[];
  currentSlide: string;
  nextSlide: string;
  prevSlide: string;
  editMode?: boolean;
  index: number;
};

enum Events {
  NEXT = "NEXT",
  PREV = "PREV",
  SET = "SET",
}

export const Slideshow = (props: Props) => {
  const editor = useEditorState();
  const [state, setState] = useGlobalState();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { children, animation, random, hostRef } = props;
  const [slides, setSlides] = useState(children || []);

  const numberOfSlides = props?.children?.length || 0;
  const index = Math.max(
    0,
    editor?.disabled
      ? children?.indexOf(editor?.activeContentChild) || 0
      : state?.index || 0
  );

  useEffect(() => {
    // Set initial state
    if (editor.disabled) {
      setState({ index: 0, length: numberOfSlides || 0 });
    } else {
      setState({
        index: editor?.activeContentChild
          ? children?.indexOf(editor?.activeContentChild) || 0
          : 0,
        length: numberOfSlides || 0,
      });
    }
  }, [numberOfSlides, editor.disabled]);

  useEffect(() => {
    if (random && !editor.disabled) {
      // Set random
      setSlides(shuffleArray(children));
    } else {
      setSlides(children);
    }
  }, [random, editor.disabled, children]);

  const handleNextSlide = useCallback(() => {
    setIsTransitioning(true);
    setState({
      index: getNextSlideIndex(index, slides),
      length: numberOfSlides || 0,
    });
  }, [index, slides, numberOfSlides, isTransitioning]);

  const handlePrevSlide = useCallback(() => {
    setIsTransitioning(true);
    setState({
      index: getPrevSlideIndex(index, slides),
      length: numberOfSlides || 0,
    });
  }, [index, slides, numberOfSlides, isTransitioning]);

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
    "3d": Carousel,
  };

  const Comp = render[animation] || Slide;

  return (
    <div className={styles.wrapper}>
      <Comp
        {...props}
        slides={slides}
        currentSlide={slides[index]}
        nextSlide={slides[getNextSlideIndex(index, slides)]}
        prevSlide={slides[getPrevSlideIndex(index, slides)]}
        speed={editor?.disabled ? 1 : props.speed}
        index={index}
        editMode={editor.disabled}
      />
    </div>
  );
};

registerVevComponent(Slideshow, {
  name: "Slideshow",
  type: "both",
  icon: "https://cdn.vev.design/private/5YlQ6CapVRbr7RUqaPTH7gT1clH2/li-layer-ico-card-slider.svg",
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
        ],
      },
    },
    {
      name: "speed",
      type: "number",
      description: "Specify how long the animation should last",
      title: "Duration",
      initialValue: 200,
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
  ],
  interactions: [
    {
      type: Events.NEXT,
      description: "Go to next slide",
    },
    {
      type: Events.PREV,
      description: "Go to previous slide",
    },
    {
      type: Events.SET,
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

import React, {
  useEffect,
  RefObject,
  useMemo,
  useState,
  useCallback,
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
  direction:
    | "HORIZONTAL"
    | "HORIZONTAL_REVERSE"
    | "VERTICAL"
    | "VERTICAL_REVERSE";

  slides: string[];
  currentSlide: string;
  nextSlide: string;
  prevSlide: string;
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
  const { children, animation, selectedIndex, random, infinite, hostRef } =
    props;

  const [slides, setSlides] = useState(children || []);
  const numberOfSlides = props?.children?.length || 0;
  const index = editor?.disabled ? selectedIndex || 0 : state?.index || 0;

  useEffect(() => {
    if (editor?.disabled) {
      setState({
        index: 0,
        length: numberOfSlides || 0,
      });
    }
  }, [editor?.disabled]);

  useEffect(() => {
    if (random && !editor.disabled) {
      // Set random
      console.log("set random");
      setSlides(shuffleArray(children));
    } else {
      setSlides(children);
    }
  }, [random, editor.disabled, children]);

  useEffect(() => {
    // Set initial state
    setState({ index: 0, length: numberOfSlides || 0 });
  }, [numberOfSlides, editor.disabled]);

  const handleNextSlide = useCallback(() => {
    console.log("@@@ next", isTransitioning);
    setIsTransitioning(true);
    setState({
      index: getNextSlideIndex(index, slides),
      length: numberOfSlides || 0,
    });
  }, [index, slides, numberOfSlides, isTransitioning]);

  const handlePrevSlide = useCallback(() => {
    console.log("@@@ prev", isTransitioning);
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

  useVevEvent(Events.SET, (args: { index: number }) => {
    setState({
      index: Number(args?.index),
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
          name: "index",
          type: "number",
        },
      ],
    },
  ],
});

export default Slideshow;

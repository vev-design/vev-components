import React, { useEffect, RefObject, useMemo, useState } from "react";
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
import { useNext, usePrev } from "./hooks";

import styles from "./Slideshow.module.css";

export type Props = {
  hostRef: RefObject<any>;
  children: string[];
  slides: string[];
  currentSlides: string[];
  onUpdateCurrentSlides: () => void;
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
  const reverse = props.direction?.includes("REVERSE");

  const [slides, setSlides] = useState(children || []);
  const numberOfSlides = props?.children?.length || 0;
  const index = editor?.disabled ? selectedIndex || 0 : state?.index || 0;

  const NEXT_SLIDE = useNext(index, slides);
  const PREV_SLIDE = usePrev(index, slides);

  const [currentSlides, setCurrentSlides] = useState([
    slides[PREV_SLIDE],
    slides[index],
    slides[NEXT_SLIDE],
  ]);

  useEffect(() => {
    if (editor?.disabled)
      return setCurrentSlides([
        slides[PREV_SLIDE],
        slides[index],
        slides[NEXT_SLIDE],
      ]);
  }, []);

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

  useTouch(hostRef, {
    // Enable touch
    onNext: () => setState(NEXT),
    onPrev: () => setState(PREV),
  });

  const NEXT = useMemo(() => {
    return {
      index:
        (state?.index || 0) === numberOfSlides - 1
          ? infinite
            ? 0
            : numberOfSlides - 1
          : state?.index + 1,
      length: numberOfSlides || 0,
    };
  }, [numberOfSlides, state?.index, infinite]);

  const PREV = useMemo(() => {
    return {
      index:
        state?.index === 0
          ? infinite
            ? numberOfSlides - 1
            : 0
          : state?.index - 1,
      length: numberOfSlides || 0,
    };
  }, [numberOfSlides, state?.index, infinite]);

  useVevEvent(Events.NEXT, () => {
    console.log("@@@ next", isTransitioning);
    if (isTransitioning) return;
    setIsTransitioning(true);
    setState(NEXT);
  });

  useVevEvent(Events.PREV, () => {
    console.log("@@@ prev", isTransitioning);
    if (isTransitioning) return;
    setIsTransitioning(true);
    console.log("prev", PREV);
    setState(PREV);
  });

  useVevEvent(Events.SET, (args: { index: number }) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
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
        currentSlides={currentSlides}
        speed={editor?.disabled ? 1 : props.speed}
        index={index}
        onUpdateCurrentSlides={() => {
          setIsTransitioning(false);
          setCurrentSlides([
            slides[PREV_SLIDE],
            slides[index],
            slides[NEXT_SLIDE],
          ]);
        }}
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

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

import styles from "./Slideshow.module.css";

export type Props = {
  hostRef: RefObject<any>;
  children: string[];
  slides: string[];
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
  const { children, animation, selectedIndex, random, infinite, hostRef } =
    props;

  const reverse = props.direction?.includes("REVERSE");

  const [randomSlides, setRandomSlides] = useState([]);
  const numberOfSlides = props?.children?.length || 0;

  useEffect(() => {
    if (random && !editor.disabled) {
      // Set random
      setRandomSlides(shuffleArray(children));
    }
  }, [random, editor.disabled, children]);

  useEffect(() => {
    // Set initial state
    setState({ index: 0, length: numberOfSlides || 0 });
  }, [numberOfSlides, editor.disabled]);

  useTouch(hostRef, {
    // Enable touch
    onNext: () => setState(NEXT_SLIDE),
    onPrev: () => setState(PREV_SLIDE),
  });

  const NEXT = useMemo(
    () => ({
      index:
        (state?.index || 0) === numberOfSlides - 1
          ? infinite
            ? 0
            : numberOfSlides - 1
          : state?.index + 1,
      length: numberOfSlides || 0,
    }),
    [numberOfSlides, state?.index, infinite]
  );

  const PREV = useMemo(
    () => ({
      index:
        state?.index === 0
          ? infinite
            ? numberOfSlides - 1
            : 0
          : state?.index - 1,
      length: numberOfSlides || 0,
    }),
    [numberOfSlides, state?.index, infinite]
  );

  const NEXT_SLIDE = reverse && animation === "slide" ? PREV : NEXT;
  const PREV_SLIDE = reverse ? NEXT : PREV;

  useVevEvent(Events.NEXT, () => {
    setState(NEXT_SLIDE);
  });

  useVevEvent(Events.PREV, () => {
    setState(PREV_SLIDE);
  });

  useVevEvent(Events.SET, (args: { index: number }) => {
    console.log("set", args);
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
        slides={editor.disabled ? children : random ? randomSlides : children}
        speed={editor?.disabled ? 1 : props.speed}
        index={editor?.disabled ? selectedIndex || 0 : state?.index || 0}
        preview={editor?.disabled}
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
      // hidden: (context) => !['slide', '3d'].includes(context.value?.animation),
      initialValue: "HORIZONTAL",
    },
    {
      name: "random",
      title: "Randomize",
      type: "boolean",
      // hidden: (context) => ['3d'].includes(context.value?.animation),
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

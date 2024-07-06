import {
  WidgetNode,
  registerVevComponent,
  useEditorState,
  useScrollTop,
  useVisible,
} from "@vev/react";
import React, { useLayoutEffect, useRef } from "react";
import styles from "./HorizontalScroll.module.css";
import { useViewAnimation, useViewTimeline } from "./hooks";

type Props = {
  children: string[];
  easing: string;
  reverse: boolean;
};

const HORIZONTAL_SCROLL_KEYFRAMES: PropertyIndexedKeyframes = {
  translate: ["0 0", "calc(100vw - 100%) 0"],
};

const HorizontalScroll = ({ children, easing, reverse }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTop = useScrollTop();
  const visible = useVisible(ref);
  const { disabled, activeContentChild, ...rest } = useEditorState();
  const timeline = useViewTimeline(ref);
  const showSlideKey: string | undefined = disabled
    ? activeContentChild
    : undefined;
  useViewAnimation(ref, HORIZONTAL_SCROLL_KEYFRAMES, timeline, !!showSlideKey, {
    direction: reverse ? "reverse" : undefined,
    easing: easing,
  });

  let cl = `${styles.wrapper}`;
  if (showSlideKey) cl += " " + styles.editSlides;
  if (visible) cl += " " + styles.visible;

  return (
    <div
      ref={ref}
      className={cl}
      style={
        {
          "--slide-count": children.length,
          flexDirection: reverse ? "row-reverse" : null,
        } as any
      }
    >
      {children.map(
        (childKey, index) =>
          (!activeContentChild || showSlideKey === childKey) && (
            <Slide
              key={childKey}
              id={childKey}
              index={index}
              selected={showSlideKey === childKey}
            />
          )
      )}
    </div>
  );
};

function Slide({
  id,
  selected,
  index,
}: {
  id: string;
  selected: boolean;
  index: number;
}) {
  let cl = styles.content;
  if (selected) cl += " " + styles.selected;
  return (
    <div className={cl} style={{ "--index": index } as any}>
      <WidgetNode id={id} />
    </div>
  );
}

registerVevComponent(HorizontalScroll, {
  name: "HorizontalScroll",
  props: [
    {
      type: "select",
      name: "easing",
      initialValue: "linear",
      options: {
        display: "autocomplete",
        items: [
          {
            label: "linear",
            value: "linear",
          },
          { label: "ease", value: "ease" },
          {
            label: "ease-in",
            value: "ease-in",
          },
          {
            label: "ease-out",
            value: "ease-out",
          },
          {
            label: "ease-in-out",
            value: "ease-in-out",
          },
          {
            label: "ease-in-quad",
            value: "cubic-bezier(0.550, 0.085, 0.680, 0.530)",
          },
          {
            label: "ease-in-cubic",
            value: "cubic-bezier(0.550, 0.055, 0.675, 0.190)",
          },
          {
            label: "ease-in-quart",
            value: "cubic-bezier(0.895, 0.030, 0.685, 0.220)",
          },
          {
            label: "ease-in-quint",
            value: "cubic-bezier(0.755, 0.050, 0.855, 0.060)",
          },
          {
            label: "ease-in-sine",
            value: "cubic-bezier(0.470, 0.000, 0.745, 0.715)",
          },
          {
            label: "ease-in-expo",
            value: "cubic-bezier(0.950, 0.050, 0.795, 0.035)",
          },
          {
            label: "ease-in-circ",
            value: "cubic-bezier(0.600, 0.040, 0.980, 0.335)",
          },
          {
            label: "ease-in-back",
            value: "cubic-bezier(0.600, -0.280, 0.735, 0.045)",
          },
          {
            label: "ease-out-quad",
            value: "cubic-bezier(0.250, 0.460, 0.450, 0.940)",
          },
          {
            label: "ease-out-cubic",
            value: "cubic-bezier(0.215, 0.610, 0.355, 1.000)",
          },
          {
            label: "ease-out-quart",
            value: "cubic-bezier(0.165, 0.840, 0.440, 1.000)",
          },
          {
            label: "ease-out-quint",
            value: "cubic-bezier(0.230, 1.000, 0.320, 1.000)",
          },
          {
            label: "ease-out-sine",
            value: "cubic-bezier(0.390, 0.575, 0.565, 1.000)",
          },
          {
            label: "ease-out-expo",
            value: "cubic-bezier(0.190, 1.000, 0.220, 1.000)",
          },
          {
            label: "ease-out-circ",
            value: "cubic-bezier(0.075, 0.820, 0.165, 1.000)",
          },
          {
            label: "ease-out-back",
            value: "cubic-bezier(0.175, 0.885, 0.320, 1.275)",
          },
          {
            label: "ease-in-out-quad",
            value: "cubic-bezier(0.455, 0.030, 0.515, 0.955)",
          },
          {
            label: "ease-in-out-cubic",
            value: "cubic-bezier(0.645, 0.045, 0.355, 1.000)",
          },
          {
            label: "ease-in-out-quart",
            value: "cubic-bezier(0.770, 0.000, 0.175, 1.000)",
          },
          {
            label: "ease-in-out-quint",
            value: "cubic-bezier(0.860, 0.000, 0.070, 1.000)",
          },
          {
            label: "ease-in-out-sine",
            value: "cubic-bezier(0.445, 0.050, 0.550, 0.950)",
          },
          {
            label: "ease-in-out-expo",
            value: "cubic-bezier(1.000, 0.000, 0.000, 1.000)",
          },
          {
            label: "ease-in-out-circ",
            value: "cubic-bezier(0.785, 0.135, 0.150, 0.860)",
          },
          {
            label: "ease-in-out-back",
            value: "cubic-bezier(0.680, -0.550, 0.265, 1.550)",
          },
        ],
      },
    },
    {
      type: "boolean",
      name: "reverse",
    },
  ],
  children: {
    name: "Slide",
  },
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: "standard",
});

export default HorizontalScroll;

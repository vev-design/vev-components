import { registerVevComponent, useEditorState } from "@vev/react";
import React, { useLayoutEffect, useRef } from "react";
import { useViewAnimation, useViewTimeline } from "../../hooks";
import { RevealSlide } from "./RevealSlide";
import styles from "./ScrollingSlide.module.css";
import { SimpleSlide } from "./SimpleSlide";

type Props = {
  children: string[];
  hostRef: React.RefObject<HTMLDivElement>;
  type: "horizontal" | "horizontal-reverse" | "stack" | "reveal";
  settings?: { [key: string]: any };
};

const ScrollingSlide = ({ children, type, settings, hostRef }: Props) => {
  if (!type) type = "horizontal";
  const ref = useRef<HTMLDivElement>(null);
  const { disabled, activeContentChild, ...rest } = useEditorState();
  const timeline = useViewTimeline(ref);
  const showSlideKey: string | undefined = disabled
    ? activeContentChild
    : undefined;
  useViewAnimation(
    ref,
    {
      translate: ["0 0", `${-100 + 100 / children.length}% 0`],
    },
    timeline,
    !!showSlideKey || !(!type || type.includes("horizontal")),
    {
      direction: settings?.reverse ? "reverse" : undefined,
      easing: settings?.easing,
    }
  );

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (el && showSlideKey && disabled) {
      const ogHeight = el.clientHeight;
      // No need to pin position if content is smaller than viewport
      if (ogHeight < window.innerHeight) return;

      const originalOffsetTop = el.getBoundingClientRect().top + window.scrollY;
      const update = () => {
        el.style.marginTop = window.scrollY - originalOffsetTop + "px";
        // hack to force editor to update frame
        el.style.height = `${ogHeight + Math.random()}px`;
      };
      window.addEventListener("scroll", update);
      update();
      return () => {
        window.removeEventListener("scroll", update);
        el.style.removeProperty("height");
        el.style.removeProperty("margin-top");
      };
    }
  }, [showSlideKey, disabled]);

  let cl = `${styles.wrapper}`;
  if (showSlideKey) cl += " " + styles.editSlides;
  if (type) cl += " " + styles[type];
  if (type === "horizontal" && settings?.reverse) cl += " " + styles.reverse;

  const Comp = type === "reveal" ? RevealSlide : SimpleSlide;
  console.log("IM HERE 123");
  return (
    <div
      ref={ref}
      className={cl}
      style={
        {
          "--slide-count": children.length,
        } as any
      }
    >
      {children.map(
        (childKey, index) =>
          (!activeContentChild || showSlideKey === childKey) && (
            <Comp
              key={childKey}
              id={childKey}
              index={index}
              slideCount={children.length}
              timeline={timeline}
              selected={showSlideKey === childKey}
              settings={settings}
              disabled={disabled}
            />
          )
      )}
    </div>
  );
};

export default ScrollingSlide;

registerVevComponent(ScrollingSlide, {
  name: "Scrolling slides",
  props: [
    {
      type: "select",
      name: "type",
      initialValue: "horizontal",
      options: {
        display: "dropdown",
        items: [
          { value: "horizontal", label: "Horizontal scroll" },
          { value: "stack", label: "Stack" },
          { value: "reveal", label: "Reveal" },
        ],
      },
    },
    {
      type: "object",
      name: "settings",
      hidden: (context) => {
        return context.value?.type === "stack";
      },
      fields: [
        {
          type: "boolean",
          name: "reverse",
          hidden: (context) => {
            return context.value?.type !== "horizontal";
          },
        },
        {
          type: "select",
          name: "effect",
          initialValue: "fade",
          hidden: (context) => {
            return context.value?.type !== "reveal";
          },
          options: {
            display: "dropdown",

            items: [
              { value: "fade", label: "Fade" },
              {
                value: "vertical-reveal",
                label: "Vertical reveal",
              },
              {
                value: "horizontal-reveal",
                label: "Horizontal reveal",
              },
              {
                value: "circle",
                label: "Circle",
              },
            ],
          },
        },
        {
          type: "select",
          name: "easing",
          initialValue: "linear",
          hidden: (context) => {
            return context.value?.type !== "horizontal";
          },
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
      ],
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

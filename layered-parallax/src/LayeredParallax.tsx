import React, { useEffect, useLayoutEffect, useRef } from "react";
import styles from "./LayeredParallax.module.css";
import {
  ArrayField,
  SchemaFieldProps,
  WidgetNode,
  raf,
  registerVevComponent,
  useEditorState,
} from "@vev/react";
import { Layer } from "./Layer";
import { SilkeCssNumberField, SilkeBox } from "@vev/silke";

type AxisEffect = "none" | "mouse" | "scroll" | "both";
const MAGIC_NUMBER = 30;

type Props = {
  layerDepth: number[];
  damping?: number;
  movementX?: number;
  movementY?: number;
  effectX: AxisEffect;
  effectY: AxisEffect;
  rotate?: number;
  perspective?: number;
  children?: string[];
};
const setVar = (
  el: HTMLDivElement,
  prop: "x" | "y" | "movement-x" | "movement-y" | "rotate" | "perspective",
  value: number
) => {
  el.style.setProperty("--" + prop, value + "");
};

const LayeredParallax = ({
  effectX,
  effectY,
  movementX,
  movementY,
  damping = 0.1,
  layerDepth,
  rotate,
  perspective,
  children,
}: Props) => {
  const { disabled, selected, activeContentFrame, activeContentChild } =
    useEditorState();

  const ref = useRef<HTMLDivElement>(null);

  const stepSize = 0.75 / children.length;
  useEffect(() => {
    setVar(ref.current, "movement-x", movementX || 40);
    setVar(ref.current, "movement-y", movementY || 80);
    setVar(ref.current, "rotate", rotate || 0);
    setVar(ref.current, "perspective", perspective * 5000 || 0);
  }, [movementX, movementY, perspective, rotate]);

  useLayoutEffect(() => {
    const el = ref.current;

    if (disabled) {
      setVar(el, "x", 0.5);
      setVar(el, "y", 0.5);
      return;
    }

    const desiredMouse = [0.5, 0.5];
    const desiredScroll = [0.5, 1];
    const current = [0.5, 0.5];
    const axisName: ["x", "y"] = ["x", "y"];
    let elementInfo: [offsetTop: number, height: number];
    let lastFrame = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      desiredMouse[0] = 1 - clientX / innerWidth;
      desiredMouse[1] = 1 - clientY / innerHeight;
    };

    const getOffsetTop = (el: HTMLElement) => {
      let offsetTop = 0;
      do {
        if (!isNaN(el.offsetTop)) {
          offsetTop += el.offsetTop;
        }
      } while ((el = el.offsetParent as HTMLElement));
      return offsetTop;
    };

    const getProgressAcrossScreen = (el: HTMLElement) => {
      if (!elementInfo) elementInfo = [getOffsetTop(el), el.offsetHeight];
      const [offsetTop, height] = elementInfo;

      const duration = Math.min(window.innerHeight, offsetTop) + height;
      const top = offsetTop - window.scrollY;
      const progress = Math.min(1, Math.max(0, 1 - (top + height) / duration));

      return progress;
    };

    const handleScroll = (e) => {
      desiredScroll[1] = 1 - getProgressAcrossScreen(el);
    };

    const handleMotion = (e: DeviceOrientationEvent) => {
      const { beta, gamma } = e;
      if (beta !== null && gamma !== null) {
        const range = 90;
        const yPercent = 1 - (beta + range / 2) / range;
        const xPercent = 1 - (gamma + range / 2) / range;
        // Detect Orientation Change
        const portrait = window.innerHeight > window.innerWidth;
        if (portrait) {
        }

        desiredMouse[0] = Math.max(0, Math.min(1, xPercent));
        desiredMouse[1] = Math.max(0, Math.min(1, yPercent));
      }
    };

    if (effectX === "mouse" || effectY === "mouse" || effectY === "both") {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("deviceorientation", handleMotion);
    }

    if (effectY === "scroll" || effectY === "both") {
      window.addEventListener("scroll", handleScroll, { passive: true });
      setVar(el, "y", getProgressAcrossScreen(el));
    }

    const unSub = raf((time) => {
      if (time - lastFrame > 500) elementInfo = undefined;
      lastFrame = time;

      for (let i = 0; i < 2; i++) {
        let desired = current[i];

        if (i === 1 && effectY === "scroll") {
          desired = desiredScroll[i];
        } else if (i === 1 && effectY === "both") {
          desired = desiredScroll[i] * 0.8 + desiredMouse[i] * 0.2;
        } else {
          desired = desiredMouse[i];
        }
        const diff = desired - current[i];
        if (diff) {
          current[i] += diff * damping;
          if (Math.abs(current[i] - desired) < 0.01) current[i] = desired;
          setVar(el, axisName[i], Math.round(current[i] * 1000) / 1000);
        }
      }
    }, true);
    return () => {
      unSub();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("deviceorientation", handleMotion);
    };
  }, [disabled, damping, effectX, effectY]);

  if (!children?.length) {
    return <div className={styles.empty}>No layers</div>;
  }

  let cl = styles.wrapper;
  if (rotate) cl += " " + styles.rotate;

  return (
    <div className={cl} ref={ref}>
      {children?.map((child: string, i: number) => (
        <Layer
          key={child}
          modelId={child}
          disabled={
            !selected && activeContentChild
              ? activeContentChild !== child
              : false
          }
          selected={activeContentChild === child}
          depth={
            typeof layerDepth?.[i] === "number"
              ? layerDepth?.[i]
              : 0.25 + stepSize * i
          }
        />
      ))}
    </div>
  );
};

function LayerDepthField(props: SchemaFieldProps<ArrayField>) {
  const children: string[] = props.context.value?.children || [];
  const stepSize = 75 / children.length;
  const depth = props.value || [];

  return (
    <SilkeBox column gap="s" flex>
      {children.map((child: string, i: number) => (
        <SilkeBox gap="s" flex>
          <SilkeBox flex vAlign="center">
            Layer {i + 1} movment
          </SilkeBox>
          <SilkeCssNumberField
            key={child}
            width={80}
            value={
              (typeof depth[i] === "number"
                ? Math.round(depth[i] * 100)
                : 25 + stepSize * i) + "%"
            }
            onChange={(d: string) => {
              const newDepth = [...depth];
              newDepth[i] = parseFloat(d) / 100;
              props.onChange(newDepth);
            }}
          />
        </SilkeBox>
      ))}
    </SilkeBox>
  );
}

registerVevComponent(LayeredParallax, {
  name: "Parallax",
  type: "both",
  children: {
    name: "Layer",
    icon: "https://cdn.vev.design/private/dk3UctceTPWKJtA1g8n4EFqTvuo2/image/3GFUgAdpeb.svg",
  },
  props: [
    {
      name: "effectX",
      title: "Effect X",
      type: "select",
      initialValue: "mouse",
      options: {
        display: "dropdown",
        items: [
          { label: "None", value: "none" },
          { label: "Mouse/Gyroscope", value: "mouse" },
        ],
      },
    },
    {
      name: "effectY",
      title: "Effect Y",
      type: "select",
      initialValue: "scroll",
      options: {
        display: "dropdown",
        items: [
          { label: "None", value: "none" },
          { label: "Scroll/Mouse/Gyroscope", value: "both" },
          { label: "Mouse/Gyroscope", value: "mouse" },
          { label: "Scroll", value: "scroll" },
        ],
      },
    },
    { name: "movementX", type: "number", initialValue: 40 },
    { name: "movementY", type: "number", initialValue: 80 },
    {
      name: "rotate",
      type: "number",
      initialValue: 0,
      title: "3D Rotation",
      options: { display: "slider", min: 0, max: 1 },
    },
    {
      name: "perspective",
      title: "Depth effect",
      hidden: (props) => !props.value?.rotate,
      type: "number",
      initialValue: 1000,
      options: { display: "slider", min: 0, max: 1 },
    },

    { name: "damping", type: "number", initialValue: 0.1 },

    { name: "layerDepth", type: "array", component: LayerDepthField },
  ],

  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
});

export default LayeredParallax;

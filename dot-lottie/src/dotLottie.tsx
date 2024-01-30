import React, { useEffect, useMemo, useRef } from "react";
import styles from "./dotLottie.module.css";
import {
  registerVevComponent,
  useScrollTop,
  useVisible,
  View,
  useDispatchVevEvent,
  useVevEvent,
} from "@vev/react";
import { EventTypes, InteractionTypes } from "./event-types";
import { DotLottiePlayer, PlayMode } from "@johanaarstein/dotlottie-player";

type Props = {
  file: {
    name: string;
    size: number;
    type: string;
    url: string;
  };
  settings: {
    controls: boolean;
  };
  animation: {
    loop: boolean;
    speed: number;
    delay: number;
    scrollOffsetStart: number;
    scrollOffsetStop: number;
    onscroll: boolean;
    mode: "normal" | "bounce";
  };
};

const defaultAnimation =
  "https://cdn.vev.design/private/an2K3NyIunQ4E5tG3LwwGhVDbi23/cea-animation.lottie";

const DotLottie = ({ file, settings, animation }: Props) => {
  // Default values
  const controls = settings.controls || false;
  const loop = animation.loop || true;
  const onscroll = animation.onscroll || false;
  const speed = animation.speed || 1000;
  const delay = animation.delay || 0;
  const scrollOffsetStart = animation.scrollOffsetStart || 0;
  const scrollOffsetStop = animation.scrollOffsetStop || 0;
  const mode = animation.mode || "normal";

  const animationRef = useRef<DotLottiePlayer | null>(null);
  const isVisible = useVisible(animationRef);
  const scrollTop = useScrollTop(true);
  const actualUrl = (file && file.url) || defaultAnimation;
  const dispatch = useDispatchVevEvent();

  useVevEvent(InteractionTypes.PLAY, () => {
    console.log("EVENT");
    if (animationRef.current) {
      setTimeout(() => {
        animationRef.current.play();
      }, delay);
    }
  });

  useVevEvent(InteractionTypes.PAUSE, () => {
    if (animationRef.current) {
      animationRef.current.pause();
    }
  });

  useVevEvent(InteractionTypes.TOGGLE, () => {
    if (animationRef.current) {
      setTimeout(() => {
        animationRef.current.togglePlay();
      }, delay);
    }
  });

  useEffect(() => {
    if (animationRef.current) {
      // Hack to make the DotLottiePlayer respect the values set :(
      setTimeout(() => {
        animationRef.current.controls = controls;
        animationRef.current.getLottie().setLoop(loop);
        animationRef.current.setSpeed(speed);
        animationRef.current.mode =
          mode === "normal" ? PlayMode.Normal : PlayMode.Bounce;

        animationRef.current.onplay = () => {
          dispatch(EventTypes.PLAY);
        };

        animationRef.current.onpause = () => {
          dispatch(EventTypes.PAUSE);
        };

        animationRef.current.addEventListener("complete", () => {
          dispatch(EventTypes.COMPLETE);
        });

        animationRef.current.addEventListener("loop", () => {
          dispatch(EventTypes.LOOP_COMPLETE);
        });
      }, 100);
    }
  }, [animationRef, speed, loop, controls, mode]);

  // Scroll trigger
  useEffect(() => {
    const lottie =
      animationRef && animationRef.current && animationRef.current.getLottie();
    if (lottie) {
      if (onscroll && lottie.totalFrames) {
        let percent: number;
        if (isVisible) {
          const rect = animationRef.current.getBoundingClientRect();
          percent =
            (rect.top + scrollOffsetStart + rect.height) /
            (View.height + rect.height + scrollOffsetStop);
        } else percent = 1 - scrollTop;
        lottie.goToAndStop(
          (lottie.totalFrames / lottie.frameRate) * 1000 * (1 - percent)
        );
      }
    }
  }, [onscroll, isVisible, scrollOffsetStart, scrollOffsetStop, scrollTop]);

  // Hack to make this annoying web component thing reload its props when it should
  const comp = useMemo(() => {
    return (
      <div key={Date.now()}>
        <dotlottie-player ref={animationRef} src={actualUrl} />
      </div>
    );
  }, [actualUrl, onscroll, mode]);

  return <div className={styles.wrapper}>{comp}</div>;
};

registerVevComponent(DotLottie, {
  name: "dotLottie",
  props: [
    {
      title: "Lottie file",
      name: "file",
      description: "Only .lottie file supported",
      type: "upload",
      accept: ".lottie,",
    },
    {
      title: "Settings",
      name: "settings",
      type: "object",
      fields: [
        {
          title: "Controls",
          name: "controls",
          type: "boolean",
          initialValue: false,
        },
      ],
    },
    {
      title: "Animation",
      name: "animation",
      type: "object",
      fields: [
        {
          title: "Playback speed",
          name: "speed",
          type: "number",
          initialValue: 1000,
          options: {
            format: "ms",
          },
        },
        {
          title: "Loop",
          name: "loop",
          type: "boolean",
          initialValue: true,
          hidden: (context) => {
            return context.value.animation.onscroll === true;
          },
        },
        {
          title: "Animate on scroll",
          name: "onscroll",
          type: "boolean",
          initialValue: false,
          hidden: (context) => {
            return context.value.animation.loop === true;
          },
        },
        {
          title: "Loop behavior",
          name: "mode",
          type: "select",
          initialValue: "normal",
          options: {
            display: "dropdown",
            items: [
              { label: "Normal", value: "normal" },
              { label: "Bounce", value: "bounce" },
            ],
          },
          hidden: (context) => {
            return context.value.animation.loop !== true;
          },
        },
        {
          title: "Delay",
          name: "delay",
          type: "number",
          initialValue: 1000,
          options: {
            format: "ms",
          },
          hidden: (context) => context.value.animation.loop !== true,
        },
        {
          title: "Offset start",
          name: "scrollOffsetStart",
          description: "Start animation x pixels later",
          type: "number",
          initialValue: 0,
          hidden: (context) => {
            return context.value.animation.onscroll !== true;
          },
        },
        {
          title: "Offset stop",
          name: "scrollOffsetStop",
          description: "Stop animation x pixels later",
          type: "number",
          initialValue: 0,
          hidden: (context) => {
            return context.value.animation.onscroll !== true;
          },
        },
      ],
    },
  ],
  interactions: [
    {
      type: InteractionTypes.PLAY,
      description: "Play",
    },
    {
      type: InteractionTypes.PAUSE,
      description: "Pause",
    },
    {
      type: InteractionTypes.TOGGLE,
      description: "Toggle",
    },
  ],
  events: [
    {
      type: EventTypes.PLAY,
      description: "On play",
    },
    {
      type: EventTypes.PAUSE,
      description: "On pause",
    },
    {
      type: EventTypes.COMPLETE,
      description: "On complete",
    },
    {
      type: EventTypes.LOOP_COMPLETE,
      description: "On loop complete",
    },
  ],
  editableCSS: [
    {
      title: "Animation",
      selector: styles.wrapper,
      properties: ["background", "padding", "border", "border-radius"],
    },
  ],
  type: "standard",
});

export default DotLottie;

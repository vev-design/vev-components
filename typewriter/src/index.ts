import { registerVevComponent } from "@vev/react";
import Typewriter from "./Typewriter";
import styles from "./Typewriter.module.css";

export enum TypewriterInteraction {
  play = "play",
  restart = "restart",
  pause = "pause",
}

registerVevComponent(Typewriter, {
  name: "Typewriter",
  props: [
    {
      name: "before",
      type: "string",
      title: "Static text before animation",
      initialValue: "This is ",
    },
    {
      name: "words",
      title: "Animated text items",
      type: "array",
      of: "string",
      initialValue: ["typewriter", "no-code", "Vev"],
    },
    {
      name: "after",
      title: "Static text after animation",
      type: "string",
    },
    {
      name: "timer",
      title: "Transition speed",
      type: "number",
      initialValue: 20,
      options: {
        format: "ms",
      },
    },
    {
      name: "pauseOnStart",
      title: "Pause on start",
      type: "boolean",
      initialValue: false,
    },
    {
      name: "loop",
      type: "boolean",
      initialValue: true,
    },
  ],
  editableCSS: [
    {
      selector: styles.words,
      title: "Paragraph",
      properties: [
        "font-size",
        "font-weight",
        "color",
        "text-align",
        "font-family",
        "letter-spacing",
        "word-spacing",
        "line-height",
        "columns",
        "text-shadow",
        "text-transform",
      ],
    },
  ],
  type: "standard",
  icon: "https://cdn.vev.design/private/5YlQ6CapVRbr7RUqaPTH7gT1clH2/rm-typewriter-svg",
  description:
    "Alternate through a list of custom phrases in a type-writer like fashion.",
  interactions: [
    {
      type: TypewriterInteraction.play,
      description: "Start typewriter",
    },
    {
      type: TypewriterInteraction.restart,
      description: "Restart typewriter",
    },
    {
      type: TypewriterInteraction.pause,
      description: "Pause typewriter",
    },
  ],
});

export default Typewriter;

import { registerVevComponent } from "@vev/react";
import Typewriter from "./Typewriter";
import styles from "./Typewriter.module.css";

registerVevComponent(Typewriter, {
  name: "Typewriter",
  props: [
    {
      name: "words",
      type: "array",
      of: "string",
      initialValue: ["typewriter", "no-code", "Vev"],
    },
    {
      name: "before",
      type: "string",
      initialValue: "This is ",
    },
    {
      name: "after",
      type: "string",
    },
    {
      name: "timer",
      type: "number",
      initialValue: 20,
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
});

export default Typewriter;

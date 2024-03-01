import { registerVevComponent } from "@vev/react";
import AnimationForm from "./form";
import AnimationCSS from "./AnimationCSS";

registerVevComponent(AnimationCSS, {
  type: "action",
  name: "Animate CSS",
  props: [
    {
      type: "array",
      name: "animations",
      component: AnimationForm,
    } as any,
  ],
});

export default AnimationCSS;

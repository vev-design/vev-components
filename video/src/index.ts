import { registerVevComponent } from "@vev/react";
import Video from "./Video";
import styles from "./Video.module.css";

registerVevComponent(Video, {
  name: "Video",
  props: [{ name: "video", type: "upload", accept: "video/*" }],
  editableCSS: [
    {
      selector: ":host",
      properties: ["background", "border", "border-radius", "box-shadow"],
    },
    {
      selector: styles.overlay,
      properties: ["background", "opacity"],
    },
  ],
  type: "both",
});

export default Video;

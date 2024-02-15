import React, { useEffect, useRef } from "react";
import styles from "./Spline.module.css";
import { registerVevComponent } from "@vev/react";

type Props = {
  sceneUrl: string;
  hostRef: React.RefObject<HTMLDivElement>;
};

const scriptAlreadyExists = () =>
  document.querySelector('script#spline-viewer') !== null

const Spline = ({
                  sceneUrl = "https://my.spline.design/carcampingphysicscopy-56fe6d4adf9415188037704bd4b6d775/",
}: Props) => {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
      const tag = document.createElement("script");
      tag.type = "module";
      tag.id = "script#spline-viewer";
      tag.src = "https://unpkg.com/@splinetool/viewer/build/spline-viewer.js";
      document.body.appendChild(tag);
  }, []);

  return (
    <div className={styles.wrapper}>
      <spline-viewer url={sceneUrl} loading-anim-type="spinner-small-dark"></spline-viewer>
    </div>
  );
};

registerVevComponent(Spline, {
  name: "Spline",
  emptyState: {
    linkText: "Add URL",
    description: " to your Spline scene",
    checkProperty: "sceneUrl",
    action: "OPEN_PROPERTIES"
  },
  description:
    "Embed interactive experiences made with Spline into your Vev project by copying the public URL in Spline and inserting it into the Spline element.",
  props: [
    {
      name: "sceneUrl",
      title: "Spline Scene URL",
      type: "string",
      options: {
        multiline: true,
      },
    },
  ],
  editableCSS: [
    {
      title: "Spline",
      selector: styles.wrapper,
      properties: ["background", "border-radius", "border", "filter"],
    },
  ],
  type: "both",
});

export default Spline;

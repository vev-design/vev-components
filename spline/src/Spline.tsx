import React, { useRef } from "react";
import styles from "./Spline.module.css";
import { registerVevComponent } from "@vev/react";

type Props = {
  formUrl: string;
  hostRef: React.RefObject<HTMLDivElement>;
};

const Spline = ({
  formUrl = "https://my.spline.design/carcampingphysicscopy-56fe6d4adf9415188037704bd4b6d775/",
}: Props) => {
  const frameRef = useRef<HTMLIFrameElement>(null);

  if (formUrl === "") {
    return (
      <div className={styles.info}>
        <h3>Double-click this Element to add your Spline URL</h3>
      </div>
    );
  }

  return (
    <iframe
      src={formUrl}
      ref={frameRef}
      className={styles.wrapper}
      frameBorder={0}
      marginHeight={0}
      marginWidth={0}
    >
      Loading…
    </iframe>
  );
};

registerVevComponent(Spline, {
  name: "Spline",
  description:
    "Embed interactive experiences made with Spline into your Vev project by copying the public URL in Spline and inserting it into the Spline element.",
  props: [
    {
      name: "formUrl",
      title: "Spline URL",
      type: "string",
      initialValue: "",
      options: {
        multiline: true,
      },
    },
  ],
  type: "both",
});

export default Spline;

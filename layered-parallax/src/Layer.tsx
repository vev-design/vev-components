import { WidgetNode } from "@vev/react";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import styles from "./LayeredParallax.module.css";
type LayerProps = {
  modelId: string;
  depth: number;
  disabled?: boolean;
  selected?: boolean;
};

export function Layer({ modelId, depth, disabled, selected }: LayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    el.style.setProperty("--depth", depth + "");
  }, [depth]);

  let cl = styles.layer;
  if (disabled) cl += " " + styles.disabled;

  return (
    <div className={cl} ref={ref}>
      <WidgetNode id={modelId} />
    </div>
  );
}

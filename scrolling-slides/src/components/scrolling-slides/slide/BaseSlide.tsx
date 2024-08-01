import React, { ForwardedRef } from "react";

import styles from "../ScrollingSlide.module.css";
import { WidgetNode } from "@vev/react";

export type BaseSlideProps = {
  id: string;
  selected: boolean;
  index: number;
  slideCount: number;
  timeline?: ViewTimeline;
  settings?: { [key: string]: any };
  disabled?: boolean;
  style?: React.CSSProperties;
};
export const BaseSlide = React.forwardRef(
  (
    { selected, id, index, settings, slideCount, style }: BaseSlideProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    let cl = styles.content;
    if (selected) cl += " " + styles.selected;
    return (
      <div
        className={cl}
        ref={ref}
        style={
          {
            ...style,
            zIndex: settings?.reverse ? slideCount - index : index,
          } as any
        }
      >
        <WidgetNode id={id} />
      </div>
    );
  }
);

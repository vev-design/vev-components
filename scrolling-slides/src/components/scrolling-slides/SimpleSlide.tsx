import React from "react";

import styles from "./ScrollingSlide.module.css";
import { WidgetNode } from "@vev/react";

export type SimpleSlideProps = {
  id: string;
  selected: boolean;
  index: number;
  slideCount: number;
  timeline?: ViewTimeline;
  settings?: { [key: string]: any };
  disabled?: boolean;
};
export function SimpleSlide({ selected, id }: SimpleSlideProps) {
  let cl = styles.content;
  if (selected) cl += " " + styles.selected;
  console.log("HELLO", id);
  return (
    <div className={cl}>
      <WidgetNode id={id} />
    </div>
  );
}

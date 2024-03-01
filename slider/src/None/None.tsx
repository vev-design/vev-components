import React from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slider";

export const None = ({ slides, index }: Props) => {
  return <WidgetNode id={slides[index]} />;
};

import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { WidgetNode } from "@vev/react";
import { Props } from "../Slider";

export const None = ({
  currentSlide,
}: Omit<Props, "children"> & {
  index: number;
  preview?: boolean;
}) => {
  return <WidgetNode id={currentSlide} />;
};

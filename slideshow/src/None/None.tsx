import React from "react";
import { Props } from "../Slideshow";
import Zoom from "../Zoom";

export const None = (props: Omit<Props, "children"> & { index: number }) => {
  return <Zoom {...props} scaleFactor={100} speed={0.1} />;
};

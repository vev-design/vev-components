import { LottieColor } from "../types";
import rgbToHsl from "./rgbToHsl";

const sortLottieColors = (colors: LottieColor[]): any => {
  return colors
    .map((c, i) => ({
      color: rgbToHsl(c[0], c[1], c[2]),
      index: i,
    }))
    .sort((c1, c2) => {
      if (c1.color[0] === c2.color[0]) {
        if (c1.color[1] === c2.color[1]) {
          return c1.color[2] - c2.color[2];
        }
        return c1.color[1] - c2.color[1];
      }
      return c1.color[0] - c2.color[0];
    })
    .map((data) => colors[data.index]);
};

export default sortLottieColors;

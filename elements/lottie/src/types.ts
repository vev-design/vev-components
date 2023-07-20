export type File = {
  name: string;
  size: number;
  type: string;
  url: string;
};

export type LottieColor = [number, number, number, number];

export type LottieColorReplacement = {
  oldColor: LottieColor;
  newColor: string;
};

export function easingNone(x: number) {
  return x;
}

export function easeOut(x: number): number {
  return round(x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
}

export function easeIn(x: number): number {
  return round(x === 0 ? 0 : Math.pow(2, 10 * x - 10));
}

export function normalize(val: number, min: number, max: number) {
  return round((val - min) / (max - min));
}

export function round(val: number) {
  return parseFloat(val.toFixed(6));
}

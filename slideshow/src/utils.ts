export const randomize = (max: number, current: number) => {
  let number = Math.floor(Math.random() * max);
  if (number === current) number = randomize(max, current);
  return number;
};

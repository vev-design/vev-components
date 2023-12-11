export const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[randomIndex]] = [newArray[randomIndex], newArray[i]];
  }
  return newArray;
};

export const getNextSlideIndex = (index: number, slides: string[]): number =>
  slides.length < 2 ? 1 : index + 1 === slides?.length ? 0 : index + 1;

export const getPrevSlideIndex = (index: number, slides: string[]): number =>
  slides?.length < 2 ? 1 : index === 0 ? (slides?.length || 0) - 1 : index - 1;

export const isGoingForward = (index: number, prevIndex: number, total: number) =>
  index === prevIndex + 1 || (prevIndex === total - 1 && index === 0 && total !== 1);

export const isGoingBackward = (index: number, prevIndex: number, total: number) =>
  index === prevIndex - 1 || (prevIndex === 0 && index === total - 1 && total !== 1);

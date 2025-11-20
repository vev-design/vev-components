export const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[randomIndex]] = [newArray[randomIndex], newArray[i]];
  }
  return newArray;
};

export const getNextSlideIndex = (index = 0, slides: string[] = []): number => {
  if (slides.length === 1) {
    return index === 0 ? 1 : 0;
  };
  return index + 1 === slides?.length ? 0 : index + 1;
};

export const getPrevSlideIndex = (index = 0, slides: string[] = []): number => {
  if (slides.length === 1) {
    return index === 0 ? 1 : 0;
  };
  return index === 0 ? (slides?.length || 0) - 1 : index - 1;
}

export const isGoingForward = (
  index = 0,
  prevIndex: number = 0,
  total: number,
): boolean => {
  if (index === prevIndex) return false;
  if (total <= 1) return true;
  return index === prevIndex + 1 || (prevIndex === total - 1 && index === 0);
};

export const isGoingBackward = (index = 0, prevIndex: number, total: number): boolean => {
  if (index === prevIndex) return false;
  if (total <= 1) return true;
  return index === prevIndex - 1 || (prevIndex === 0 && index === total - 1);

}

export const tempId = () => 'tmp-' + Math.random().toString(16).slice(2);

export const checkIfKeyIsDuplicatedInArray = (arr: string[], key: string) => {
  const isDuplicated = arr.filter((item) => item === key).length > 1;
  return isDuplicated;
};

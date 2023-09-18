export const getNextSlide = (index: number, slides: string[]): number =>
  slides.length < 2 ? 1 : index + 1 === slides?.length ? 0 : index + 1;

export const getPrevSlide = (index: number, slides: string[]): number =>
  slides?.length < 2 ? 1 : index === 0 ? (slides?.length || 0) - 1 : index - 1;

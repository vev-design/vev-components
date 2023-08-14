import { useMemo } from 'react';

export const useNext = (index: number, slides: string[]) =>
  useMemo(
    () => (slides.length < 2 ? 1 : index + 1 === slides?.length ? 0 : index + 1),
    [index, slides],
  );

export const usePrev = (index: number, slides: string[]) =>
  useMemo(
    () => (slides?.length < 2 ? 1 : index === 0 ? (slides?.length || 0) - 1 : index - 1),
    [index, slides],
  );

import { Rive as RiveCanvas } from '@rive-app/canvas';
import { RiveFileContents } from './types';

export async function getRiveContent(file: { url: string }): Promise<RiveFileContents | null> {
  if (!file || !file.url) {
    return null;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const riveCanvas = new RiveCanvas({
      src: file.url,
      canvas,
      onLoad: () => {
        const content: RiveFileContents = riveCanvas.contents;
        riveCanvas.cleanup();
        riveCanvas.deleteRiveRenderer();
        resolve(content);
      },
    });
  });
}

export function debounce(cb: () => void, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      cb();
    }, ms);
  };
}

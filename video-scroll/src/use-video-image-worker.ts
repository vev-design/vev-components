import { useEffect, useRef } from "react";
// @ts-ignore
import ImageWorker from "./image-load-worker?worker";

function resolveImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = url;
  });
}
export function useVideoImageWorker(images: string[]) {
  const imagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const imageElements = new Array(images.length);
    imagesRef.current = imageElements;
    const worker = new ImageWorker();

    worker.addEventListener('message', async (e: any) => {
      const { url, index } = e.data as { index: number; url: string };
      const img = await resolveImage(url);
      const images = imagesRef.current;
      if (images && img) images[index] = img;
    });

    const host = self.location.origin;
    const dir = ((window as any).vev as any)?.getState()?.dir;
    const parentLocation = `${host}${dir ? '/' + dir : ''}`;

    worker.postMessage({
      images,
      screenWidth: window.innerWidth,
      parentLocation,
    });

    return () => worker.terminate();
  }, [images]);

  return imagesRef;
}

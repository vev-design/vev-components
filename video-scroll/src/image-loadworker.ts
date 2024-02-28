/* eslint-disable no-restricted-globals */
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    send: (url: string, index: number) => void;
    loadImage: (url: string) => Promise<string | null | undefined>;
    startLoad: () => Promise<void>;
    heapIndexMap: (arr: number[], res: number[]) => number[];
  }
}

function getWorker() {
  const workerCode = () => {
    self.addEventListener('message', async (e) => {
      const { images, screenWidth } = e.data as {
        images: string[];
        screenWidth: number;
      };

      self.loadImage = async (url: string) => {
        const isLocalAsset = !/^(https?)?:\/\//.test(url);
        try {
          const fetchUrl = isLocalAsset
            ? self.location.origin + (!url.startsWith('/') ? `/${url}` : url)
            : url;
          const response = await fetch(fetchUrl);
          const fileBlob = await response.blob();
          // fileBlob.type says the MIME-type is png, but it is image/webp
          if (fileBlob.type === 'image/png' || fileBlob.type === 'image/jpeg' || isLocalAsset) return URL.createObjectURL(fileBlob);
        } catch (e) {
          return null;
        }
      };
      self.send = (url: string, index: number) => {
        postMessage({ url, index });
      };
      // let currentIndex = 0;

      self.heapIndexMap = (arr: number[], res: number[]) => {
        if (arr.length >= 1) {
          res.push(arr[0]);
        }
        if (arr.length >= 2) {
          res.push(arr[arr.length - 1]);
        }

        if (arr.length >= 3) {
          const middle = Math.floor(arr.length / 2);
          res.push(arr[middle]);
          self.heapIndexMap(arr.slice(1, middle), res);
          self.heapIndexMap(arr.slice(middle + 1, arr.length - 1), res);
        }

        return res;
      };

      const indexes = self.heapIndexMap(
        images.map((_, index) => index),
        [],
      );

      self.startLoad = async (): Promise<void> => {
        if (!images.length || !indexes.length) return;
        const index = indexes.shift() || 0;
        let url = images[index];

        if (url) {
          const width = screenWidth <= 1024 ? 1024 : 1600;
          url = url.replace(
            'cdn-cgi/image/f=auto,q=82,w=1920',
            `cdn-cgi/image/f=auto,q=87,w=${width}`,
          );
          const blobUrl = await self.loadImage(url);
          if (blobUrl) self.send(blobUrl, index);
          self.startLoad();
        }
      };

      // Start 10 parallel loads
      for (let i = 0; i < 10; i++) self.startLoad();
    });
  };
  return new Worker(
    URL.createObjectURL(new Blob([`(${workerCode})()`.toString()], { type: 'text/javascript' })),
  );
}

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
    const worker = getWorker();
    worker.addEventListener('message', async (e) => {
      const { url, index } = e.data as { index: number; url: string };
      imageElements[index] = await resolveImage(url);
    });

    worker.postMessage({ images, screenWidth: window.innerWidth });

    return () => worker.terminate();
  }, [images]);

  return imagesRef;
}

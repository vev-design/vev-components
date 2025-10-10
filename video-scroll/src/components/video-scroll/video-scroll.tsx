import { useFrame, useZoom } from '@vev/react';
import React, { useEffect, useRef } from 'react';
import { useVideoImageWorker } from '../../use-video-image-worker';
import { DEFAULT_IMAGES } from './video-scroll-default';
import styles from './video-scroll.module.scss';

type VideoScrollProps = {
  hostRef: React.RefObject<HTMLDivElement>;
  images?: string[];
  offsetVideoStart?: number;
  offsetVideoEnd?: number;
  loopCount?: number;
  loopAlternate?: boolean;
};
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type ContainerInfo = {
  wrapperRect: { top: number; left: number; width: number; height: number };
  shouldPin: boolean;
  pinStartPos: number;
  pinEndPos: number;
  isPinned: boolean;
  videoStartPos: number;
  videoEndPos: number;
};
const imageCache: { [url: string]: Promise<HTMLImageElement> } = {};

function preloadImage(url: string): Promise<HTMLImageElement> {
  if (!imageCache[url]) {
    imageCache[url] = new Promise((resolve) => {
      const image = new Image();
      image.src = url;
      image.onload = () => resolve(image);
    });
  }

  return imageCache[url];
}

export function VideoScroll({
  images,
  offsetVideoStart = 0,
  offsetVideoEnd = 0,
  loopCount,
  loopAlternate,
  hostRef,
}: VideoScrollProps) {
  if (!images) images = DEFAULT_IMAGES;
  const imageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFrameRef = useRef<number>(0);
  const desiredProgressRef = useRef<number>(0);
  const zoom = useZoom();
  const preloadedImagesRef = useVideoImageWorker(images);

  useEffect(() => {
    currentFrameRef.current = -1;
  }, [images]);

  useEffect(() => {
    let container: ContainerInfo;
    const updateProgress = () => {
      if (!container) return;
      const { videoStartPos, videoEndPos } = container;
      const scrollTop = (document.scrollingElement?.scrollTop || window.scrollY) * zoom;
      const progress = (scrollTop - videoStartPos) / (videoEndPos - videoStartPos) || 0;
      desiredProgressRef.current = clamp(progress, 0, 1);
    };
    const calculateContainer = () => {
      const wrapperEl = hostRef.current;
      if (!wrapperEl) return;
      const rect = hostRef.current.getBoundingClientRect();
      const scrollTop = (document.scrollingElement?.scrollTop || window.scrollY) * zoom;
      const pinStartPos = scrollTop + rect.top;
      const pinDistance = Math.max(rect.height - window.innerHeight, 0);
      const pinEndPos = pinStartPos + pinDistance;

      const viewHeight = window.innerHeight;
      const videoStartOffset = viewHeight * (1 - offsetVideoStart);
      const videoStartPos = Math.max(pinStartPos - videoStartOffset, 0);
      const videoEndOffset = viewHeight * offsetVideoEnd;
      const scrollHeight = window.document.scrollingElement?.scrollHeight || 0;
      const videoEndPos = Math.min(
        pinStartPos + rect.height - videoEndOffset,
        scrollHeight - viewHeight,
      );

      container = {
        wrapperRect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        shouldPin: viewHeight < rect.height,
        isPinned: container?.isPinned || false,
        pinStartPos,
        pinEndPos,
        videoStartPos,
        videoEndPos,
      };

      updateFrame();
    };

    const updateFrame = () => {
      const el = imageRef.current || imageRef.current;
      if (!container || !el) return;
      const scrollTop = (document.scrollingElement?.scrollTop || window.scrollY) * zoom;
      const { pinStartPos, pinEndPos, isPinned, shouldPin, wrapperRect } = container;
      updateProgress();

      if (!isPinned && !shouldPin) return;
      const scaledScrollTop = zoom * scrollTop;

      const { style } = el;
      if (scaledScrollTop >= pinStartPos && scaledScrollTop <= pinEndPos) {
        container.isPinned = true;

        style.position = 'fixed';

        if (wrapperRect.width < window.innerWidth) {
          style.maxWidth = wrapperRect.width + 'px';
          style.left = wrapperRect.left + 'px';
        }
      } else {
        container.isPinned = false;
        style.removeProperty('left');
        style.removeProperty('maxWidth');
        style.removeProperty('position');
        style.removeProperty('width');
        style.removeProperty('height');
        if (scrollTop > pinStartPos) {
          style.removeProperty('top');
          style.bottom = '0';
        } else {
          style.top = '0';
          style.removeProperty('bottom');
        }
      }
    };

    window.addEventListener('resize', calculateContainer, { passive: true });
    window.addEventListener('scroll', updateFrame, { passive: true });
    // Just for safety in case of some mis calculation
    const interval = setInterval(calculateContainer, 3000);
    calculateContainer();
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', calculateContainer);
      window.removeEventListener('scroll', updateFrame);
    };
  }, [offsetVideoStart, offsetVideoEnd, zoom, images]);

  useFrame(() => {
    const frames = preloadedImagesRef.current || [];
    const el = imageRef.current;
    if (el) {
      const duration = images?.length || 0;
      const desiredProgress = desiredProgressRef.current;
      let desiredFrame = Math.round(desiredProgress * (duration - 1) || 0);

      if (loopCount && loopCount > 1) {
        if (loopAlternate) {
          desiredFrame *= loopCount;
          const loop = Math.floor(desiredFrame / duration);
          if (loop % 2 === 1) {
            desiredFrame = duration - (desiredFrame % duration) - 1;
          } else {
            desiredFrame = desiredFrame % duration;
          }
        } else {
          desiredFrame = Math.floor(((desiredProgress * loopCount) % 1) * (duration - 1));
        }
      }

      const currentFrame = currentFrameRef.current || 0;
      let image = frames[desiredFrame];

      // trying to find closes frame which is loaded
      let i = 0;
      while (!image && i < frames.length) {
        i++;
        if (frames[desiredFrame + i]) {
          image = frames[desiredFrame + i];
          desiredFrame = desiredFrame + i;
        } else if (frames[desiredFrame - i]) {
          image = frames[desiredFrame - i];
          desiredFrame = desiredFrame - i;
        }
      }

      if (currentFrame !== desiredFrame && image) {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        currentFrameRef.current = desiredFrame;
        ctx.canvas.width = image.width;
        ctx.canvas.height = image.height;
        ctx.drawImage(image, 0, 0, image.width, image.height);
      }
    }
  });

  return (
    <div className={styles.wrapper}>
      <div ref={imageRef} className={styles.imageHolder}>
        <canvas ref={canvasRef} width={1440} height={900} />
      </div>
    </div>
  );
}

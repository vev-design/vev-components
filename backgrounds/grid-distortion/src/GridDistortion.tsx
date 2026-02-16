import React, { useRef, useEffect } from 'react';
import styles from "./GridDistortion.module.css";
import { registerVevComponent } from "@vev/react";
import GridDistortionWorker from './griddistortion-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

const MAX_WIDTH = 1440;
const MAX_HEIGHT = 900;
  
const getCanvasSize = (rect: DOMRect) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let width = Math.floor(rect.width * dpr);
      let height = Math.floor(rect.height * dpr);
    
      // Cap resolution while maintaining aspect ratio
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
    
      return { width, height };
};

interface GridDistortionProps {
  grid?: number;
  mouse?: number;
  strength?: number;
  relaxation?: number;
  image?: { url?: string };
  className?: string;
}

const GridDistortion: React.FC<GridDistortionProps> = ({
  grid = 15,
  mouse = 0.1,
  strength = 0.15,
  relaxation = 0.9,
  image,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevImageRef = useRef<string>('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.className = styles.canvas;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[GridDistortion] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new GridDistortionWorker() as Worker;
    workerRef.current = worker;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    worker.postMessage({
      type: 'init',
      data: {
        canvas: offscreen,
        dpr
      }
    }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        // Send initial props
        worker.postMessage({
          type: 'props',
          data: {
            grid,
            mouse,
            strength,
            relaxation
          }
        });

        // Send initial size
        const { width, height } = getCanvasSize(container.getBoundingClientRect());
        worker.postMessage({
          type: 'resize',
          data: {
            width,
            height
          }
        });

        // Load image if available
        const imageSrc = image?.url;
        if (imageSrc) {
          loadAndSendImage(imageSrc, worker);
          prevImageRef.current = imageSrc;
        }

        worker.postMessage({ type: 'start' });
      }
    };

    // Resize observer
    const handleResize = () => {
      if (!workerRef.current || !container) return;
      const { width, height } = getCanvasSize(container.getBoundingClientRect());
      workerRef.current.postMessage({
        type: 'resize',
        data: {
          width,
          height
        }
      });
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    // Mouse events
    const handleMouseMove = (e: MouseEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;

      workerRef.current.postMessage({
        type: 'pointer',
        data: { x, y }
      });
    };

    const handleMouseLeave = () => {
      workerRef.current?.postMessage({ type: 'pointerLeave' });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);

    // Visibility observer
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const isVisible = entry && entry.isIntersecting;
          workerRef.current?.postMessage({
            type: 'visibility',
            data: { visible: isVisible && !document.hidden }
          });
        },
        { threshold: [0, 0.01] }
      );
      intersectionObserver.observe(container);
    }

    const handleVisibilityChange = () => {
      workerRef.current?.postMessage({
        type: 'visibility',
        data: { visible: !document.hidden }
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();

      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'cleanup' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, []);

  // Update props when they change
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'props',
      data: {
        grid,
        mouse,
        strength,
        relaxation
      }
    });
  }, [grid, mouse, strength, relaxation]);

  // Handle image changes
  useEffect(() => {
    if (!workerRef.current) return;
    const imageSrc = image?.url || '';

    if (imageSrc && imageSrc !== prevImageRef.current) {
      loadAndSendImage(imageSrc, workerRef.current);
      prevImageRef.current = imageSrc;
    }
  }, [image]);

  return (
    <div
      ref={containerRef}
      className={`${styles.wrapper} ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minWidth: '0',
        minHeight: '0'
      }}
    />
  );
};

// Helper function to load image and send to worker
async function loadAndSendImage(url: string, worker: Worker) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    worker.postMessage(
      {
        type: 'image',
        data: { imageBitmap }
      },
      [imageBitmap]
    );
  } catch (error) {
    console.error('[GridDistortion] Failed to load image:', error);
  }
}

registerVevComponent(GridDistortion, {
  name: "GridDistortion",
  props: [
    { name: "image", title: "Image", type: "image" },
    {
      name: "grid", title: "Grid size", type: "number", initialValue: 15, options: {
        display: "slider",
        min: 1,
        max: 200,
      }
    },
    {
      name: "mouse", title: "Mouse size", type: "number", initialValue: 0.2, options: {
        display: "slider",
        min: 0,
        max: 0.5,
      }
    },
    {
      name: "strength", title: "Strength", type: "number", initialValue: 0.15, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "relaxation", title: "Relaxation", type: "number", initialValue: 0.9, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default GridDistortion;

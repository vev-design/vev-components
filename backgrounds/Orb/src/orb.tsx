import React, { useEffect, useRef } from "react";
import { registerVevComponent } from "@vev/react";
import styles from './orb.module.css';
import OrbWorker from './orb-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

const MAX_WIDTH = 1440;
const MAX_HEIGHT = 900;
    
const getCanvasSize = (rect: DOMRect) => {
        const dpr = 1;
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

interface OrbProps {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
}

function Orb({
  hue = 0,
  hoverIntensity = 0.2,
  rotateOnHover = true,
  forceHoverState = false
}: OrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[Orb] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new OrbWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: { hue, hoverIntensity, rotateOnHover, forceHoverState }
        });

        const { width, height } = getCanvasSize(container.getBoundingClientRect());
        worker.postMessage({
          type: 'resize',
          data: {
            width,
            height
          }
        });

        worker.postMessage({ type: 'start' });
      }
    };

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

    const handlePointerMove = (e: PointerEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      workerRef.current.postMessage({ type: 'hover', data: { hover: 1 } });
    };

    const handlePointerLeave = () => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({ type: 'hover', data: { hover: 0 } });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
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
      data: { hue, hoverIntensity, rotateOnHover, forceHoverState }
    });
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState]);

  return <div ref={containerRef} className={styles.wrapper} />;
}


registerVevComponent(Orb, {
  name: "orb",
  props: [ { name: "hue", type: "number", initialValue: 0 , options:{
    display: "slider",
    min: 0,
    max: 360,
  } },
    { name: "hoverIntensity", type: "number",  initialValue: 0.2, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "rotateOnHover", type: "boolean", initialValue: true },
    { name: "forceHoverState", type: "boolean", initialValue: false } ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Orb;

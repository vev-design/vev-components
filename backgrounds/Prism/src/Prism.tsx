import React, { useEffect, useRef } from 'react';
import styles from './Prism.module.css';
import { registerVevComponent } from "@vev/react";
import PrismWorker from './prism-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

type PrismProps = {
  height?: number;
  baseWidth?: number;
  animationType?: 'rotate' | 'hover' | '3drotate';
  glow?: number;
  offset?: { x?: number; y?: number };
  noise?: number;
  transparent?: boolean;
  scale?: number;
  hueShift?: number;
  colorFrequency?: number;
  hoverStrength?: number;
  inertia?: number;
  bloom?: number;
  suspendWhenOffscreen?: boolean;
  timeScale?: number;
};

const Prism: React.FC<PrismProps> = ({
  height = 3.5,
  baseWidth = 5.5,
  animationType = 'rotate',
  glow = 1,
  offset = { x: 0, y: 0 },
  noise = 0,
  transparent = true,
  scale = 1.5,
  hueShift = 0,
  colorFrequency = 1,
  hoverStrength = 2,
  inertia = 0.05,
  bloom = 1,
  suspendWhenOffscreen = false,
  timeScale = 0.5
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
      console.warn('[Prism] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new PrismWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen, transparent } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            height,
            baseWidth,
            animationType,
            glow,
            offset,
            noise,
            transparent,
            scale,
            hueShift,
            colorFrequency,
            hoverStrength,
            inertia,
            bloom,
            timeScale
          }
        });

        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        worker.postMessage({
          type: 'resize',
          data: {
            width: Math.max(1, Math.floor(rect.width * dpr)),
            height: Math.max(1, Math.floor(rect.height * dpr)),
            dpr
          }
        });

        worker.postMessage({ type: 'start' });
      }
    };

    const handleResize = () => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      workerRef.current.postMessage({
        type: 'resize',
        data: {
          width: Math.max(1, Math.floor(rect.width * dpr)),
          height: Math.max(1, Math.floor(rect.height * dpr)),
          dpr
        }
      });
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    const handlePointerMove = (e: PointerEvent) => {
      if (!workerRef.current) return;
      const ww = Math.max(1, window.innerWidth);
      const wh = Math.max(1, window.innerHeight);
      const cx = ww * 0.5;
      const cy = wh * 0.5;
      const x = Math.min(1, Math.max(-1, (e.clientX - cx) / (ww * 0.5)));
      const y = Math.min(1, Math.max(-1, (e.clientY - cy) / (wh * 0.5)));
      workerRef.current.postMessage({ type: 'pointer', data: { x, y, inside: true } });
    };

    const handlePointerLeave = () => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({ type: 'pointer', data: { x: 0, y: 0, inside: false } });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('blur', handlePointerLeave);

    // Visibility observer for suspend when offscreen
    let intersectionObserver: IntersectionObserver | null = null;
    if (suspendWhenOffscreen && typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver((entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        workerRef.current?.postMessage({ type: 'visibility', data: { visible } });
      });
      intersectionObserver.observe(container);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('blur', handlePointerLeave);
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
        height,
        baseWidth,
        animationType,
        glow,
        offset,
        noise,
        transparent,
        scale,
        hueShift,
        colorFrequency,
        hoverStrength,
        inertia,
        bloom,
        timeScale
      }
    });
  }, [height, baseWidth, animationType, glow, offset?.x, offset?.y, noise, transparent, scale, hueShift, colorFrequency, hoverStrength, inertia, bloom, timeScale]);

  return <div className={styles.wrapper} ref={containerRef} />;
};


registerVevComponent(Prism, {
  name: "Prism",
  props: [
    {
      name: "animationType", type: "select", initialValue: "rotate", options: {
        display: "dropdown",
        items: [
          { label: "Rotate", value: "rotate" },
          { label: "Hover", value: "hover" },
          { label: "3D Rotate", value: "3drotate" },
        ],

      }
    },
    {
      name: "timeScale", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 2,
      }
    },
    {
      name: "scale", type: "number", initialValue: 1.5, options: {
        display: "slider",
        min: 0,
        max: 5,
      }
    },
    {
      name: "height", type: "number", initialValue: 3.5, options: {
        display: "slider",
        min: 0,
        max: 8,
      }
    },
    {
      name: "baseWidth", type: "number", initialValue: 5.5, options: {
        display: "slider",
        min: 0,
        max: 10,
      }
    },
    {
      name: "noise", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "glow", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 3,
      }
    },
    {
      name: "hueShift", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 3.06,
      }
    },
    {
      name: "colorFrequency", type: "number", initialValue: 0.8, options: {
        display: "slider",
        min: 0,
        max: 4,
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

export default Prism;

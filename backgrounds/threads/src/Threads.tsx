import React, { useEffect, useMemo, useRef } from 'react';
import styles from './Threads.module.css';
import { registerVevComponent } from "@vev/react";
import ThreadsWorker from './threads-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

interface ThreadsProps {
  color?: [number, number, number];
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
}

const Threads: React.FC<ThreadsProps> = ({
  color = [1, 1, 1],
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const colorVector = useMemo<[number, number, number]>(() => [...color] as [number, number, number], [color]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[Threads] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new ThreadsWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: { color: colorVector, amplitude, distance }
        });

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        worker.postMessage({
          type: 'resize',
          data: {
            width: Math.max(1, Math.floor(rect.width * dpr)),
            height: Math.max(1, Math.floor(rect.height * dpr))
          }
        });

        worker.postMessage({ type: 'start' });
      }
    };

    const handleResize = () => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      workerRef.current.postMessage({
        type: 'resize',
        data: {
          width: Math.max(1, Math.floor(rect.width * dpr)),
          height: Math.max(1, Math.floor(rect.height * dpr))
        }
      });
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    const handleMouseMove = (e: MouseEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y } });
    };

    const handleMouseLeave = () => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({ type: 'mouseLeave' });
    };

    if (enableMouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (enableMouseInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
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
      data: { color: colorVector, amplitude, distance }
    });
  }, [colorVector, amplitude, distance]);

  // Handle mouse interaction toggle
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !workerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!workerRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y } });
    };

    const handleMouseLeave = () => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({ type: 'mouseLeave' });
    };

    workerRef.current.postMessage({
      type: 'props',
      data: { mouseEnabled: enableMouseInteraction }
    });

    if (enableMouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [enableMouseInteraction]);

  return <div ref={containerRef} {...rest} className={styles.wrapper} />;
};


registerVevComponent(Threads, {
  name: "Threads",
  props: [
    { name: "amplitude", title: "Amplitude", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "distance", title: "Distance", type: "number", initialValue: 0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "enableMouseInteraction", title: "Mouse Interaction", type: "boolean", initialValue: false },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Threads;

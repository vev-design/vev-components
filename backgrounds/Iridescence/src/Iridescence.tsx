import React, { useEffect, useMemo, useRef } from 'react';
import styles from './Iridescence.module.css';
import { registerVevComponent } from '@vev/react';
import IridescenceWorker from './iridescence-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

function Iridescence({ red = 1, green = 1, blue = 1, speed = 1.0, amplitude = 0.1, mouseReact = true, ...rest }) {
  const ctnDom = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    ctn.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[Iridescence] OffscreenCanvas not supported');
      return () => {
        ctn.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new IridescenceWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: { red, green, blue, speed, amplitude }
        });

        const rect = ctn.getBoundingClientRect();
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
      if (!workerRef.current || !ctn) return;
      const rect = ctn.getBoundingClientRect();
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
    resizeObserver?.observe(ctn);

    const handleMouseMove = (e: MouseEvent) => {
      if (!workerRef.current || !ctn) return;
      const rect = ctn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y } });
    };

    if (mouseReact) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (mouseReact) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      resizeObserver?.disconnect();
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'cleanup' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (ctn.contains(canvas)) {
        ctn.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, []);

  // Update props when they change
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'props',
      data: { red, green, blue, speed, amplitude }
    });
  }, [red, green, blue, speed, amplitude]);

  // Handle mouseReact changes
  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!workerRef.current) return;
      const rect = ctn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y } });
    };

    if (mouseReact) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [mouseReact]);

  return <div ref={ctnDom} {...rest} data-component="Iridescence" className={styles.iridescenceContainer} />;
}


registerVevComponent(Iridescence, {
  name: "Iridescence",
  props: [
    { name: "red", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "green", type: "number", initialValue: 0.4, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "blue", type: "number", initialValue: 0.7, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "amplitude", type: "number", initialValue: 0.1, options:{
      display: "slider",
      min: 0,
      max: 0.5,
    } },
    { name: "speed", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "mouseReact", title: "Enable Mouse Interaction", type: "boolean", initialValue: true },
  ],
  editableCSS: [
    {
      selector: styles.iridescenceContainer,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Iridescence;

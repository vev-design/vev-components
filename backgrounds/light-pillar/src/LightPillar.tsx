import React from "react";
import styles from "./LightPillar.module.css";
import { registerVevComponent } from "@vev/react";
import { useRef, useEffect } from 'react';
import { SilkeColorPickerButton } from "@vev/silke";
import LightPillarWorker from './lightpillar-worker?worker';

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

const LightPillar = ({
  topColor = '#5227FF',
  bottomColor = '#FF9FFC',
  intensity = 1.0,
  rotationSpeed = 0.3,
  interactive = false,
  className = '',
  glowAmount = 0.005,
  pillarWidth = 3.0,
  pillarHeight = 0.4,
  noiseIntensity = 0.5,
  mixBlendMode = 'screen',
  pillarRotation = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[LightPillar] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new LightPillarWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            topColor,
            bottomColor,
            intensity,
            rotationSpeed,
            interactive,
            glowAmount,
            pillarWidth,
            pillarHeight,
            noiseIntensity,
            pillarRotation
          }
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

    const handleMouseMove = (event: MouseEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y } });
    };

    const handleMouseLeave = () => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({ type: 'mouseLeave' });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
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
        topColor,
        bottomColor,
        intensity,
        rotationSpeed,
        interactive,
        glowAmount,
        pillarWidth,
        pillarHeight,
        noiseIntensity,
        pillarRotation
      }
    });
  }, [topColor, bottomColor, intensity, rotationSpeed, interactive, glowAmount, pillarWidth, pillarHeight, noiseIntensity, pillarRotation]);

  return <div ref={containerRef} className={`${styles.wrapper} ${className}`} style={{ mixBlendMode: mixBlendMode as any }} />;
};



registerVevComponent(LightPillar, {
  name: "LightPillar",
  props: [
    { name: "intensity", title: "Intensity", type: "number", initialValue: 2.6, options: { display: "slider", min: 0.1, max: 3 } },
    { name: "rotationSpeed", title: "Rotation Speed", type: "number", initialValue: 0.3, options: { display: "slider", min: 0, max: 2 } },
    { name: "pillarWidth", type: "number", initialValue: 3.0, options: { display: "slider", min: 1, max: 10 } },
    { name: "pillarHeight", type: "number", initialValue: 0.4, options: { display: "slider", min: 0.1, max: 2 } },
    { name: "noiseIntensity", type: "number", initialValue: 0.5, options: { display: "slider", min: 0, max: 2 } },
    { name: "pillarRotation", type: "number", initialValue: 0, options: { display: "slider", min: 0, max: 360 } },
    { name: "interactive", title: "Mouse interactive", type: "boolean", initialValue: false },
    { name: "topColor", title: "Top Color", type: "string", initialValue: "#5227FF", component: SilkeColorPickerButton },
    { name: "bottomColor", title: "Bottom Color", type: "string", initialValue: "#FF9FFC", component: SilkeColorPickerButton },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default LightPillar;

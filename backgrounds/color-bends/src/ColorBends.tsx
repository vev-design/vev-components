import React, { useEffect, useRef, useState } from 'react';
import styles from './ColorBends.module.css';
import { registerVevComponent } from "@vev/react";
import { SilkeBox, SilkeButton, SilkeColorPickerButton } from '@vev/silke';
import ColorBendsWorker from './colorbends-worker?worker';

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

function ColorBends({
  className,
  style,
  rotation = 45,
  speed = 0.2,
  colors = [],
  transparent = true,
  autoRotate = 0,
  scale = 1,
  frequency = 1,
  warpStrength = 1,
  mouseInfluence = 1,
  parallax = 0.5,
  noise = 0.1
}) {
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
    canvas.className = styles.canvas;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[ColorBends] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new ColorBendsWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            rotation,
            speed,
            colors: colors || [],
            transparent,
            autoRotate,
            scale,
            frequency,
            warpStrength,
            mouseInfluence,
            parallax,
            noise
          }
        });

        const { width, height } = getCanvasSize(container.getBoundingClientRect());
        const dpr = Math.min(window.devicePixelRatio || 1, 1);
        worker.postMessage({
          type: 'resize',
          data: {
            width: width * dpr,
            height: height * dpr,
            cssWidth: width,
            cssHeight: height
          }
        });

        worker.postMessage({ type: 'start' });
      }
    };

    const handleResize = () => {
      if (!workerRef.current || !container) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1);
      const { width, height } = getCanvasSize(container.getBoundingClientRect());
      workerRef.current.postMessage({
        type: 'resize',
        data: {
          width: width * dpr,
          height: height * dpr,
          cssWidth: width,
          cssHeight: height
        }
      });
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    const handlePointerMove = (e: PointerEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const y = -(((e.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
      workerRef.current.postMessage({ type: 'pointer', data: { x, y } });
    };

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
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
        rotation,
        speed,
        colors: colors || [],
        transparent,
        autoRotate,
        scale,
        frequency,
        warpStrength,
        mouseInfluence,
        parallax,
        noise
      }
    });
  }, [rotation, speed, colors, transparent, autoRotate, scale, frequency, warpStrength, mouseInfluence, parallax, noise]);

  return <div ref={containerRef} className={styles.wrapper} />;
}

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || ['']);


  const handleChange = (color: string) => {
    setValue([color]);
    props.onChange?.([color]);
  };

  const handleClear = () => {
    setValue([]);
    props.onChange?.([]);
  };



  return (
    <SilkeBox gap="s" vPad="s" style={{ width: '100%', overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
      <SilkeColorPickerButton
        title="Single Color"
        value={value[0] || ''}
        size="s"
        onChange={handleChange}
        label="Color tint"
      />
      <SilkeButton size="s" kind='secondary' icon="close" onClick={handleClear} />
    </SilkeBox>
  );
};


registerVevComponent(ColorBends, {
  name: "ColorBends",
  type: 'both',
  props: [
    {
      name: "rotation", title: "Rotation (deg)", type: "number", initialValue: 45, options: {
        display: "slider",
        min: -180,
        max: 180,
      }
    },
    {
      name: "autoRotate", title: "Auto Rotate (deg/s)", type: "number", initialValue: 0, options: {
        display: "slider",
        min: -5,
        max: 5,
      }
    },
    {
      name: "speed", type: "number", initialValue: 0.2, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "scale", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0.2,
        max: 5,
      }
    },
    {
      name: "frequency", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 5,
      }
    },
    {
      name: "warpStrength", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "mouseInfluence", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "parallax", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 2,
      }
    },
    {
      name: "noise", type: "number", initialValue: 0.1, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    { name: "colors", title: "Single Color", type: "array", initialValue: [], component: multipleColorSelect, of: "string" },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
});

export default ColorBends;

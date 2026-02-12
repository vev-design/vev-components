import React, { useEffect, useRef, useState } from 'react';
import styles from "./LiquidEthersection.module.css";
import { registerVevComponent } from "@vev/react";
import { SilkeBox, SilkeColorPickerButton } from '@vev/silke';
import LiquidEtherWorker from './liquidether-worker?worker';

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

export interface LiquidEtherProps {
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  dt?: number;
  BFECC?: boolean;
  resolution?: number;
  isBounce?: boolean;
  colors?: string[];
  style?: React.CSSProperties;
  className?: string;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
}

const defaultColors = ['#5227FF', '#FF9FFC', '#B19EEF'];

function LiquidEthersection({
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  style = {},
  className = '',
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6
}: LiquidEtherProps): React.ReactElement {
  const colorsArray = colors || defaultColors;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevColorsRef = useRef<string[]>(colorsArray);

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
      console.warn('[LiquidEther] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new LiquidEtherWorker() as Worker;
    workerRef.current = worker;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    worker.postMessage({
      type: 'init',
      data: {
        canvas: offscreen,
        dpr,
        colors: colorsArray
      }
    }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        // Send initial props
        worker.postMessage({
          type: 'props',
          data: {
            mouseForce,
            cursorSize,
            isViscous,
            viscous,
            iterationsViscous,
            iterationsPoisson,
            dt,
            BFECC,
            resolution,
            isBounce,
            autoDemo,
            autoSpeed,
            autoIntensity,
            takeoverDuration,
            autoResumeDelay,
            autoRampDuration
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

    // Pointer events
    const handlePointerMove = (e: PointerEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      workerRef.current.postMessage({
        type: 'pointer',
        data: { x, y }
      });
    };

    const handlePointerEnter = () => {
      workerRef.current?.postMessage({
        type: 'pointerInside',
        data: { inside: true }
      });
    };

    const handlePointerLeave = () => {
      workerRef.current?.postMessage({
        type: 'pointerInside',
        data: { inside: false }
      });
    };

    container.addEventListener('mousemove', handlePointerMove as any, { passive: true });
    container.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        handlePointerMove({ clientX: t.pageX, clientY: t.pageY } as PointerEvent);
      }
    }, { passive: true });
    container.addEventListener('mouseenter', handlePointerEnter);
    container.addEventListener('mouseleave', handlePointerLeave);
    container.addEventListener('touchend', handlePointerLeave);

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
        { threshold: [0, 0.01, 0.1] }
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
      container.removeEventListener('mousemove', handlePointerMove as any);
      container.removeEventListener('mouseenter', handlePointerEnter);
      container.removeEventListener('mouseleave', handlePointerLeave);
      container.removeEventListener('touchend', handlePointerLeave);
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
        mouseForce,
        cursorSize,
        isViscous,
        viscous,
        iterationsViscous,
        iterationsPoisson,
        dt,
        BFECC,
        resolution,
        isBounce,
        autoDemo,
        autoSpeed,
        autoIntensity,
        takeoverDuration,
        autoResumeDelay,
        autoRampDuration
      }
    });
  }, [
    mouseForce,
    cursorSize,
    isViscous,
    viscous,
    iterationsViscous,
    iterationsPoisson,
    dt,
    BFECC,
    resolution,
    isBounce,
    autoDemo,
    autoSpeed,
    autoIntensity,
    takeoverDuration,
    autoResumeDelay,
    autoRampDuration
  ]);

  // Update palette when colors change
  useEffect(() => {
    if (!workerRef.current) return;
    const colorsChanged = JSON.stringify(prevColorsRef.current) !== JSON.stringify(colorsArray);
    if (colorsChanged) {
      workerRef.current.postMessage({
        type: 'palette',
        data: { colors: colorsArray }
      });
      prevColorsRef.current = colorsArray;
    }
  }, [colorsArray]);

  return <div ref={containerRef} className={[styles.wrapper, className || ''].join(' ')} style={style} />;
}

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState(props.value || ["#5227FF", "#FF9FFC", "#B19EEF"]);
  const handleChange = (color: string, index: number) => {
    setValue(value.map((c: string, i: number) => i === index ? color : c));
    props.onChange?.(value);
  }

  return <SilkeBox gap="s" align="center" vPad="s">
    {value.map((color: string, index: number) => (
      <SilkeColorPickerButton value={color} size="s" onChange={(v) => handleChange(v, index)} key={index} />
    ))}
  </SilkeBox>
}

registerVevComponent(LiquidEthersection, {
  name: "Liquid Ether",
  props: [
    { name: "colors", type: "array", initialValue: ["#5227FF", "#FF9FFC", "#B19EEF"], component: multipleColorSelect, of: "string" },
    {
      name: "mouseForce", type: "number", initialValue: 20, options: {
        display: "slider",
        min: 0,
        max: 60,
      }
    },
    {
      name: "cursorSize", type: "number", initialValue: 100, options: {
        display: "slider",
        min: 0,
        max: 300,
      }
    },
    {
      name: "resolution", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 0.5,
      }
    },
    {
      name: "autoSpeed", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "autoIntensity", type: "number", initialValue: 2.2, options: {
        display: "slider",
        min: 0,
        max: 4,
      }
    },
    {
      name: "iterationsViscous", type: "number", initialValue: 32, options: {
        display: "slider",
        min: 0,
        max: 64,
      }
    },
    {
      name: "iterationsPoisson", type: "number", initialValue: 32, options: {
        display: "slider",
        min: 0,
        max: 64,
      }
    },
    { name: "isBounce", title: "Bounce Edges", type: "boolean", initialValue: false },
    { name: "autoDemo", title: "Auto Animate", type: "boolean", initialValue: true },
    { name: "isViscous", title: "Viscous", type: "boolean", initialValue: false },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'section',
});

export default LiquidEthersection;

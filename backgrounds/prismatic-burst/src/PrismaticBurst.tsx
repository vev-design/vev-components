import React, { useEffect, useRef, useState } from 'react';
import styles from './PrismaticBurst.module.css';
import { registerVevComponent } from "@vev/react";
import { SilkeBox, SilkeColorPickerButton, SilkeText, SilkeTextSmall } from '@vev/silke';
import PrismaticBurstWorker from './prismaticburst-worker?worker';

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

type Offset = { x?: number | string; y?: number | string };
type AnimationType = 'rotate' | 'rotate3d' | 'hover';

export type PrismaticBurstProps = {
  intensity?: number;
  speed?: number;
  animationType?: AnimationType;
  colors?: string[];
  distort?: number;
  paused?: boolean;
  offset?: Offset;
  hoverDampness?: number;
  rayCount?: number;
  mixBlendMode?: React.CSSProperties['mixBlendMode'] | 'none';
};

const toPx = (v: number | string | undefined): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const num = parseFloat(s.replace('px', ''));
  return isNaN(num) ? 0 : num;
};

const PrismaticBurst = ({
  intensity = 2,
  speed = 0.5,
  animationType = 'rotate3d',
  colors,
  distort = 0,
  paused = false,
  offset = { x: 0, y: 0 },
  hoverDampness = 0,
  rayCount,
  mixBlendMode = 'lighten'
}: PrismaticBurstProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    canvas.style.mixBlendMode = mixBlendMode && mixBlendMode !== 'none' ? mixBlendMode : '';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[PrismaticBurst] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new PrismaticBurstWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            intensity,
            speed,
            animationType,
            colors: colors || ['#ff007a', '#4d3dff', '#ffffff'],
            distort,
            paused,
            offset: { x: toPx(offset?.x), y: toPx(offset?.y) },
            hoverDampness,
            rayCount: rayCount || 0
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

    const handlePointerMove = (e: PointerEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
      workerRef.current.postMessage({
        type: 'pointer',
        data: {
          x: Math.min(Math.max(x, 0), 1),
          y: Math.min(Math.max(y, 0), 1)
        }
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Visibility handling
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0]) {
            workerRef.current?.postMessage({
              type: 'visibility',
              data: { visible: entries[0].isIntersecting }
            });
          }
        },
        { root: null, threshold: 0.01 }
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
      window.removeEventListener('pointermove', handlePointerMove);
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

  // Update canvas blend mode
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.mixBlendMode = mixBlendMode && mixBlendMode !== 'none' ? mixBlendMode : '';
    }
  }, [mixBlendMode]);

  // Update props when they change
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'props',
      data: {
        intensity,
        speed,
        animationType,
        colors: colors || ['#ff007a', '#4d3dff', '#ffffff'],
        distort,
        paused,
        offset: { x: toPx(offset?.x), y: toPx(offset?.y) },
        hoverDampness,
        rayCount: rayCount || 0
      }
    });
  }, [intensity, speed, animationType, colors, distort, paused, offset?.x, offset?.y, hoverDampness, rayCount]);

  return <div className={styles.wrapper} ref={containerRef} />;
};

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState(props.value || ['#ff007a', '#4d3dff', '#ffffff']);
  const handleChange = (color: string, index: number) => {
    setValue(value.map((c: string, i: number) => i === index ? color : c));
    props.onChange?.(value);
  }

  return (
    <SilkeBox gap="s" column>
      <SilkeTextSmall>Colors</SilkeTextSmall>
      <SilkeBox gap="s" vPad="s">
        {value.map((color: string, index: number) => (
          <SilkeColorPickerButton value={color} size="s" onChange={(v) => handleChange(v, index)} key={index} />
        ))}
      </SilkeBox>
    </SilkeBox>
  )
}


registerVevComponent(PrismaticBurst, {
  name: "PrismaticBurst",
  props: [
    {
      name: "animationType", title: "Animation Type", type: "select", initialValue: "rotate3d", options: {
        display: "dropdown",
        items: [
          { label: "Rotate", value: "rotate" },
          { label: "Hover", value: "hover" },
          { label: "3D Rotate", value: "rotate3d" },
        ],
      }
    },
    {
      name: "intensity", type: "number", initialValue: 2, options: {
        display: "slider",
        min: 0,
        max: 5,
      }
    },
    {
      name: "speed", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 2,
      }
    },
    {
      name: "distort", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 10,
      }
    },
    {
      name: "rayCount", title: "Ray Count", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 64,
      }
    },
    {
      name: "hoverDampness", title: "Hover Dampness", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    { name: "colors", type: "array", initialValue: ['#ff007a', '#4d3dff', '#ffffff'], component: multipleColorSelect, of: "string" },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default PrismaticBurst;

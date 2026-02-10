import React, { useEffect, useRef, useState } from 'react';
import styles from './GradientBlinds.module.css';
import { registerVevComponent } from '@vev/react';
import { SilkeBox, SilkeColorPickerButton, SilkeText } from '@vev/silke';
import GradientBlindsWorker from './gradientblinds-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

export interface GradientBlindsProps {
  className?: string;
  dpr?: number;
  paused?: boolean;
  gradientColors?: string[];
  angle?: number;
  noise?: number;
  blindCount?: number;
  blindMinWidth?: number;
  mouseDampening?: number;
  mirrorGradient?: boolean;
  spotlightRadius?: number;
  spotlightSoftness?: number;
  spotlightOpacity?: number;
  distortAmount?: number;
  shineDirection?: 'left' | 'right';
  mixBlendMode?: string;
}

const GradientBlinds: React.FC<GradientBlindsProps> = ({
  className,
  dpr,
  paused = false,
  gradientColors,
  angle = 0,
  noise = 0.3,
  blindCount = 16,
  blindMinWidth = 60,
  mouseDampening = 0.15,
  mirrorGradient = false,
  spotlightRadius = 0.5,
  spotlightSoftness = 1,
  spotlightOpacity = 1,
  distortAmount = 0,
  shineDirection = 'left',
  mixBlendMode = 'lighten'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
      console.warn('[GradientBlinds] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new GradientBlindsWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            gradientColors: gradientColors || ['#FF9FFC', '#5227FF'],
            angle,
            noise,
            blindCount,
            blindMinWidth,
            mouseDampening,
            mirrorGradient,
            spotlightRadius,
            spotlightSoftness,
            spotlightOpacity,
            distortAmount,
            shineDirection,
            paused
          }
        });

        const rect = container.getBoundingClientRect();
        const devicePixelRatio = dpr ?? (window.devicePixelRatio || 1);
        worker.postMessage({
          type: 'resize',
          data: {
            width: Math.max(1, Math.floor(rect.width * devicePixelRatio)),
            height: Math.max(1, Math.floor(rect.height * devicePixelRatio)),
            cssWidth: rect.width
          }
        });

        worker.postMessage({ type: 'start' });
      }
    };

    const handleResize = () => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const devicePixelRatio = dpr ?? (window.devicePixelRatio || 1);
      workerRef.current.postMessage({
        type: 'resize',
        data: {
          width: Math.max(1, Math.floor(rect.width * devicePixelRatio)),
          height: Math.max(1, Math.floor(rect.height * devicePixelRatio)),
          cssWidth: rect.width
        }
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const handlePointerMove = (event: PointerEvent | MouseEvent) => {
      if (!workerRef.current || !canvasRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      const scaleX = canvasRef.current.width / Math.max(rect.width, 1);
      const scaleY = canvasRef.current.height / Math.max(rect.height, 1);
      const x = (event.clientX - rect.left) * scaleX;
      const y = (rect.height - (event.clientY - rect.top)) * scaleY;

      workerRef.current.postMessage({
        type: 'pointer',
        data: { x, y, inside }
      });
    };

    const handlePointerLeave = () => {
      if (!workerRef.current || !canvasRef.current) return;
      const cx = canvasRef.current.width / 2;
      const cy = canvasRef.current.height / 2;
      workerRef.current.postMessage({
        type: 'pointer',
        data: { x: cx, y: cy, inside: false }
      });
    };

    container.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      container.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
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
  }, [dpr]);

  // Update props when they change
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'props',
      data: {
        gradientColors: gradientColors || ['#FF9FFC', '#5227FF'],
        angle,
        noise,
        blindCount,
        blindMinWidth,
        mouseDampening,
        mirrorGradient,
        spotlightRadius,
        spotlightSoftness,
        spotlightOpacity,
        distortAmount,
        shineDirection,
        paused
      }
    });
  }, [gradientColors, angle, noise, blindCount, blindMinWidth, mouseDampening, mirrorGradient, spotlightRadius, spotlightSoftness, spotlightOpacity, distortAmount, shineDirection, paused]);

  return (
    <div
      ref={containerRef}
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={{
        ...(mixBlendMode && {
          mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode']
        })
      }}
    />
  );
};

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || ['#FF9FFC', '#5227FF']);

  useEffect(() => {
    if (Array.isArray(props.value)) {
      setValue(props.value);
    }
  }, [props.value]);

  const handleChange = (color: string, index: number) => {
    setValue((prev) => {
      const next = prev.map((c, i) => (i === index ? color : c));
      props.onChange?.(next);
      return next;
    });
  };

  return (
    <SilkeBox gap="s" vAlign="center" hAlign="start" vPad="s" column>
      <SilkeText>Gradient Colors</SilkeText>
      <SilkeBox gap="s" align="center" vPad="s">
        {value.map((color: string, index: number) => (
          <SilkeColorPickerButton
            key={index}
            value={color}
            size="s"
            onChange={(v) => handleChange(v, index)}
          />
        ))}
      </SilkeBox>
    </SilkeBox>
  );
};


registerVevComponent(GradientBlinds, {
  name: "GradientBlinds",
  props: [
    {
      name: "shineDirection", title: "Light Direction", type: "select", initialValue: "left", options: {
        display: "dropdown",
        items: [
          { label: "Left", value: "left" },
          { label: "Right", value: "right" },
        ],
      }
    },
    {
      name: "angle", title: "Blinds Angle", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 360,
      }
    },
    {
      name: "noise", title: "Noise Amount", type: "number", initialValue: 0.3, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "blindCount", title: "Blinds Count", type: "number", initialValue: 16, options: {
        display: "slider",
        min: 0,
        max: 64,
      }
    },
    {
      name: "blindMinWidth", title: "Blinds Minimum Width", type: "number", initialValue: 60, options: {
        display: "slider",
        min: 0,
        max: 200,
      }
    },
    {
      name: "spotlightRadius", title: "Spotlight Radius", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "distortAmount", title: "Distort Amount", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 100,
      }
    },
    {
      name: "mouseDampening", title: "Mouse Dampening", type: "number", initialValue: 0.15, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    { name: "mirrorGradient", type: "boolean", initialValue: false },
    {
      name: "spotlightSoftness", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 10,
      }
    },
    {
      name: "spotlightOpacity", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    { name: "gradientColors", type: "array", initialValue: ["#FF9FFC", "#5227FF"], component: multipleColorSelect, of: "string" }
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default GradientBlinds;

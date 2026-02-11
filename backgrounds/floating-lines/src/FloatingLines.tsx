import React, { useState, useEffect, useRef } from "react";
import styles from "./FloatingLines.module.css";
import { registerVevComponent } from "@vev/react";
import { SilkeBox, SilkeColorPickerButton, SilkeTextSmall } from "@vev/silke";
import FloatingLinesWorker from './floatinglines-worker?worker';

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

function FloatingLines({
  linesGradient,
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = 6,
  lineDistance = 5,
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen'
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
      console.warn('[FloatingLines] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new FloatingLinesWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            linesGradient: linesGradient || [],
            enabledWaves,
            lineCount,
            lineDistance,
            topWavePosition,
            middleWavePosition,
            bottomWavePosition,
            animationSpeed,
            interactive,
            bendRadius,
            bendStrength,
            mouseDamping,
            parallax,
            parallaxStrength
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

    const handlePointerMove = (event: PointerEvent) => {
      if (!workerRef.current || !canvasRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const { width, height } = getCanvasSize(container.getBoundingClientRect());
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const dpr = 1;
      workerRef.current.postMessage({
        type: 'pointer',
        data: {
          x: x * dpr,
          y: (height - y) * dpr,
          centerX: width / 2,
          centerY: height / 2,
          width,
          height
        }
      });
    };

    const handlePointerLeave = () => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({ type: 'pointerLeave' });
    };

    if (interactive) {
      window.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerleave', handlePointerLeave);
    }

    return () => {
      if (interactive) {
        window.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerleave', handlePointerLeave);
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
  }, [interactive]);

  // Update props when they change
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'props',
      data: {
        linesGradient: linesGradient || [],
        enabledWaves,
        lineCount,
        lineDistance,
        topWavePosition,
        middleWavePosition,
        bottomWavePosition,
        animationSpeed,
        interactive,
        bendRadius,
        bendStrength,
        mouseDamping,
        parallax,
        parallaxStrength
      }
    });
  }, [linesGradient, enabledWaves, lineCount, lineDistance, topWavePosition, middleWavePosition, bottomWavePosition, animationSpeed, interactive, bendRadius, bendStrength, mouseDamping, parallax, parallaxStrength]);

  return (
    <div
      ref={containerRef}
      className={styles.wrapper}
      style={{
        mixBlendMode: mixBlendMode as any
      }}
    />
  );
}

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || ['#5227FF', '#7cff67', '#5227FF']);

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
    <SilkeBox gap="s" vPad="s" column>
      <SilkeTextSmall>Gradient Colors</SilkeTextSmall>
      <SilkeBox gap="s" vPad="s">
        {value.map((color: string, index: number) => (
          <SilkeColorPickerButton
            value={color}
            size="s"
            onChange={(v) => handleChange(v, index)}
            key={index}
          />
        ))}
      </SilkeBox>
    </SilkeBox>
  );
};

registerVevComponent(FloatingLines, {
  name: "FloatingLines",
  props: [
    {
      name: "lineCount", title: "Line Count", type: "number", initialValue: 6, options: {
        display: "slider",
        min: 1,
        max: 20,
      }
    },
    {
      name: "lineDistance", title: "Line Distance", type: "number", initialValue: 5, options: {
        display: "slider",
        min: 1,
        max: 100,
      }
    },
    {
      name: "bendRadius", title: "Bend Radius", type: "number", initialValue: 5.0, options: {
        display: "slider",
        min: 1,
        max: 30,
      }
    },
    {
      name: "bendStrength", title: "Bend Strength", type: "number", initialValue: -0.5, options: {
        display: "slider",
        min: -15,
        max: 15,
      }
    },
    {
      name: "animationSpeed", title: "Animation Speed", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 2,
      }
    },
    { name: "interactive", title: " Mouse interactive", type: "boolean", initialValue: true },
    { name: "linesGradient", title: "Lines Gradient", type: "array", initialValue: ['#5227FF', '#7cff67', '#5227FF'], component: multipleColorSelect, of: "string" },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default FloatingLines;

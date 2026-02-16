import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { registerVevComponent } from '@vev/react';
import styles from './Aurora.module.css';
import { SilkeBox, SilkeColorPickerButton, SilkeTextSmall } from '@vev/silke';
import AuroraWorker from './aurora-worker?worker';

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

const DEFAULT_COLORS = ['#5227FF', '#7cff67', '#5227FF'];

const hexToRGB = (hex: string): [number, number, number] => {
  const c = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const flattenColorStops = (stops: string[] = DEFAULT_COLORS) => {
  const normalized = stops.slice(0, 3);
  while (normalized.length < 3) normalized.push(normalized[normalized.length - 1] || DEFAULT_COLORS[0]);
  return new Float32Array(normalized.flatMap((color) => hexToRGB(color)));
};

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  hostRef: React.RefObject<HTMLDivElement>;
}

function Aurora({
  colorStops = DEFAULT_COLORS,
  amplitude = 1.0,
  blend = 0.5,
  speed = 1.0,
  hostRef,
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Send props to worker
  useEffect(() => {
    workerRef.current?.postMessage({
      type: 'props',
      data: {
        amplitude,
        blend,
        speed,
        colorStops: flattenColorStops(colorStops)
      }
    });
  }, [colorStops, amplitude, blend, speed]);

  // Mouse listener - poll for hostRef availability
  useEffect(() => {
    let mounted = true;
    let removeListener: (() => void) | null = null;

    const onMouse = (e: MouseEvent) => {
      if (!workerRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y } });
    };

    const trySetup = () => {
      const host = hostRef.current;
      if (!host) {
        if (mounted) requestAnimationFrame(trySetup);
        return;
      }
      host.addEventListener('mousemove', onMouse, { passive: true });
      removeListener = () => host.removeEventListener('mousemove', onMouse);
    };

    trySetup();

    return () => {
      mounted = false;
      removeListener?.();
    };
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    canvas.className = styles.canvas;
    container.appendChild(canvas);

    let worker: Worker | null = null;

    if (supportsOffscreen) {
      const offscreen = canvas.transferControlToOffscreen();
      worker = new AuroraWorker() as Worker;
      workerRef.current = worker;

      worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          worker!.postMessage({
            type: 'props',
            data: {
              amplitude,
              blend,
              speed,
              colorStops: flattenColorStops(colorStops)
            }
          });
          const rect = container.getBoundingClientRect();
          worker!.postMessage({ type: 'resize', data: getCanvasSize(rect) });
          worker!.postMessage({ type: 'start' });
        }
      };
    }

    // Resize
    const ro = new ResizeObserver(() => {
      if (!worker) return;
      const rect = container.getBoundingClientRect();
      worker.postMessage({ type: 'resize', data: getCanvasSize(rect) });
    });
    ro.observe(container);

    // Visibility
    const io = new IntersectionObserver(([e]) => {
      worker?.postMessage({ type: 'visibility', data: { visible: e.isIntersecting } });
    }, { threshold: 0.02 });
    io.observe(container);

    return () => {
      if (worker) {
        worker.postMessage({ type: 'cleanup' });
        worker.terminate();
        workerRef.current = null;
      }
      ro.disconnect();
      io.disconnect();
      container.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} className={styles.wrapper} />;
}

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || DEFAULT_COLORS);

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
    <SilkeBox column vPad="s">
      <SilkeTextSmall>Colors</SilkeTextSmall>
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

registerVevComponent(Aurora, {
  name: "Aurora",
  type: 'both',
  props: [
    {
      name: "blend", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "speed", type: "number", initialValue: 1.0, options: {
        display: "slider",
        min: 0,
        max: 2,
      }
    },
    {
      name: "amplitude", type: "number", initialValue: 1.0, options: {
        display: "slider",
        min: 0,
        max: 2,
      }
    },
    { name: "colorStops", type: "array", title: "Colors", initialValue: ["#5227FF", "#7cff67", "#5227FF"], component: multipleColorSelect, of: "string" },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
});

export default Aurora;

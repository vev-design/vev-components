import React, { useEffect, useRef, useState } from "react";
import { registerVevComponent } from "@vev/react";
import styles from './Particles.module.css';
import { SilkeBox, SilkeColorPickerButton, SilkeText, SilkeTextSmall } from "@vev/silke";
import ParticlesWorker from './particles-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  className?: string;
}

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
      console.warn('[Particles] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new ParticlesWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            particleSpread,
            speed,
            particleColors: particleColors || ['#ffffff', '#ffffff', '#ffffff'],
            moveParticlesOnHover,
            particleHoverFactor,
            alphaParticles,
            particleBaseSize,
            sizeRandomness,
            cameraDistance,
            disableRotation
          }
        });

        worker.postMessage({
          type: 'rebuild',
          data: {
            count: particleCount,
            colors: particleColors || ['#ffffff', '#ffffff', '#ffffff']
          }
        });

        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const handlePointerMove = (e: PointerEvent) => {
      if (!workerRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      workerRef.current.postMessage({ type: 'pointer', data: { x, y, inside: true } });
    };

    const handlePointerLeave = () => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({ type: 'pointer', data: { x: 0, y: 0, inside: false } });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
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
        particleSpread,
        speed,
        particleColors: particleColors || ['#ffffff', '#ffffff', '#ffffff'],
        moveParticlesOnHover,
        particleHoverFactor,
        alphaParticles,
        particleBaseSize,
        sizeRandomness,
        cameraDistance,
        disableRotation
      }
    });
  }, [particleSpread, speed, particleColors, moveParticlesOnHover, particleHoverFactor, alphaParticles, particleBaseSize, sizeRandomness, cameraDistance, disableRotation]);

  // Rebuild particles when count or colors change
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'rebuild',
      data: {
        count: particleCount,
        colors: particleColors || ['#ffffff', '#ffffff', '#ffffff']
      }
    });
  }, [particleCount, particleColors]);

  const wrapperClassName = className ? `${styles.wrapper} ${className}` : styles.wrapper;
  return <div ref={containerRef} className={wrapperClassName} />;
};

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState(props.value || ["#ffffff", "#ffffff", "#ffffff"]);
  const handleChange = (color: string, index: number) => {
    setValue(value.map((c: string, i: number) => i === index ? color : c));
    props.onChange?.(value);
  }

  return (
    <SilkeBox gap="s" vAlign="center" hAlign="start" vPad="s" column>
      <SilkeTextSmall>Particles Colors</SilkeTextSmall>
      <SilkeBox>
        <SilkeBox gap="s" align="center" vPad="s">
          {value.map((color: string, index: number) => (
            <SilkeColorPickerButton value={color} size="s" onChange={(v) => handleChange(v, index)} key={index} />
          ))}
        </SilkeBox>
      </SilkeBox>
    </SilkeBox>
  )
}


registerVevComponent(Particles, {
  name: "Particles",
  props: [
    {
      name: "particleCount", type: "number", initialValue: 200, options: {
        display: "slider",
        min: 0,
        max: 1000,
      }
    },
    {
      name: "particleSpread", type: "number", initialValue: 10, options: {
        display: "slider",
        min: 0,
        max: 100,
      }
    },
    {
      name: "speed", type: "number", initialValue: 0.1, options: {
        display: "slider",
        min: 0,
        max: 2,
      }
    },
    {
      name: "particleBaseSize", title: "Base Size", type: "number", initialValue: 100, options: {
        display: "slider",
        min: 0,
        max: 100,
      }
    },
    { name: "moveParticlesOnHover", title: "Mouse interaction", type: "boolean", initialValue: false },
    { name: "alphaParticles", title: "Particles transparency", type: "boolean", initialValue: false },
    { name: "disableRotation", title: "Disable rotation", type: "boolean", initialValue: false },
    { name: "particleColors", type: "array", initialValue: ["#ffffff", "#ffffff", "#ffffff"], component: multipleColorSelect, of: "string" },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Particles;

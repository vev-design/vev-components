import React, { useRef, useEffect, useState } from "react";
import styles from './lightrays.module.css';
import { registerVevComponent } from "@vev/react";
import { SilkeColorPickerButton } from "@vev/silke";
import LightRaysWorker from './lightrays-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

interface LightRaysProps {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  className?: string;
}

const DEFAULT_COLOR = '#ffffff';

const LightRays: React.FC<LightRaysProps> = ({
  raysOrigin = 'top-center',
  raysColor = DEFAULT_COLOR,
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0.0,
  distortion = 0.0,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Visibility observer
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Initialize worker when visible
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    if (!supportsOffscreen) {
      console.warn('[LightRays] OffscreenCanvas not supported');
      return () => {
        container.removeChild(canvas);
      };
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new LightRaysWorker() as Worker;
    workerRef.current = worker;

    worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        worker.postMessage({
          type: 'props',
          data: {
            raysOrigin,
            raysColor,
            raysSpeed,
            lightSpread,
            rayLength,
            pulsating,
            fadeDistance,
            saturation,
            followMouse,
            mouseInfluence,
            noiseAmount,
            distortion
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
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      workerRef.current.postMessage({ type: 'pointer', data: { x, y } });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

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
  }, [isVisible]);

  // Update props when they change
  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'props',
      data: {
        raysOrigin,
        raysColor,
        raysSpeed,
        lightSpread,
        rayLength,
        pulsating,
        fadeDistance,
        saturation,
        followMouse,
        mouseInfluence,
        noiseAmount,
        distortion
      }
    });
  }, [
    raysOrigin,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    followMouse,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  return <div ref={containerRef} className={[styles.wrapper, className].join(' ')} />;
};


const colorSelect = (props: any) => {
  return <SilkeColorPickerButton label="Rays Color" value={props.value} size="s" onChange={(v) => props.onChange?.(v)} />;
}


registerVevComponent(LightRays, {
  name: "LightRays",
  props: [
    { name: "raysColor", type: "string", initialValue: "#ffffff", component: colorSelect, },
    { name: "raysOrigin", type: "select", initialValue: "top-center", options:{
      display: "dropdown",
      items: [
        { label: "Top Center", value: "top-center" },
        { label: "Top Left", value: "top-left" },
        { label: "Top Right", value: "top-right" },
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
        { label: "Bottom Center", value: "bottom-center" },
        { label: "Bottom Left", value: "bottom-left" },
        { label: "Bottom Right", value: "bottom-right" },
      ],
    } },
    { name: "raysSpeed", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 3,
    } },
    { name: "lightSpread", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "rayLength", type: "number", initialValue: 3, options:{
      display: "slider",
      min: 0,
      max: 10,
    } },
    { name: "fadeDistance", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 10,
    } },
    { name: "saturation", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "mouseInfluence", type: "number", initialValue: 0.1, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "noiseAmount", type: "number", initialValue: 0.0, options:{
      display: "slider",
      min: 0,
      max: 0.5,
    } },
    { name: "distortion", type: "number", initialValue: 0.0, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "pulsating", type: "boolean", initialValue: false },
    { name: "followMouse", type: "boolean", initialValue: true },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default LightRays;

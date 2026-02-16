import React, { useEffect, useLayoutEffect, useRef } from 'react';
import styles from './FaultyTerminal.module.css';
import { registerVevComponent } from '@vev/react';
import { SilkeColorPickerButton } from "@vev/silke";
// @ts-ignore - Vev worker import syntax
import FaultyTerminalWorker from './faulty-terminal-worker?worker';

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

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3)
    h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

interface FaultyTerminalProps {
  scale?: number;
  gridMul?: [number, number];
  digitSize?: number;
  timeScale?: number;
  pause?: boolean;
  scanlineIntensity?: number;
  glitchAmount?: number;
  flickerAmount?: number;
  noiseAmp?: number;
  chromaticAberration?: number;
  dither?: number | boolean;
  curvature?: number;
  tint?: string;
  mouseReact?: boolean;
  mouseStrength?: number;
  pageLoadAnimation?: boolean;
  brightness?: number;
  hostRef: React.RefObject<HTMLDivElement>;
}

function FaultyTerminal({
  scale = 1,
  gridMul = [2, 1],
  digitSize = 1.5,
  timeScale = 0.3,
  pause = false,
  scanlineIntensity = 0.3,
  glitchAmount = 1,
  flickerAmount = 1,
  noiseAmp = 0,
  chromaticAberration = 0,
  dither = 0,
  curvature = 0.2,
  tint = '#ffffff',
  mouseReact = true,
  mouseStrength = 0.2,
  pageLoadAnimation = true,
  brightness = 1,
  hostRef,
}: FaultyTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const propsRef = useRef({ mouseReact });

  // Process dither value
  const processedDither = typeof dither === 'boolean' ? (dither ? 1 : 0) : dither;

  // Keep props ref updated
  useEffect(() => {
    propsRef.current.mouseReact = mouseReact;
  }, [mouseReact]);

  // Send props to worker
  useEffect(() => {
    workerRef.current?.postMessage({
      type: 'props',
      data: {
        scale, gridMul, digitSize, timeScale, pause, scanlineIntensity,
        glitchAmount, flickerAmount, noiseAmp, chromaticAberration,
        dither: processedDither, curvature, tint: hexToRgb(tint),
        mouseReact, mouseStrength, pageLoadAnimation, brightness
      }
    });
  }, [scale, gridMul, digitSize, timeScale, pause, scanlineIntensity, glitchAmount, flickerAmount, noiseAmp, chromaticAberration, processedDither, curvature, tint, mouseReact, mouseStrength, pageLoadAnimation, brightness]);

  // Mouse listener - poll for hostRef availability
  useEffect(() => {
    let mounted = true;
    let removeListener: (() => void) | null = null;

    const onMouse = (e: MouseEvent) => {
      if (!propsRef.current.mouseReact || !workerRef.current) return;
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
      worker = new FaultyTerminalWorker() as Worker;
      workerRef.current = worker;

      worker.postMessage({ type: 'init', data: { canvas: offscreen } }, [offscreen]);

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          worker!.postMessage({
            type: 'props',
            data: {
              scale, gridMul, digitSize, timeScale, pause, scanlineIntensity,
              glitchAmount, flickerAmount, noiseAmp, chromaticAberration,
              dither: processedDither, curvature, tint: hexToRgb(tint),
              mouseReact, mouseStrength, pageLoadAnimation, brightness
            }
          });

          const { width, height } = getCanvasSize(container.getBoundingClientRect());
          worker!.postMessage({ type: 'resize', data: { width, height } });
          worker!.postMessage({ type: 'start' });
        }
      };
    }

    // Resize
    const ro = new ResizeObserver(() => {
      if (!worker) return;
      const { width, height } = getCanvasSize(container.getBoundingClientRect());
      worker.postMessage({ type: 'resize', data: { width, height } });
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

registerVevComponent(FaultyTerminal, {
  name: "FaultyTerminal",
  props: [
    { name: "scale", type: "number", initialValue: 1, options: { display: "slider", min: 1, max: 3 } },
    { name: "digitSize", title: "Digit Size", type: "number", initialValue: 1.5, options: { display: "slider", min: 0.5, max: 2 } },
    { name: "timeScale", title: "Speed", type: "number", initialValue: 0.3, options: { display: "slider", min: 0, max: 3 } },
    { name: "noiseAmp", title: "Noise Amplitude", type: "number", initialValue: 0, options: { display: "slider", min: 0.5, max: 1 } },
    { name: "brightness", title: "Brightness", type: "number", initialValue: 0.6, options: { display: "slider", min: 0.1, max: 1 } },
    { name: "scanlineIntensity", title: "Scanline Intensity", type: "number", initialValue: 0.5, options: { display: "slider", min: 0, max: 2 } },
    { name: "curvature", title: "Curvature", type: "number", initialValue: 0.1, options: { display: "slider", min: 0, max: 0.5 } },
    { name: "mouseStrength", title: "Mouse Strength", type: "number", initialValue: 0.5, options: { display: "slider", min: 0, max: 2 } },
    { name: "mouseReact", title: "Mouse interaction", type: "boolean", initialValue: true },
    { name: "tint", title: "Tint color", type: "string", initialValue: "#ffffff", component: SilkeColorPickerButton },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default FaultyTerminal;

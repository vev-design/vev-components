import React from "react";
import styles from "./LightPillar.module.css";
import { registerVevComponent } from "@vev/react";
import { useRef, useEffect } from 'react';
import { SilkeColorPickerButton } from "@vev/silke";
import LightPillarWorker from './lightpillar-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;

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

    // The worker derives its drawing buffer size from the CSS size, so it can
    // change resolution on its own when it needs to shed load.
    let lastWidth = -1;
    let lastHeight = -1;

    const postSize = () => {
      if (!workerRef.current) return;
      const rect = container.getBoundingClientRect();
      const cssWidth = Math.round(rect.width);
      const cssHeight = Math.round(rect.height);
      if (cssWidth === lastWidth && cssHeight === lastHeight) return;
      lastWidth = cssWidth;
      lastHeight = cssHeight;
      workerRef.current.postMessage({ type: 'resize', data: { cssWidth, cssHeight } });
    };

    let warnedFrozen = false;

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'quality') {
        if (e.data.data?.frozen && !warnedFrozen) {
          warnedFrozen = true;
          console.warn(
            '[LightPillar] This device cannot render the effect smoothly, so the animation was paused to keep the page responsive.'
          );
        }
        return;
      }

      if (e.data.type !== 'ready') return;

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

      postSize();
      worker.postMessage({ type: 'motion', data: { reduced: prefersReducedMotion() } });
      worker.postMessage({ type: 'start' });
    };

    // ResizeObserver can fire every frame while an element is being dragged in
    // the editor, and every size change reallocates the drawing buffer.
    let resizeFrame: number | null = null;
    const handleResize = () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        postSize();
      });
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    // Pause rendering when the component is scrolled off-screen or the tab is
    // hidden. Both conditions are tracked so neither can resume the other.
    let onScreen = true;

    const postVisibility = () => {
      workerRef.current?.postMessage({
        type: 'visibility',
        data: { visible: onScreen && !document.hidden },
      });
    };

    const intersectionObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            const entry = entries[entries.length - 1];
            if (!entry) return;
            onScreen = entry.isIntersecting;
            postVisibility();
          },
          { threshold: [0, 0.01] }
        )
      : null;
    intersectionObserver?.observe(container);

    document.addEventListener('visibilitychange', postVisibility);

    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia(REDUCED_MOTION_QUERY)
      : null;
    const handleMotionChange = (event: MediaQueryListEvent) => {
      workerRef.current?.postMessage({ type: 'motion', data: { reduced: event.matches } });
    };
    motionQuery?.addEventListener('change', handleMotionChange);

    return () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      motionQuery?.removeEventListener('change', handleMotionChange);
      document.removeEventListener('visibilitychange', postVisibility);
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

  // Mouse tracking only matters when interactivity is on — avoid window-wide
  // mousemove traffic (and worker postMessages) otherwise.
  useEffect(() => {
    if (!interactive) return;
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!workerRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y } });
    };

    const handleMouseLeave = () => {
      workerRef.current?.postMessage({ type: 'mouseLeave' });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive]);

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

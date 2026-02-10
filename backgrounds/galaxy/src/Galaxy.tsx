import React, { useEffect, useLayoutEffect, useRef } from 'react';
import styles from './Galaxy.module.css';
import { registerVevComponent } from '@vev/react';
// @ts-ignore - Vev worker import syntax
import GalaxyWorker from './galaxy-worker?worker';

const supportsOffscreen = typeof OffscreenCanvas !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

type Vec2 = [number, number];

interface GalaxyProps {
  focal?: Vec2;
  rotation?: Vec2;
  starSpeed?: number;
  density?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  mouseRepulsion?: boolean;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  repulsionStrength?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
  opacity?: number;
  hostRef: React.RefObject<HTMLDivElement>;
}

function Galaxy({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  mouseRepulsion = true,
  repulsionStrength = 2,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  autoCenterRepulsion = 0,
  transparent = true,
  opacity = 1.0,
  hostRef,
}: GalaxyProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const propsRef = useRef({ mouseInteraction });

  // Keep props ref updated
  useEffect(() => {
    propsRef.current.mouseInteraction = mouseInteraction;
  }, [mouseInteraction]);

  // Send props to worker
  useEffect(() => {
    workerRef.current?.postMessage({
      type: 'props',
      data: { focal, rotation, starSpeed, density, disableAnimation, speed, glowIntensity, mouseRepulsion, repulsionStrength, twinkleIntensity, rotationSpeed, autoCenterRepulsion, transparent, opacity }
    });
  }, [focal, rotation, starSpeed, density, disableAnimation, speed, glowIntensity, mouseRepulsion, repulsionStrength, twinkleIntensity, rotationSpeed, autoCenterRepulsion, transparent, opacity]);

  // Mouse listener - poll for hostRef availability since refs don't trigger re-renders
  useEffect(() => {
    let mounted = true;
    let removeListener: (() => void) | null = null;

    const onMouse = (e: MouseEvent) => {
      if (!propsRef.current.mouseInteraction || !workerRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      workerRef.current.postMessage({ type: 'mouse', data: { x, y, active: inside ? 1 : 0 } });
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
    container.appendChild(canvas);

    let worker: Worker | null = null;

    if (supportsOffscreen) {
      const offscreen = canvas.transferControlToOffscreen();
      worker = new GalaxyWorker() as Worker;
      workerRef.current = worker;

      worker.postMessage({ type: 'init', data: { canvas: offscreen, transparent } }, [offscreen]);

      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          worker!.postMessage({
            type: 'props',
            data: { focal, rotation, starSpeed, density, disableAnimation, speed, glowIntensity, mouseRepulsion, repulsionStrength, twinkleIntensity, rotationSpeed, autoCenterRepulsion, transparent, opacity }
          });
          const rect = container.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 1);
          worker!.postMessage({ type: 'resize', data: { width: Math.floor(rect.width * dpr), height: Math.floor(rect.height * dpr) } });
          worker!.postMessage({ type: 'start' });
        }
      };
    }

    // Resize
    const ro = new ResizeObserver(() => {
      if (!worker) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1);
      worker.postMessage({ type: 'resize', data: { width: Math.floor(rect.width * dpr), height: Math.floor(rect.height * dpr) } });
    });
    ro.observe(container);

    const onLeave = () => worker?.postMessage({ type: 'mouseLeave' });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });

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
      canvas.removeEventListener('pointerleave', onLeave);
      container.removeChild(canvas);
    };
  }, []);

  return <div ref={containerRef} className={styles.wrapper} />;
}

registerVevComponent(Galaxy, {
  name: "Galaxy",
  props: [
    { name: "opacity", title: "Opacity", type: "number", initialValue: 1.0, options: { display: "slider", min: 0, max: 1 } },
    { name: "density", title: "Density", type: "number", initialValue: 1, options: { display: "slider", min: 0, max: 3 } },
    { name: "glowIntensity", title: "Glow Intensity", type: "number", initialValue: 0.3, options: { display: "slider", min: 0, max: 1 } },
    { name: "twinkleIntensity", title: "Twinkle Intensity", type: "number", initialValue: 0.3, options: { display: "slider", min: 0, max: 1 } },
    { name: "rotationSpeed", title: "Rotation Speed", type: "number", initialValue: 0.1, options: { display: "slider", min: 0, max: 0.5 } },
    { name: "repulsionStrength", title: "Repulsion Strength", type: "number", initialValue: 2, options: { display: "slider", min: 0, max: 10 } },
    { name: "autoCenterRepulsion", title: "Auto Center Repulsion", type: "number", initialValue: 0, options: { display: "slider", min: 0, max: 20 } },
    { name: "starSpeed", title: "Star Speed", type: "number", initialValue: 0.5, options: { display: "slider", min: 0, max: 5 } },
    { name: "speed", title: "Animation Speed", type: "number", initialValue: 1.0, options: { display: "slider", min: 0, max: 3 } },
    { name: "mouseInteraction", title: "Mouse Interaction", type: "boolean", initialValue: true },
    { name: "mouseRepulsion", title: "Mouse Repulsion", type: "boolean", initialValue: true },
  ],
  editableCSS: [{ selector: styles.wrapper, properties: ["background"] }],
  type: 'both',
});

export default Galaxy;

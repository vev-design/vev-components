import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { MathUtils } from 'three';
import { useModel } from '../hooks/use-model';
import { CameraHome, useSceneSetup } from '../hooks/use-scene-setup';
import { useSceneModel } from '../hooks/use-scene-model';
import { useCenterModel } from '../hooks/use-center-model';
import { useEnvironment } from '../hooks/use-environment';
import { useGroundShadow } from '../hooks/use-ground-shadow';
import { Object3dContext } from '../context/object-3d-context';
import { updateHotspotVisibility, useHotspots } from '../hooks/use-hotspots';
import { useHotspotListener } from '../hooks/use-hotspot-listener';
import styles from '../object-3d.module.css';
import { useAnimationFrame } from '../hooks/use-animation-frame';
import { useScrollProgress } from '../hooks/use-scroll-progress';
import { useInView } from '../hooks/use-in-view';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { usePointerTilt } from '../hooks/use-pointer-tilt';

// Fast loads never show the loading bar
const LOADING_BAR_DELAY = 800;
// Start to load the model and lighting this far before the widget scrolls into view
const LAZY_LOAD_MARGIN = '400px';
const SCROLL_SMOOTHING = 8;
const TILT_SMOOTHING = 4;
const MAX_TILT = MathUtils.degToRad(15);
// At exactly the clip duration, a looping clip wraps back to frame 0
const CLIP_END_MARGIN = 0.001;
const EPSILON = 1e-5;

export const Object3dViewer = ({ className }: { className?: string }) => {
  const {
    modelUrl,
    hdri,
    disabled,
    schemaOpen,
    editMode,
    posterUrl,
    scrollAnimation,
    scrollRotate,
    scrollRotateAmount = 360,
    scrollTarget,
    scrollStart,
    scrollEnd,
    tilt,
    showBackground = false,
    backgroundBlur = 0,
    groundShadow = false,
    shadowOpacity = 0.5,
    hostRef,
    onModelLoaded,
  } = useContext(Object3dContext);

  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [labelElement, setLabelElement] = useState<HTMLDivElement | null>(null);
  const [showLoading, setShowLoading] = useState<boolean>(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowLoading(true), LOADING_BAR_DELAY);
    return () => clearTimeout(timeout);
  }, []);

  const inView = useInView(root);
  const nearView = useInView(root, LAZY_LOAD_MARGIN, true);
  const reducedMotion = useReducedMotion();

  // The scene renders only when something changed. `invalidate` requests a new frame.
  const loopActive = (!disabled || !!schemaOpen) && inView;
  const loopActiveRef = useRef(loopActive);
  loopActiveRef.current = loopActive;
  const needsRender = useRef(true);
  const renderFrame = useRef<() => void>(() => undefined);
  const pendingFrame = useRef<number | null>(null);

  const invalidate = useCallback(() => {
    needsRender.current = true;
    // When the loop is off (editor canvas, off screen), render one frame
    if (!loopActiveRef.current && pendingFrame.current === null) {
      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = null;
        if (needsRender.current) renderFrame.current();
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    };
  }, []);

  const home = useRef<CameraHome | null>(null);
  const { scene, pivot, camera, renderer, labelRenderer, controls, tweens, updateAutoRotate } =
    useSceneSetup(canvas, labelElement, home, invalidate);

  const model = useModel(modelUrl, renderer, nearView);
  const { currentModel, mixer, clipDuration, isAnimating } = useSceneModel(
    pivot,
    model.gltf,
    invalidate,
  );
  useCenterModel(model.gltf, camera, controls, home, invalidate);

  const environment = useEnvironment(
    scene,
    renderer,
    hdri,
    nearView,
    showBackground,
    backgroundBlur,
    invalidate,
  );
  useGroundShadow(scene, currentModel, groundShadow, shadowOpacity, invalidate);

  // Used for adding hotspots
  useHotspotListener(labelRenderer, camera, pivot);

  // Used for rendering hotspots
  const hotspotsRef = useHotspots(pivot, camera, controls, tweens, invalidate);

  const scrollEnabled = !!scrollAnimation || !!scrollRotate;
  const scrollProgress = useScrollProgress(hostRef, scrollEnabled, scrollTarget);
  const smoothedProgress = useRef<number | null>(null);
  const lastScrollTime = useRef<number | null>(null);

  const pointer = usePointerTilt(root, !!tilt && !reducedMotion && !editMode);
  const tiltOffset = useRef({ x: 0, y: 0 });

  renderFrame.current = () => {
    if (!renderer || !scene || !camera || !labelRenderer) return;
    needsRender.current = false;
    updateHotspotVisibility(hotspotsRef.current, camera);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };

  useAnimationFrame(({ delta }) => {
    if (!controls || !pivot || !tweens) return;

    updateAutoRotate(reducedMotion);
    // Camera changes call `invalidate` through the controls' change event
    controls.update();
    let changed = tweens.update();

    let progress: number | null = null;
    if (scrollEnabled) {
      // Remap raw scroll progress using start/end offsets
      const start = (scrollStart ?? 0) / 100;
      const end = (scrollEnd ?? 100) / 100;
      const range = end - start;
      const rawProgress =
        range > 0 ? Math.max(0, Math.min(1, (scrollProgress.current - start) / range)) : 0;

      // Lerp for smooth interpolation (frame-rate independent)
      if (smoothedProgress.current === null) {
        smoothedProgress.current = rawProgress;
      } else {
        const factor = 1 - Math.exp(-SCROLL_SMOOTHING * delta);
        smoothedProgress.current += (rawProgress - smoothedProgress.current) * factor;
      }
      progress = smoothedProgress.current;
    } else {
      smoothedProgress.current = null;
    }

    if (mixer.current) {
      if (scrollAnimation && progress !== null && clipDuration.current > 0) {
        const time = Math.min(
          progress * clipDuration.current,
          clipDuration.current - CLIP_END_MARGIN,
        );
        if (lastScrollTime.current === null || Math.abs(time - lastScrollTime.current) > EPSILON) {
          mixer.current.setTime(time);
          lastScrollTime.current = time;
          changed = true;
        }
      } else {
        lastScrollTime.current = null;
        // Checked before the update, so the frame where an animation stops is also rendered
        if (isAnimating()) changed = true;
        mixer.current.update(delta);
      }
    }

    const tiltFactor = 1 - Math.exp(-TILT_SMOOTHING * delta);
    tiltOffset.current.x += (pointer.current.x - tiltOffset.current.x) * tiltFactor;
    tiltOffset.current.y += (pointer.current.y - tiltOffset.current.y) * tiltFactor;

    const scrollAngle =
      scrollRotate && progress !== null ? progress * MathUtils.degToRad(scrollRotateAmount) : 0;
    const rotationX = tiltOffset.current.y * MAX_TILT;
    const rotationY = scrollAngle + tiltOffset.current.x * MAX_TILT;
    if (
      Math.abs(pivot.rotation.x - rotationX) > EPSILON ||
      Math.abs(pivot.rotation.y - rotationY) > EPSILON
    ) {
      pivot.rotation.set(rotationX, rotationY, 0);
      changed = true;
    }

    if (changed || needsRender.current) renderFrame.current();
  }, loopActive);

  // The model and the lighting are both needed before the poster can go
  const isLoaded = model.status === 'loaded' && environment.ready;
  const isLoading = nearView && !isLoaded && model.status !== 'error';
  const displayLoadingBar = isLoading && showLoading;
  const loadingPercentage = Math.min(model.progress, environment.progress);

  const onModelLoadedRef = useRef(onModelLoaded);
  onModelLoadedRef.current = onModelLoaded;
  useEffect(() => {
    if (isLoaded && onModelLoadedRef.current) onModelLoadedRef.current();
  }, [isLoaded]);

  return (
    <div ref={setRoot} className={`${className || ''} ${styles.viewer}`}>
      <canvas ref={setCanvas} className={styles.canvas} />
      <div ref={setLabelElement} className={styles.labels} />
      {posterUrl && (
        <img
          src={posterUrl}
          alt=""
          className={`${styles.poster} ${isLoaded ? styles.posterHidden : ''}`}
        />
      )}
      {displayLoadingBar && (
        <div
          className={styles.loadingBar}
          // Stay short of full until the model is ready, so the bar never completes early
          style={{ '--bar-width': `${loadingPercentage - 1}%` } as React.CSSProperties}
        />
      )}
    </div>
  );
};

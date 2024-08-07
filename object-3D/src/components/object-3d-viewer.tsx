import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useModel } from '../hooks/use-model';
import { useSceneSetup } from '../hooks/use-scene-setup';
import { useCenterModel } from '../hooks/use-center-model';
import { Object3dContext } from '../context/object-3d-context';
import { useHotspots } from '../hooks/use-hotspots';
import { isHotspotVisible } from '../util/is-hotspot-visible';
import { useHotspotListener } from '../hooks/use-hotspot-listener';
import TWEEN from '@tweenjs/tween.js';
import styles from '../object-3d.module.css';
import { useAnimationFrame } from '../hooks/use-animation-frame';

export const Object3dViewer = ({ className }: { className?: string }) => {
  const { modelUrl, disabled, schemaOpen, posterUrl } = useContext(Object3dContext);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [labelRef, setLabelRef] = useState<HTMLDivElement | null>(null);
  const loadingBarRef = useRef<HTMLDivElement | null>(null);
  const [lightLoadingPercentage, setLightLoadingPercentage] = useState<number>(0);
  const [modelLoadingPercentage, setModelLoadingPercentage] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [showLoading, setShowLoading] = useState<boolean>(false);
  const displayLoadingBar = !isLoaded && showLoading;

  useEffect(() => {
    setTimeout(() => {
      setShowLoading(true);
    }, 800);
  }, []);

  useEffect(() => {
    if (loadingBarRef.current && loadingBarRef.current.style) {
      loadingBarRef.current.style.setProperty(
        '--bar-width',
        `${Math.min(lightLoadingPercentage, modelLoadingPercentage) - 1}%`,
      );
    }

    if (Math.min(lightLoadingPercentage, modelLoadingPercentage) >= 100) {
      setIsLoaded(true);
    }
  }, [lightLoadingPercentage, modelLoadingPercentage]);

  const model = useModel(modelUrl, setModelLoadingPercentage);

  const { scene, camera, renderer, labelRenderer, controls, mixer, currentModel } = useSceneSetup(
    canvasRef,
    labelRef,
    model,
    setLightLoadingPercentage,
  );

  useCenterModel(model, camera, controls, scene, renderer, labelRenderer);

  // Used for adding hotspots
  useHotspotListener(labelRenderer, camera, scene);

  // Used for rendering hotspots
  const hotspotsRef = useHotspots(scene, camera, controls);

  useEffect(() => {
    const interval = setInterval(() => {
      hotspotsRef.current.forEach((hotspot) => {
        isHotspotVisible(hotspot, camera, currentModel);
      });
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [camera, currentModel, hotspotsRef]);

  useAnimationFrame(({ delta, frameCount }) => {
    if (controls && renderer && labelRenderer && hotspotsRef.current && mixer) {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      if (mixer) {
        mixer.update(delta);
      }

      TWEEN.update();
    }
  }, !disabled || schemaOpen);

  useLayoutEffect(() => {
    if (controls && renderer && labelRenderer) {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      hotspotsRef.current.forEach((hotspot) => {
        isHotspotVisible(hotspot, camera, currentModel);
      });
    }
  }, [camera, controls, hotspotsRef, labelRenderer, renderer, scene]);

  return (
    <div className={`${className} ${styles.viewer}`}>
      {displayLoadingBar && <div ref={loadingBarRef} className={styles.loadingBar} />}
      {posterUrl && displayLoadingBar && (
        <img
          src={posterUrl}
          className={styles.poster}
          style={!displayLoadingBar ? { opacity: 0 } : {}}
        />
      )}
      <div ref={setLabelRef} />
      <canvas ref={setCanvasRef} />
    </div>
  );
};

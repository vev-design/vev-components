import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { useModel } from '../hooks/use-model';
import { useSceneSetup } from '../hooks/use-scene-setup';
import { useCenterModel } from '../hooks/use-center-model';
import { Object3dContext } from '../context/object-3d-context';
import { useHotspots } from '../hooks/use-hotspots';
import { isHotspotVisible } from '../util/is-hotspot-visible';
import { useHotspotListener } from '../hooks/use-hotspot-listener';
import { useAnimationFrame } from '../hooks/use-animation-frame';
import TWEEN from '@tweenjs/tween.js';
import styles from '../object-3d.module.css';

const LOADING_BAR_WIDTH = 200;

export const Object3dViewer = ({ className }: { className?: string }) => {
  const { modelUrl, disabled } = useContext(Object3dContext);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [labelRef, setLabelRef] = useState<HTMLDivElement | null>(null);
  const [lightLoadingPercentage, setLightLoadingPercentage] = useState<number>(0);
  const [modelLoadingPercentage, setModelLoadingPercentage] = useState<number>(0);

  useEffect(() => {}, [lightLoadingPercentage, modelLoadingPercentage]);

  const model = useModel(modelUrl, setModelLoadingPercentage);

  const { scene, camera, renderer, labelRenderer, controls, mixer } = useSceneSetup(
    canvasRef,
    labelRef,
    model,
    setLightLoadingPercentage,
  );

  useCenterModel(model, camera, controls, scene, renderer, labelRenderer);

  useHotspotListener(labelRenderer, camera, scene);
  const hotspotsRef = useHotspots(scene, camera, controls);

  useAnimationFrame(({ time, delta }) => {
    if (controls && renderer && labelRenderer && hotspotsRef.current && mixer) {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      hotspotsRef.current.forEach((hotspot) => {
        isHotspotVisible(hotspot, camera);
      });

      if (mixer) {
        mixer.update(delta);
      }

      TWEEN.update();
    }
  }, !disabled);

  useLayoutEffect(() => {
    if (controls && renderer && labelRenderer) {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      hotspotsRef.current.forEach((hotspot) => {
        isHotspotVisible(hotspot, camera);
      });
    }
  }, [camera, controls, hotspotsRef, labelRenderer, renderer, scene]);

  return (
    <div className={`${className} ${styles.viewer}`} style={{ position: 'relative' }}>
      <div className={styles.loadingBar} />
      <div ref={setLabelRef} />
      <canvas ref={setCanvasRef} />
    </div>
  );
};

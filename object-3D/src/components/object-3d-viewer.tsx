import React, { useContext, useEffect, useRef, useState } from 'react';
import { useModel } from '../hooks/use-model';
import { useSceneSetup } from '../hooks/use-scene-setup';
import { useCenterModel } from '../hooks/use-center-model';
import { Object3dContext } from '../context/object-3d-context';
import { useHotspots } from '../hooks/use-hotspots';
import { isHotspotVisible } from '../util/is-hotspot-visible';
import { useHotspotListener } from '../hooks/use-hotspot-listener';
import { useAnimationFrame } from '../hooks/use-animation-frame';

export const Object3dViewer = () => {
  const { modelUrl } = useContext(Object3dContext);

  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [labelRef, setLabelRef] = useState<HTMLDivElement | null>(null);

  const model = useModel(modelUrl);

  const { scene, camera, renderer, labelRenderer, controls, mixer, clock } = useSceneSetup(
    canvasRef,
    labelRef,
    model,
  );

  useCenterModel(model, camera, controls, scene);

  useHotspotListener(labelRenderer, camera, scene);
  const hotspotsRef = useHotspots(scene);

  useAnimationFrame(({ time, delta }) => {
    if (controls && renderer && labelRenderer && hotspotsRef.current && clock && mixer) {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      hotspotsRef.current.forEach((hotspot) => {
        isHotspotVisible(hotspot, camera);
      });

      const delta2 = clock.getDelta();
      if (mixer) {
        mixer.update(delta2);
      }
    }
  });

  return (
    <div style={{ position: 'relative' }}>
      <div ref={setLabelRef} />
      <canvas ref={setCanvasRef} />
    </div>
  );
};

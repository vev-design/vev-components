import React, { useContext, useEffect, useRef } from 'react';
import { useModel } from '../hooks/use-model';
import { useScene } from '../hooks/use-scene';
import { useCenterModel } from '../hooks/use-center-model';
import { Object3DContext } from '../context/Object3DContext';
import { useFrame, useStorage, useStore } from '@vev/react';
import { NO_ANIMATION } from '../Object3D';

export const Object3DViewer = () => {
  const { modelUrl } = useContext(Object3DContext);

  const canvasRef = useRef<HTMLCanvasElement>();
  const model = useModel(modelUrl);
  const { scene, camera, renderer, controls, mixer, clock } = useScene(canvasRef, model);
  useCenterModel(model, camera, controls, scene);
  useFrame(() => {
    if (controls.current && renderer.current) {
      controls.current.update();
      renderer.current.render(scene.current, camera.current);

      if (clock.current) {
        const delta = clock.current.getDelta();
        if (mixer.current) {
          mixer.current.update(delta);
        }
      }
    }
  });

  return <canvas ref={canvasRef}></canvas>;
};

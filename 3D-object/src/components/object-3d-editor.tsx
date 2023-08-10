import React, { useContext, useEffect, useRef } from 'react';
import { useModel } from '../hooks/use-model';
import { useScene } from '../hooks/use-scene';
import { useCenterModel } from '../hooks/use-center-model';
import { Object3dContext } from '../context/object-3d-context';
import { useHotspotListener } from '../hooks/use-hotspot-listener';
import { useHotspots } from '../hooks/use-hotspots';

export const Object3dEditor = () => {
  const { modelUrl } = useContext(Object3dContext);
  const canvasRef = useRef<HTMLCanvasElement>();
  const labelRef = useRef<HTMLDivElement>();
  const model = useModel(modelUrl);

  const { scene, camera, renderer, labelRenderer, controls, mixer, clock, rootMesh } = useScene(
    canvasRef,
    labelRef,
    model,
  );

  useCenterModel(model, camera, controls, scene);
  useHotspotListener(labelRenderer, camera, scene);
  useHotspots(scene);

  useEffect(() => {
    function animate() {
      requestAnimationFrame(animate);
      controls.current.update();
      renderer.current.render(scene.current, camera.current);
      labelRenderer.current.render(scene.current, camera.current);

      if (clock.current) {
        const delta = clock.current.getDelta();
        if (mixer.current) {
          mixer.current.update(delta);
        }
      }
    }

    if (controls.current && camera.current && renderer.current && scene.current) {
      animate();
    }
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={labelRef} />
      <canvas ref={canvasRef} />
    </div>
  );
};

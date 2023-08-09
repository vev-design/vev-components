import React, { useContext, useEffect, useRef } from 'react';
import { useModel } from '../hooks/use-model';
import { useScene } from '../hooks/use-scene';
import { useCenterModel } from '../hooks/use-center-model';
import { Object3dContext } from '../context/object-3d-context';
import { useHotspotListener } from '../hooks/use-hotspot-listener';
import { useHotspotsRenderer } from '../hooks/use-hotspots-renderer';

export const Object3dEditor = () => {
  const { modelUrl } = useContext(Object3dContext);
  const canvasRef = useRef<HTMLCanvasElement>();
  const model = useModel(modelUrl);
  const { scene, camera, renderer, controls, mixer, clock } = useScene(canvasRef, model);

  useCenterModel(model, camera, controls, scene);
  useHotspotListener(canvasRef, camera, scene);

  useHotspotsRenderer(canvasRef, camera);

  useEffect(() => {
    function animate() {
      requestAnimationFrame(animate);
      controls.current.update();
      renderer.current.render(scene.current, camera.current);

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
  }, [camera, clock, controls, mixer, renderer, scene]);

  return (
    <div>
      <div className="hotspot">2</div>
      <canvas ref={canvasRef} />
    </div>
  );
};

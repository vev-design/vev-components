import React, { useContext, useEffect, useMemo } from 'react';
import { PerspectiveCamera, Raycaster, Scene, Vector2 } from 'three';
import { Object3dContext } from '../context/object-3d-context';

export function useHotspotListener(
  canvasRef: React.MutableRefObject<HTMLCanvasElement | undefined>,
  camera: React.MutableRefObject<PerspectiveCamera>,
  scene: React.MutableRefObject<Scene>,
) {
  const { height, width, addHotSpot } = useContext(Object3dContext);

  const raycaster = useMemo(() => {
    return new Raycaster();
  }, []);

  const mouse = useMemo(() => new Vector2(), []);

  useEffect(() => {
    function onMouseUp(event: PointerEvent) {
      event.preventDefault();
      const canvasBounds = canvasRef.current.getBoundingClientRect();

      mouse.x = ((event.clientX - canvasBounds.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - canvasBounds.top) / height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera.current);
      const intersects = raycaster.intersectObjects(scene.current.children, true);

      if (intersects.length) {
        addHotSpot(intersects[0].point);
      }
    }

    if (canvasRef.current) {
      canvasRef.current.addEventListener('pointerup', onMouseUp);
    }
    return () => {
      if (canvasRef.current) canvasRef.current.removeEventListener('pointerup', onMouseUp);
    };
  }, [addHotSpot, camera, canvasRef, height, mouse, raycaster, scene, width]);
}

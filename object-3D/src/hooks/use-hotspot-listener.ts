import { useContext, useEffect } from 'react';
import { PerspectiveCamera, Raycaster, Scene, Vector2 } from 'three';
import { Object3dContext } from '../context/object-3d-context';
// @ts-expect-error - no types
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const DELTA = 5;

export function useHotspotListener(
  css2DRef: CSS2DObject | undefined,
  camera: PerspectiveCamera | undefined,
  scene: Scene | undefined,
) {
  const { height, width, addHotSpot, editMode } = useContext(Object3dContext);
  const sceneChildren = scene && scene.children;
  useEffect(() => {
    if (!addHotSpot || !camera || !css2DRef || !scene.children) {
      return;
    }

    const raycaster = new Raycaster();
    const mouse = new Vector2();
    let mouseMoveDelta = [0, 0];

    function onMouseDown(event: PointerEvent) {
      mouseMoveDelta = [event.pageX, event.pageY];
    }

    function onMouseUp(event: PointerEvent) {
      event.preventDefault();

      const diffX = Math.abs(event.pageX - mouseMoveDelta[0]);
      const diffY = Math.abs(event.pageY - mouseMoveDelta[1]);

      if (diffX < DELTA && diffY < DELTA) {
        const canvasBounds = css2DRef.domElement.getBoundingClientRect();

        mouse.x = ((event.clientX - canvasBounds.left) / width) * 2 - 1;
        mouse.y = -((event.clientY - canvasBounds.top) / height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(sceneChildren, true);
        if (intersects.length) {
          let modelIndex = 0;
          let modelIntersection = intersects[modelIndex];
          while (modelIntersection.object.name === 'intersection_sphere') {
            modelIndex++;
            modelIntersection = intersects[modelIndex];
          }
          addHotSpot(modelIntersection.point);
        }
      }
    }

    if (editMode && css2DRef) {
      css2DRef.domElement.addEventListener('mousedown', onMouseDown);
      css2DRef.domElement.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      if (editMode && css2DRef) {
        if (css2DRef) css2DRef.domElement.removeEventListener('mousedown', onMouseDown);
        if (css2DRef) css2DRef.domElement.removeEventListener('mouseUp', onMouseUp);
      }
    };
  }, [addHotSpot, camera, css2DRef, editMode, height, width, sceneChildren]);
}

import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera, Raycaster, Scene, Vector2 } from 'three';
import { Object3dContext } from '../context/object-3d-context';
// @ts-expect-error - no types
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const DELTA = 5;

export function useHotspotListener(
  css2DRef: React.MutableRefObject<CSS2DObject | undefined>,
  camera: React.MutableRefObject<PerspectiveCamera>,
  scene: React.MutableRefObject<Scene>,
) {
  const { height, width, addHotSpot } = useContext(Object3dContext);
  const mouseMoveDelta = useRef([0, 0]);

  const raycaster = useMemo(() => {
    return new Raycaster();
  }, []);
  const mouse = useMemo(() => new Vector2(), []);

  useEffect(() => {
    function onMouseDown(event: PointerEvent) {
      mouseMoveDelta.current = [event.pageX, event.pageY];
    }

    function onMouseUp(event: PointerEvent) {
      event.preventDefault();

      const diffX = Math.abs(event.pageX - mouseMoveDelta.current[0]);
      const diffY = Math.abs(event.pageY - mouseMoveDelta.current[1]);

      if (diffX < DELTA && diffY < DELTA) {
        const canvasBounds = css2DRef.current.domElement.getBoundingClientRect();

        mouse.x = ((event.clientX - canvasBounds.left) / width) * 2 - 1;
        mouse.y = -((event.clientY - canvasBounds.top) / height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera.current);
        const intersects = raycaster.intersectObjects(scene.current.children, true);

        if (intersects.length) {
          console.log('addHotSpot');
          addHotSpot(intersects[0].point);
        }
      }
    }

    if (css2DRef.current) {
      css2DRef.current.domElement.addEventListener('mousedown', onMouseDown);
      css2DRef.current.domElement.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      if (css2DRef.current)
        css2DRef.current.domElement.removeEventListener('mousedown', onMouseDown);
      if (css2DRef.current) css2DRef.current.domElement.removeEventListener('mouseUp', onMouseUp);
    };
  }, []);
}

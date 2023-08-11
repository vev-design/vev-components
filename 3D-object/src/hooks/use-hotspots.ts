import React, { useContext, useEffect, useRef } from 'react';
import { Scene, Vector3 } from 'three';
// @ts-expect-error - no types
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Object3dContext } from '../context/object-3d-context';

interface CanvasHotspot {
  element: HTMLDivElement;
  sceneObject: CSS2DObject;
  position: Vector3;
}

export function useHotspots(scene: React.MutableRefObject<Scene>) {
  const { hotspots } = useContext(Object3dContext);
  const hotspotMap = useRef<CanvasHotspot[]>([]);

  useEffect(() => {
    hotspots.forEach((hotspot) => {
      const canvasHotspot = hotspotMap.current.find((spot) => {
        spot.position.equals(hotspot);
      });
      if (!canvasHotspot) {
        const element = document.createElement('div');
        element.innerText = `X`;
        const sceneObject = new CSS2DObject(element);
        sceneObject.position.set(hotspot.x, hotspot.y, hotspot.z);
        scene.current.add(sceneObject);
        sceneObject.layers.set(1);

        hotspotMap.current.push({ element, sceneObject, position: hotspot });
      }
    });
  }, [hotspots]);
}

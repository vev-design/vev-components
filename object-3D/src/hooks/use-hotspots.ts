import { useContext, useEffect, useRef } from 'react';
import { Scene } from 'three';
// @ts-expect-error - no types
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Object3dContext } from '../context/object-3d-context';
import styles from '../object-3d.module.css';
import { InternalHotspot } from '../object-3d';

export interface CanvasHotspot {
  element: HTMLDivElement;
  sceneObject: CSS2DObject;
  hotspot: InternalHotspot;
}

export function useHotspots(scene: Scene | undefined) {
  const { hotspots } = useContext(Object3dContext);
  const hotspotMap = useRef<CanvasHotspot[]>([]);

  useEffect(() => {
    if (scene) {
      hotspotMap.current.forEach((hotspot) => {
        scene.remove(hotspot.sceneObject);
        hotspot.element.parentElement.remove();
      });
      hotspotMap.current = [];

      hotspots.forEach((storageHotspot) => {
        const outer = document.createElement('div');
        const innerElem = document.createElement('div');

        outer.appendChild(innerElem);
        innerElem.innerText = `${storageHotspot.index}`;
        innerElem.className = `${styles.hotspot} vev-object-3d-hotspot`;
        const sceneObject = new CSS2DObject(outer);
        sceneObject.position.set(
          storageHotspot.position.x,
          storageHotspot.position.y,
          storageHotspot.position.z,
        );
        scene.add(sceneObject);
        sceneObject.layers.set(1);

        innerElem.addEventListener('pointerdown', () => {
          console.log('Clicked!');
        });

        hotspotMap.current.push({ element: innerElem, sceneObject, hotspot: storageHotspot });
      });
    }
  }, [hotspots, scene]);

  return hotspotMap;
}

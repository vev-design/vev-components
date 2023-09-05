import {useContext, useEffect, useRef} from 'react';
import {Camera, Scene, Vector3} from 'three';
// @ts-expect-error - no types
import {CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {Object3dContext} from '../context/object-3d-context';
import styles from '../object-3d.module.css';
import {InternalHotspot} from '../types';
import TWEEN from '@tweenjs/tween.js';

export interface CanvasHotspot {
  element: HTMLDivElement;
  sceneObject: CSS2DObject;
  hotspot: InternalHotspot;
}

export function useHotspots(scene: Scene | undefined, camera: Camera | undefined, controls: any) {
  const { hotspots, editMode, hotspotClicked } = useContext(Object3dContext);
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

        if (!editMode) {
          innerElem.addEventListener('pointerdown', () => {
            const from = camera.position.clone();
            const camDistance = camera.position.length();
            const target = new Vector3(
              storageHotspot.position.x,
              storageHotspot.position.y,
              storageHotspot.position.z,
            )
              .normalize()
              .multiplyScalar(camDistance);

            new TWEEN.Tween(from)
              .to(target, 400)
              .onUpdate((newPosition) => {
                camera.position.copy(newPosition);
                controls.update(); // update of controls is here now
              })
              .start();

            if(hotspotClicked) hotspotClicked(storageHotspot.index);
          });
        }

        hotspotMap.current.push({ element: innerElem, sceneObject, hotspot: storageHotspot });
      });
    }
  }, [hotspots, scene]);

  return hotspotMap;
}

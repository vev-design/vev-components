import { useContext, useEffect, useRef } from 'react';
import { Camera, Mesh, MeshBasicMaterial, Scene, SphereGeometry, Spherical, Vector3 } from 'three';
// @ts-expect-error - no types
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Object3dContext } from '../context/object-3d-context';
import styles from '../object-3d.module.css';
import { InternalHotspot } from '../types';
import TWEEN from '@tweenjs/tween.js';
import { animateCameraSpherical } from '../util/animate-camera-spherical';

export interface CanvasHotspot {
  element: HTMLDivElement;
  sceneObject: CSS2DObject;
  intersectionSphere: Mesh;
  hotspot: InternalHotspot;
}

function zoomHotspot(camera: Camera, storageHotspot: InternalHotspot, controls: any) {
  const from = camera.position.clone();
  const to = new Vector3(
    storageHotspot.position.x,
    storageHotspot.position.y,
    storageHotspot.position.z,
  );
  animateCameraSpherical(from, to, camera, controls);
}

export function useHotspots(scene: Scene | undefined, camera: Camera | undefined, controls: any) {
  const { hotspots, editMode, hotspotClicked, eventCallbacks } = useContext(Object3dContext);
  const hotspotMap = useRef<CanvasHotspot[]>([]);

  useEffect(() => {
    if (eventCallbacks) {
      eventCallbacks.click_hotspot((index: number) => {
        const internalHotspot = hotspots.find((hotspot) => {
          return hotspot.index === index;
        });
        if (internalHotspot) {
          zoomHotspot(camera, internalHotspot, controls);
          hotspotClicked(index);
        }
      });
    }
  }, [eventCallbacks]);

  useEffect(() => {
    if (scene) {
      hotspotMap.current.forEach((hotspot) => {
        scene.remove(hotspot.sceneObject);
        scene.remove(hotspot.intersectionSphere);
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
            zoomHotspot(camera, storageHotspot, controls);
            if (hotspotClicked) hotspotClicked(storageHotspot.index);
          });
        }

        // Add a transparent sphere used for determining if the hotspot is visible or not
        const geometry = new SphereGeometry(0.1, 32, 16);
        const material = new MeshBasicMaterial({
          color: 0xffff00,
          opacity: 0,
          transparent: true,
        });
        const sphere = new Mesh(geometry, material);
        sphere.position.set(
          storageHotspot.position.x,
          storageHotspot.position.y,
          storageHotspot.position.z,
        );
        sphere.name = 'intersection_sphere';
        scene.add(sphere);

        hotspotMap.current.push({
          intersectionSphere: sphere,
          element: innerElem,
          sceneObject,
          hotspot: storageHotspot,
        });
      });
    }
  }, [hotspots, scene]);

  return hotspotMap;
}

import { useContext, useEffect, useRef } from 'react';
import { Camera, Group, Vector3 } from 'three';
// @ts-expect-error - no types
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Group as TweenGroup } from '@tweenjs/tween.js';
import { Object3dContext } from '../context/object-3d-context';
import styles from '../object-3d.module.css';
import { InternalHotspot } from '../types';
import { animateCamera } from '../util/animate-camera';

export interface CanvasHotspot {
  element: HTMLButtonElement;
  sceneObject: CSS2DObject;
  hotspot: InternalHotspot;
  dimmed: boolean;
}

// With "Zoom to hotspot", the camera stops at this multiple of the hotspot's distance from the center
const HOTSPOT_ZOOM_DISTANCE = 1.6;

export function useHotspots(
  pivot: Group | undefined,
  camera: Camera | undefined,
  controls: any,
  tweens: TweenGroup | undefined,
  invalidate: () => void,
) {
  const { hotspots, editMode, hotspotClicked, eventCallbacks, hotspotZoom } =
    useContext(Object3dContext);
  const hotspotMap = useRef<CanvasHotspot[]>([]);

  // The DOM listeners live longer than one render. They read the current values from here.
  const latest = useRef({ camera, controls, tweens, hotspotZoom, hotspotClicked });
  latest.current = { camera, controls, tweens, hotspotZoom, hotspotClicked };

  function focusHotspot(canvasHotspot: CanvasHotspot) {
    const { camera, controls, tweens, hotspotZoom } = latest.current;
    if (!camera || !controls || !tweens) return;

    const target: Vector3 = controls.target.clone();
    const direction = canvasHotspot.sceneObject.getWorldPosition(new Vector3()).sub(target);
    const hotspotDistance = direction.length();
    if (hotspotDistance === 0) return;

    const currentDistance = camera.position.distanceTo(target);
    const distance = hotspotZoom
      ? Math.min(
          currentDistance,
          Math.max(hotspotDistance * HOTSPOT_ZOOM_DISTANCE, controls.minDistance),
        )
      : currentDistance;

    const position = direction.normalize().multiplyScalar(distance).add(target);
    animateCamera(tweens, camera, controls, position, target);
  }

  function selectHotspot(canvasHotspot: CanvasHotspot) {
    focusHotspot(canvasHotspot);
    const { hotspotClicked } = latest.current;
    if (hotspotClicked) hotspotClicked(canvasHotspot.hotspot.index);
  }

  // Runs on every render, so the callback always sees the current hotspots
  useEffect(() => {
    if (!eventCallbacks) return;
    eventCallbacks.click_hotspot((index: number) => {
      const canvasHotspot = hotspotMap.current.find((item) => item.hotspot.index === index);
      if (canvasHotspot) selectHotspot(canvasHotspot);
    });
  });

  useEffect(() => {
    if (!pivot) return;

    const created = hotspots.map((storageHotspot) => {
      const outer = document.createElement('div');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${storageHotspot.index}`;
      button.className = `${styles.hotspot} vev-object-3d-hotspot`;
      button.setAttribute('aria-label', `Hotspot ${storageHotspot.index}`);
      outer.appendChild(button);

      const sceneObject = new CSS2DObject(outer);
      sceneObject.position.copy(storageHotspot.position);
      sceneObject.layers.set(1);
      pivot.add(sceneObject);

      const canvasHotspot: CanvasHotspot = {
        element: button,
        sceneObject,
        hotspot: storageHotspot,
        dimmed: false,
      };

      if (editMode) {
        button.tabIndex = -1;
      } else {
        // Keep OrbitControls from capturing the pointer, which would move the click off the button
        button.addEventListener('pointerdown', (event) => event.stopPropagation());
        button.addEventListener('click', () => selectHotspot(canvasHotspot));
      }

      return canvasHotspot;
    });

    hotspotMap.current = created;
    invalidate();

    return () => {
      // CSS2DObject removes its element from the DOM when it leaves the scene
      created.forEach((canvasHotspot) => pivot.remove(canvasHotspot.sceneObject));
      hotspotMap.current = [];
      invalidate();
    };
  }, [hotspots, pivot, editMode]);

  return hotspotMap;
}

const forward = new Vector3();
const position = new Vector3();

/**
 * Dims the hotspots on the far side of the model.
 * This is an angle test against the camera direction. It does not detect occlusion by geometry.
 */
export function updateHotspotVisibility(hotspots: CanvasHotspot[], camera: Camera) {
  camera.getWorldDirection(forward);
  hotspots.forEach((canvasHotspot) => {
    canvasHotspot.sceneObject.getWorldPosition(position);
    const dimmed = position.dot(forward) > 0;
    if (dimmed !== canvasHotspot.dimmed) {
      canvasHotspot.dimmed = dimmed;
      canvasHotspot.element.style.opacity = dimmed ? '0.1' : '1';
    }
  });
}

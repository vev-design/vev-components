import { MutableRefObject, useContext, useEffect, useRef } from 'react';
import { Camera, Group, Object3D, Raycaster, Vector3 } from 'three';
// @ts-expect-error - no types
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Group as TweenGroup } from '@tweenjs/tween.js';
import { Object3dContext } from '../context/object-3d-context';
import styles from '../object-3d.module.css';
import { HotspotAnchor, InternalHotspot } from '../types';
import { animateCamera } from '../util/animate-camera';
import { resolveNodePath } from '../util/hotspot-anchor';
import { OCCLUSION_LAYER } from '../util/bounds-tree';

export interface CanvasHotspot {
  element: HTMLButtonElement;
  sceneObject: CSS2DObject;
  hotspot: InternalHotspot;
  dimmed: boolean;
  /** Surface normal, local to `sceneObject.parent` */
  normal?: Vector3;
}

// With "Zoom to hotspot", the camera stops at this multiple of the hotspot's distance from the center
const HOTSPOT_ZOOM_DISTANCE = 1.6;

export function useHotspots(
  pivot: Group | undefined,
  camera: Camera | undefined,
  controls: any,
  tweens: TweenGroup | undefined,
  model: Object3D | null,
  legacyAnchors: MutableRefObject<Map<number, HotspotAnchor>>,
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
      sceneObject.layers.set(1);

      // Attach to the anchor node, so the hotspot follows that part's animation
      const anchor = storageHotspot.anchor ?? legacyAnchors.current.get(storageHotspot.index);
      const node = anchor && model ? resolveNodePath(model, anchor.path) : undefined;
      const canvasHotspot: CanvasHotspot = {
        element: button,
        sceneObject,
        hotspot: storageHotspot,
        dimmed: false,
      };
      if (anchor && node) {
        sceneObject.position.set(anchor.position.x, anchor.position.y, anchor.position.z);
        canvasHotspot.normal = new Vector3(anchor.normal.x, anchor.normal.y, anchor.normal.z);
        node.add(sceneObject);
      } else {
        sceneObject.position.copy(storageHotspot.position);
        pivot.add(sceneObject);
      }

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
      created.forEach((canvasHotspot) => canvasHotspot.sceneObject.removeFromParent());
      hotspotMap.current = [];
      invalidate();
    };
  }, [hotspots, pivot, model, editMode]);

  return hotspotMap;
}

const forward = new Vector3();
const cameraPosition = new Vector3();
const position = new Vector3();
const toCamera = new Vector3();
const worldNormal = new Vector3();
const raycaster = new Raycaster();
raycaster.layers.set(OCCLUSION_LAYER);
(raycaster as any).firstHitOnly = true;
const hits: any[] = [];

/**
 * Dims the hotspots the camera cannot see. Two tests, cheapest first:
 *
 * 1. Back-face: the hotspot's surface normal points away from the camera.
 * 2. Occlusion: a ray from the camera hits the model before it reaches the hotspot. Uses the
 *    model's BVH (`occluder`), so it costs microseconds. Skinned and morphing meshes are not
 *    in the BVH, so they never occlude; test 1 still covers their hotspots.
 *
 * Hotspots without a normal, before the BVH is ready, fall back to the old angle test against
 * the line from the model center.
 */
export function updateHotspotVisibility(
  hotspots: CanvasHotspot[],
  camera: Camera,
  occluder: Object3D | null,
) {
  camera.getWorldPosition(cameraPosition);
  camera.getWorldDirection(forward);

  hotspots.forEach((canvasHotspot) => {
    const { sceneObject, normal } = canvasHotspot;
    sceneObject.getWorldPosition(position);
    toCamera.subVectors(cameraPosition, position);

    let dimmed = false;
    if (normal && sceneObject.parent) {
      worldNormal.copy(normal).transformDirection(sceneObject.parent.matrixWorld);
      dimmed = worldNormal.dot(toCamera) < 0;
    } else if (!occluder) {
      dimmed = position.dot(forward) > 0;
    }

    if (!dimmed && occluder) {
      const distance = toCamera.length();
      raycaster.set(cameraPosition, toCamera.negate().normalize());
      // Stop short of the hotspot, so the surface it sits on does not count
      raycaster.far = distance * 0.99;
      hits.length = 0;
      raycaster.intersectObject(occluder, true, hits);
      dimmed = hits.length > 0;
    }

    if (dimmed !== canvasHotspot.dimmed) {
      canvasHotspot.dimmed = dimmed;
      canvasHotspot.element.style.opacity = dimmed ? '0.1' : '1';
    }
  });
}

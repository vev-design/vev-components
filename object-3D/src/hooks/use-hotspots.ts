import { MutableRefObject, useContext, useEffect, useRef, useState } from 'react';
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
  element: HTMLElement;
  sceneObject: CSS2DObject;
  hotspot: InternalHotspot;
  dimmed: boolean;
  /** Surface normal, local to `sceneObject.parent` */
  normal?: Vector3;
}

// With "Turn and zoom in", the camera stops at this multiple of the hotspot's distance from the center
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
  const {
    hotspots,
    editMode,
    hotspotClicked,
    eventCallbacks,
    hotspotFocus = 'turn',
    customHotspot,
    customHotspotNumber = 'none',
  } = useContext(Object3dContext);
  const hotspotMap = useRef<CanvasHotspot[]>([]);
  // The viewer renders the custom hotspot main component into these elements with portals
  const [portalTargets, setPortalTargets] = useState<HTMLElement[]>([]);
  // The editor modals render outside the page, where main components cannot render
  const custom = !!customHotspot && !editMode;

  // The DOM listeners live longer than one render. They read the current values from here.
  const latest = useRef({ camera, controls, tweens, hotspotFocus, hotspotClicked });
  latest.current = { camera, controls, tweens, hotspotFocus, hotspotClicked };

  function focusHotspot(canvasHotspot: CanvasHotspot, zoom: boolean) {
    const { camera, controls, tweens } = latest.current;
    if (!camera || !controls || !tweens) return;

    const target: Vector3 = controls.target.clone();
    const toHotspot = canvasHotspot.sceneObject.getWorldPosition(new Vector3()).sub(target);
    const hotspotDistance = toHotspot.length();
    if (hotspotDistance === 0) return;

    // Look at the surface straight on. Without a normal, use the line from the center: on a tall
    // model that can put the camera far above or below it.
    const { normal, sceneObject } = canvasHotspot;
    const direction =
      normal && sceneObject.parent
        ? normal.clone().transformDirection(sceneObject.parent.matrixWorld)
        : toHotspot.normalize();

    const currentDistance = camera.position.distanceTo(target);
    const distance = zoom
      ? Math.min(
          currentDistance,
          Math.max(hotspotDistance * HOTSPOT_ZOOM_DISTANCE, controls.minDistance),
        )
      : currentDistance;

    const position = direction.multiplyScalar(distance).add(target);
    animateCamera(tweens, camera, controls, position, target);
  }

  /** `fromInteraction`: the Focus hotspot interaction asks for a camera move even with 'none' */
  function selectHotspot(canvasHotspot: CanvasHotspot, fromInteraction = false) {
    const { hotspotFocus } = latest.current;
    if (hotspotFocus !== 'none' || fromInteraction) {
      focusHotspot(canvasHotspot, hotspotFocus === 'zoom');
    }
    const { hotspotClicked } = latest.current;
    if (hotspotClicked) hotspotClicked(canvasHotspot.hotspot.index);
  }

  // Runs on every render, so the callback always sees the current hotspots
  useEffect(() => {
    if (!eventCallbacks) return;
    eventCallbacks.click_hotspot((index: number) => {
      const canvasHotspot = hotspotMap.current.find((item) => item.hotspot.index === index);
      if (canvasHotspot) selectHotspot(canvasHotspot, true);
    });
  });

  useEffect(() => {
    if (!pivot) return;

    const created = hotspots.map((storageHotspot) => {
      const outer = document.createElement('div');
      // A main component can contain links and buttons, which must not be inside a <button>
      const button = document.createElement(custom ? 'div' : 'button');
      if (custom) {
        button.setAttribute('role', 'button');
        button.className = `${styles.customHotspot} vev-object-3d-hotspot`;
        if (customHotspotNumber !== 'none') {
          // The portal adds the main component after this element. React leaves it alone.
          const number = document.createElement('span');
          number.textContent = `${storageHotspot.index}`;
          number.setAttribute('aria-hidden', 'true');
          const position =
            customHotspotNumber === 'corner' ? styles.numberCorner : styles.numberCenter;
          number.className = `${styles.hotspotNumber} ${position}`;
          button.appendChild(number);
        }
      } else {
        (button as HTMLButtonElement).type = 'button';
        button.textContent = `${storageHotspot.index}`;
        button.className = `${styles.hotspot} vev-object-3d-hotspot`;
      }
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
        if (custom) {
          button.tabIndex = 0;
          button.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.target !== button || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            selectHotspot(canvasHotspot);
          });
        }
      }

      return canvasHotspot;
    });

    hotspotMap.current = created;
    setPortalTargets(custom ? created.map((canvasHotspot) => canvasHotspot.element) : []);
    invalidate();

    return () => {
      // CSS2DObject removes its element from the DOM when it leaves the scene
      created.forEach((canvasHotspot) => canvasHotspot.sceneObject.removeFromParent());
      hotspotMap.current = [];
      setPortalTargets([]);
      invalidate();
    };
  }, [hotspots, pivot, model, editMode, custom, customHotspotNumber]);

  return { hotspotMap, portalTargets };
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

import { useContext, useEffect, useRef } from 'react';
import { Group, Object3D, PerspectiveCamera, Raycaster, Vector2 } from 'three';
import { Object3dContext } from '../context/object-3d-context';
import { anchorFromHit } from '../util/hotspot-anchor';
// @ts-expect-error - no types
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

// A mouse move larger than this is a drag, not a click
const DELTA = 5;

/**
 * In the hotspot editor: a click on the model adds a hotspot at that point.
 */
export function useHotspotListener(
  labelRenderer: CSS2DRenderer | undefined,
  camera: PerspectiveCamera | undefined,
  pivot: Group | undefined,
  model: Object3D | null,
) {
  const { addHotSpot, editMode } = useContext(Object3dContext);
  const addHotSpotRef = useRef(addHotSpot);
  addHotSpotRef.current = addHotSpot;

  useEffect(() => {
    if (!editMode || !labelRenderer || !camera || !pivot) return;

    const element: HTMLElement = labelRenderer.domElement;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let mouseDown = [0, 0];
    let downOnHotspot = false;

    // Capture phase: OrbitControls captures the pointer on pointerdown, so later events
    // no longer target the hotspot under the cursor
    function onPointerDown(event: PointerEvent) {
      mouseDown = [event.clientX, event.clientY];
      downOnHotspot = !!(event.target as HTMLElement).closest('.vev-object-3d-hotspot');
    }

    function onMouseUp(event: MouseEvent) {
      if (!addHotSpotRef.current || downOnHotspot) return;

      const diffX = Math.abs(event.clientX - mouseDown[0]);
      const diffY = Math.abs(event.clientY - mouseDown[1]);
      if (diffX >= DELTA || diffY >= DELTA) return;

      const bounds = element.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const [hit] = raycaster.intersectObject(pivot, true);
      if (!hit) return;
      const anchor = model ? anchorFromHit(hit, model, raycaster.ray.direction) : undefined;
      addHotSpotRef.current(pivot.worldToLocal(hit.point.clone()), anchor);
    }

    element.addEventListener('pointerdown', onPointerDown, true);
    element.addEventListener('mouseup', onMouseUp);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown, true);
      element.removeEventListener('mouseup', onMouseUp);
    };
  }, [editMode, labelRenderer, camera, pivot, model]);
}

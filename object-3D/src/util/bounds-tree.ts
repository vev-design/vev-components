import { Mesh, Object3D } from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

/** Meshes with a bounds tree are on this layer. Occlusion rays test only this layer. */
export const OCCLUSION_LAYER = 2;

// Build in slices, so a model with many meshes does not block a frame
const SLICE_MS = 8;

const schedule = (callback: () => void) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(callback, { timeout: 500 })
    : window.setTimeout(callback, 16);

/**
 * Builds a BVH for every static mesh under `root`, so raycasts against it take microseconds.
 *
 * Skinned meshes and meshes with morph targets are skipped: a BVH fits only the rest shape,
 * and those meshes change shape when they animate. Rigidly animated meshes are fine, because
 * the raycast moves into each mesh's local space.
 *
 * Returns a function that cancels the remaining work.
 */
export function buildBoundsTrees(root: Object3D, onDone: () => void) {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as Mesh & { isSkinnedMesh?: boolean; isInstancedMesh?: boolean };
    if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh) return;
    if (!mesh.geometry.getAttribute('position') || mesh.geometry.morphAttributes.position) return;
    meshes.push(mesh);
  });

  let next = 0;
  let cancelled = false;

  const step = () => {
    if (cancelled) return;
    const start = performance.now();
    while (next < meshes.length && performance.now() - start < SLICE_MS) {
      const mesh = meshes[next++];
      const geometry = mesh.geometry as any;
      // `indirect` leaves the geometry's index untouched, so rendering is not affected
      if (!geometry.boundsTree)
        geometry.boundsTree = new MeshBVH(geometry, { indirect: true } as any);
      mesh.raycast = acceleratedRaycast;
      mesh.layers.enable(OCCLUSION_LAYER);
    }
    if (next < meshes.length) schedule(step);
    else onDone();
  };
  schedule(step);

  return () => {
    cancelled = true;
  };
}

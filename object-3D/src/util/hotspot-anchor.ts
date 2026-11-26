import {
  Box3,
  BufferGeometry,
  Intersection,
  Matrix4,
  Object3D,
  Raycaster,
  SkinnedMesh,
  Sphere,
  Vector3,
} from 'three';
import { HotspotAnchor, InternalHotspot } from '../types';

function getNodePath(root: Object3D, node: Object3D): number[] | undefined {
  const path: number[] = [];
  let current = node;
  while (current !== root) {
    const parent = current.parent;
    if (!parent) return undefined;
    path.unshift(parent.children.indexOf(current));
    current = parent;
  }
  return path;
}

export function resolveNodePath(root: Object3D, path: number[]): Object3D | undefined {
  let node: Object3D | undefined = root;
  for (const index of path) {
    node = node.children[index];
    if (!node) return undefined;
  }
  return node;
}

/** The bone with the most skin weight on the hit triangle */
function dominantBone(mesh: SkinnedMesh, hit: Intersection): Object3D | undefined {
  const geometry = mesh.geometry as BufferGeometry;
  const skinIndex = geometry.getAttribute('skinIndex');
  const skinWeight = geometry.getAttribute('skinWeight');
  if (!skinIndex || !skinWeight || !hit.face || !mesh.skeleton) return undefined;

  // BufferAttribute and InterleavedBufferAttribute both have getX..getW, not getComponent
  const read = (attribute: typeof skinIndex, vertex: number, component: number) =>
    [attribute.getX, attribute.getY, attribute.getZ, attribute.getW][component].call(
      attribute,
      vertex,
    );

  const weights = new Map<number, number>();
  for (const vertex of [hit.face.a, hit.face.b, hit.face.c]) {
    for (let component = 0; component < Math.min(skinIndex.itemSize, 4); component++) {
      const bone = read(skinIndex, vertex, component);
      weights.set(bone, (weights.get(bone) ?? 0) + read(skinWeight, vertex, component));
    }
  }

  let best: number | undefined;
  weights.forEach((weight, bone) => {
    if (best === undefined || weight > (weights.get(best) ?? 0)) best = bone;
  });
  return best === undefined ? undefined : mesh.skeleton.bones[best];
}

/**
 * Builds the anchor for a raycast hit on the model. `rayDirection` orients the normal toward
 * the side the ray came from, which matters for double-sided surfaces.
 */
export function anchorFromHit(
  hit: Intersection,
  root: Object3D,
  rayDirection: Vector3,
): HotspotAnchor | undefined {
  const mesh = hit.object as SkinnedMesh;
  const node = (mesh.isSkinnedMesh && dominantBone(mesh, hit)) || hit.object;
  const path = getNodePath(root, node);
  if (!path || !hit.face) return undefined;

  node.updateWorldMatrix(true, false);
  const toLocal = new Matrix4().copy(node.matrixWorld).invert();
  const position = hit.point.clone().applyMatrix4(toLocal);

  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  if (normal.dot(rayDirection) > 0) normal.negate();
  normal.transformDirection(toLocal);

  return {
    path,
    position: { x: position.x, y: position.y, z: position.z },
    normal: { x: normal.x, y: normal.y, z: normal.z },
  };
}

/**
 * Anchors hotspots that were saved before anchors existed. Each hotspot gets the surface point
 * closest to it along the line from the model center. Must run in the pose the hotspots were
 * placed in, so before any animation advances. Brute-force raycasts, so run it only when needed.
 * `root` must not have a parent yet: hotspot positions are in pivot space.
 */
export function anchorLegacyHotspots(root: Object3D, hotspots: InternalHotspot[]) {
  const anchors = new Map<number, HotspotAnchor>();
  const legacy = hotspots.filter((hotspot) => !hotspot.anchor);
  if (!legacy.length) return anchors;

  // updateMatrixWorld, not updateWorldMatrix: only the former refreshes SkinnedMesh.bindMatrixInverse,
  // which skinned raycasts need after the model was centered
  root.updateMatrixWorld(true);
  const radius = new Box3().setFromObject(root).getBoundingSphere(new Sphere()).radius;

  const raycaster = new Raycaster();
  const direction = new Vector3();
  legacy.forEach((hotspot) => {
    const point = hotspot.position;
    direction.copy(point);
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    direction.normalize();

    // Start outside the model and cast back toward the center
    const reach = radius * 2;
    raycaster.set(point.clone().addScaledVector(direction, reach), direction.clone().negate());
    raycaster.far = reach * 2;

    let best: Intersection | undefined;
    let bestDistance = Infinity;
    raycaster.intersectObject(root, true).forEach((hit) => {
      const distance = hit.point.distanceTo(point);
      if (distance < bestDistance) {
        best = hit;
        bestDistance = distance;
      }
    });

    // Leave the hotspot unanchored when no surface is close to it
    if (best && bestDistance < radius * 0.05) {
      const anchor = anchorFromHit(best, root, raycaster.ray.direction);
      if (anchor) anchors.set(hotspot.index, anchor);
    }
  });

  return anchors;
}

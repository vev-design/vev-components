import { Material, Mesh, Object3D, Texture } from 'three';

/**
 * Frees the GPU memory held by every geometry, material and texture under `root`.
 */
export function disposeObject(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
      // Drop the raycast index from bounds-tree.ts
      (mesh.geometry as any).boundsTree = undefined;
    }

    const materials: Material[] = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
      ? [mesh.material]
      : [];

    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof Texture) value.dispose();
      });
      material.dispose();
    });
  });
}

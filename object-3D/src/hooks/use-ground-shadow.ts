import { useEffect, useRef } from 'react';
import {
  Box3,
  DirectionalLight,
  Mesh,
  Object3D,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Vector3,
} from 'three';

const SHADOW_MAP_SIZE = 1024;
const SHADOW_SOFTNESS = 6;

/**
 * Adds a soft shadow on an invisible floor under the model.
 * The shadow comes from a light straight above with zero intensity, so it does not change the lighting.
 */
export function useGroundShadow(
  scene: Scene | undefined,
  model: Object3D | null,
  enabled: boolean,
  opacity: number,
  invalidate: () => void,
) {
  const material = useRef<ShadowMaterial | null>(null);

  useEffect(() => {
    if (!scene || !model || !enabled) return;

    model.traverse((object) => {
      if ((object as Mesh).isMesh) object.castShadow = true;
    });

    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const extent = Math.max(size.x, size.z);
    // A flat model still needs some depth between the light and the floor
    const height = Math.max(size.y, extent * 0.1);

    const shadowMaterial = new ShadowMaterial({ opacity });
    const floor = new Mesh(new PlaneGeometry(extent * 4, extent * 4), shadowMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = box.min.y;
    floor.receiveShadow = true;

    const light = new DirectionalLight(0xffffff, 0);
    light.position.set(0, box.min.y + height * 2, 0);
    light.target.position.set(0, box.min.y, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    light.shadow.radius = SHADOW_SOFTNESS;
    light.shadow.bias = -0.0005;
    const shadowCamera = light.shadow.camera;
    shadowCamera.left = -extent;
    shadowCamera.right = extent;
    shadowCamera.top = extent;
    shadowCamera.bottom = -extent;
    shadowCamera.near = 0;
    shadowCamera.far = height * 2.1;
    shadowCamera.updateProjectionMatrix();

    scene.add(floor, light, light.target);
    material.current = shadowMaterial;
    invalidate();

    return () => {
      scene.remove(floor, light, light.target);
      floor.geometry.dispose();
      shadowMaterial.dispose();
      light.dispose();
      material.current = null;
      invalidate();
    };
  }, [scene, model, enabled]);

  useEffect(() => {
    if (!material.current) return;
    material.current.opacity = opacity;
    invalidate();
  }, [opacity]);
}

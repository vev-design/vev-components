import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Box3, MathUtils, PerspectiveCamera, Scene, Vector3 } from 'three';
import { useContext, useEffect } from 'react';
import { Object3dContext } from '../context/object-3d-context';

/**
 * Centers the model in the scene and sets an appropriate position and distance for the camera
 */
export function useCenterModel(
  gltf: GLTF,
  camera: PerspectiveCamera | undefined,
  controls: any | undefined,
  scene: Scene | undefined,
) {
  const { fov } = useContext(Object3dContext);

  useEffect(() => {
    if (gltf && camera) {
      const model = gltf.scene;
      model.updateMatrixWorld();
      const box = new Box3().setFromObject(model);
      const boxSize = box.getSize(new Vector3());
      const boxCenter = box.getCenter(new Vector3());

      controls.reset();

      model.position.x += model.position.x - boxCenter.x;
      model.position.y += model.position.y - boxCenter.y;
      model.position.z += model.position.z - boxCenter.z;

      const halfSizeToFitOnScreen = boxSize.length() * 0.5;
      const halfFovY = MathUtils.degToRad(fov * 0.5);
      const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

      // Compute a unit vector that points in the direction the camera is now
      // in the xz plane from the center of the box
      const direction = new Vector3()
        .subVectors(camera.position, boxCenter)
        .multiply(new Vector3(1, 0, 1))
        .normalize();

      // Move the camera to a position distance units way from the center
      // in whatever direction the camera was from the center already
      camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

      // Pick some near and far values for the frustum that will contain the box.
      camera.near = boxSize.length() / 100;
      camera.far = boxSize.length() * 100;
      camera.rotation.set(0, 0, 0);

      const objectSize = Math.max(boxSize.x, boxSize.y);
      camera.position.set(0, 0, Math.abs(objectSize / Math.sin(fov / 2)));

      camera.updateProjectionMatrix();

      // point the camera to look at the center of the box
      camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);

      controls.maxDistance = boxSize.length() * 5;
      controls.update();
    }
  }, [camera, controls, fov, gltf, scene]);
}

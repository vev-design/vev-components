import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { MutableRefObject, useContext, useEffect } from 'react';
import { Object3dContext } from '../context/object-3d-context';
import { setCameraPosition } from '../util/set-camera-position';
import { CameraHome } from './use-scene-setup';

// Earlier versions computed the distance as `size / |sin(fov / 2)|` with the fov in degrees. For the
// fixed 45° fov, that gives this factor. Keep it, so published pages keep their framing.
const FRAMING_DISTANCE = 2.053;

/**
 * Sets an appropriate position and distance for the camera, or the saved initial camera.
 * Stores the result in `home`, for the "Reset camera" interaction.
 * The model is already centered on the origin by useSceneModel.
 */
export function useCenterModel(
  gltf: GLTF | undefined,
  camera: PerspectiveCamera | undefined,
  controls: any,
  home: MutableRefObject<CameraHome | null>,
  invalidate: () => void,
) {
  const { savedCameraPosition } = useContext(Object3dContext);

  useEffect(() => {
    if (!gltf || !camera || !controls) return;

    const boxSize = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
    const objectSize = Math.max(boxSize.x, boxSize.y);

    controls.reset();
    controls.target.set(0, 0, 0);
    controls.maxDistance = boxSize.length() * 5;

    // Pick some near and far values for the frustum that will contain the box.
    camera.near = boxSize.length() / 100;
    camera.far = boxSize.length() * 100;
    camera.position.set(0, 0, objectSize * FRAMING_DISTANCE);
    camera.updateProjectionMatrix();

    if (savedCameraPosition) {
      setCameraPosition(camera, savedCameraPosition, controls);
    }

    controls.update();
    home.current = { position: camera.position.clone(), target: controls.target.clone() };
    invalidate();
  }, [camera, controls, gltf, savedCameraPosition]);
}

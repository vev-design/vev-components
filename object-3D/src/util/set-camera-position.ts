import { PerspectiveCamera } from 'three';
import { SavedCameraPosition } from '../types';

export function setCameraPosition(
  camera: PerspectiveCamera,
  savedCameraPosition: SavedCameraPosition,
  controls: any,
) {
  camera.position.x = savedCameraPosition.position.x;
  camera.position.y = savedCameraPosition.position.y;
  camera.position.z = savedCameraPosition.position.z;

  camera.rotation.x = savedCameraPosition.rotation.x;
  camera.rotation.y = savedCameraPosition.rotation.y;
  camera.rotation.z = savedCameraPosition.rotation.z;

  controls.target.x = savedCameraPosition.target.x;
  controls.target.y = savedCameraPosition.target.y;
  controls.target.z = savedCameraPosition.target.z;
}

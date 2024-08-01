import { CanvasHotspot } from '../hooks/use-hotspots';
import { Camera, Group, Raycaster, Vector3 } from 'three';

const raycaster = new Raycaster();
const resultArr = [];

export function isHotspotVisible(hotspot: CanvasHotspot, camera: Camera, scene: Group) {
  const target = hotspot.hotspot;
  const normalVector = new Vector3(target.position.x, target.position.y, target.position.z);
  const camVector = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  if (normalVector.angleTo(camVector) > Math.PI / 2) {
    hotspot.element.style.opacity = '1';
  } else {
    hotspot.element.style.opacity = '0.1';
  }
}

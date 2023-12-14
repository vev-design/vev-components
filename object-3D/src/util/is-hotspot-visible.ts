import { CanvasHotspot } from '../hooks/use-hotspots';
import { Camera, Raycaster, Scene } from 'three';

const raycaster = new Raycaster();
export function isHotspotVisible(hotspot: CanvasHotspot, camera: Camera, scene: Scene) {
  const hotspotPos = hotspot.hotspot.position;
  const direction = hotspotPos.clone().sub(camera.position);

  raycaster.set(camera.position, direction.normalize());

  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects[0].object.name !== 'intersection_sphere') {
    hotspot.element.style.opacity = '0.2';
  } else {
    hotspot.element.style.opacity = '1';
  }
}

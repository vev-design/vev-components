import { CanvasHotspot } from '../hooks/use-hotspots';
import { Camera, Group, Raycaster } from 'three';

const raycaster = new Raycaster();
let resultArr = [];

export async function isHotspotVisible(hotspot: CanvasHotspot, camera: Camera, scene: Group) {
  resultArr = [];
  const hotspotPos = hotspot.hotspot.position;
  const direction = hotspotPos.clone().sub(camera.position);

  raycaster.set(camera.position, direction.normalize());

  let nearestInScene = Number.MAX_VALUE;
  raycaster.intersectObject(scene, true, resultArr);
  for (const intersectionIndex in resultArr) {
    if (resultArr[intersectionIndex].distance < nearestInScene)
      nearestInScene = resultArr[intersectionIndex].distance;
  }
  resultArr = [];
  const intersectSphere = raycaster.intersectObject(hotspot.intersectionSphere, false, resultArr);
  if (intersectSphere[0].distance < nearestInScene) {
    hotspot.element.style.opacity = '1';
  } else {
    hotspot.element.style.opacity = '0.2';
  }
}

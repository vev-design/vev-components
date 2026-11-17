import { Spherical, Vector3 } from 'three';
import type { CameraHome } from '../hooks/use-scene-setup';

/**
 * "Horizontal only" drag: OrbitControls clamps the vertical angle to [min, max], so setting both
 * to the home angle leaves only horizontal rotation. `animateCamera` clamps to the same range.
 */
export function lockPolarAngle(controls: any, home: CameraHome | null, horizontalOnly: boolean) {
  if (horizontalOnly && home) {
    const { phi } = new Spherical().setFromVector3(
      new Vector3().subVectors(home.position, home.target),
    );
    controls.minPolarAngle = phi;
    controls.maxPolarAngle = phi;
  } else {
    unlockPolarAngle(controls);
  }
}

export function unlockPolarAngle(controls: any) {
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
}

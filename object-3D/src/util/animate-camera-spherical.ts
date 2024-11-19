import { Camera, Spherical, Vector3 } from 'three';
import TWEEN from '@tweenjs/tween.js';

export function animateCameraSpherical(from: Vector3, to: Vector3, camera: Camera, controls: any) {
  // Convert the 'from' and 'to' positions to spherical coordinates
  const fromSpherical = new Spherical().setFromVector3(from);
  const toSpherical = new Spherical().setFromVector3(to);

  new TWEEN.Tween({
    radius: fromSpherical.radius,
    phi: fromSpherical.phi,
    theta: fromSpherical.theta,
  })
    .to(
      {
        radius: fromSpherical.radius, // This should remain constant
        phi: toSpherical.phi,
        theta: toSpherical.theta,
      },
      400,
    )
    .onUpdate(({ radius, phi, theta }) => {
      const newPosition = new Vector3().setFromSpherical(new Spherical(radius, phi, theta));
      camera.position.copy(newPosition);
      controls.update();
    })
    .start();
}

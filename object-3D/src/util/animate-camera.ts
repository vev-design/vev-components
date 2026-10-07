import { Camera, MathUtils, Spherical, Vector3 } from 'three';
import { Easing, Group, Tween } from '@tweenjs/tween.js';

const DURATION = 600;

/**
 * Moves the camera to `toPosition` while it looks at `toTarget`.
 * The camera orbits around the target on the way, so it does not pass through the model.
 */
export function animateCamera(
  tweens: Group,
  camera: Camera,
  controls: any,
  toPosition: Vector3,
  toTarget: Vector3,
) {
  tweens.removeAll();

  const fromTarget = controls.target.clone();
  const from = new Spherical().setFromVector3(camera.position.clone().sub(fromTarget));
  const to = new Spherical().setFromVector3(toPosition.clone().sub(toTarget));

  // Take the short way around
  let thetaDelta = to.theta - from.theta;
  if (thetaDelta > Math.PI) thetaDelta -= Math.PI * 2;
  if (thetaDelta < -Math.PI) thetaDelta += Math.PI * 2;

  const offset = new Spherical();
  new Tween({ t: 0 }, tweens)
    .to({ t: 1 }, DURATION)
    .easing(Easing.Cubic.InOut)
    .onUpdate(({ t }) => {
      controls.target.lerpVectors(fromTarget, toTarget, t);
      offset.set(
        MathUtils.lerp(from.radius, to.radius, t),
        MathUtils.lerp(from.phi, to.phi, t),
        from.theta + thetaDelta * t,
      );
      camera.position.setFromSpherical(offset).add(controls.target);
      controls.update();
    })
    .start();
}

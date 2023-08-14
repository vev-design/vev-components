import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-expect-error - no types
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Get all animation names of gltf
 */
export async function getAnimations(url: string): Promise<string[]> {
  return new Promise((resolve) => {
    const animations = [];
    if (!url) {
      resolve(animations);
      return;
    }
    new GLTFLoader().load(url, (gltf: GLTF) => {
      gltf.animations.forEach((anim) => {
        animations.push(anim.name);
      });
      resolve(animations);
    });
  });
}

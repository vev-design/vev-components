import { useEffect, useRef, useState } from 'react';
import {
  EquirectangularReflectionMapping,
  PMREMGenerator,
  Scene,
  Texture,
  WebGLRenderer,
} from 'three';
// @ts-expect-error - no types
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
// @ts-expect-error - no types
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Pass as `url` for a neutral studio light. three.js builds it in code, so nothing is downloaded.
 */
export const STANDARD_ENVIRONMENT = 'standard';

/**
 * Loads the HDRI that lights the model, and optionally shows it as the background.
 * `ready` becomes true after the first HDRI loads or fails, and stays true when the HDRI changes.
 */
export function useEnvironment(
  scene: Scene | undefined,
  renderer: WebGLRenderer | undefined,
  url: string,
  enabled: boolean,
  showBackground: boolean,
  backgroundBlur: number,
  invalidate: () => void,
) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [background, setBackground] = useState<Texture | null>(null);
  const current = useRef<{ environment: Texture; background: Texture } | null>(null);

  useEffect(() => {
    if (!scene || !renderer || !url || !enabled) return;

    let cancelled = false;
    setProgress(0);

    const apply = (environment: Texture, backgroundTexture: Texture) => {
      // Keep the old HDRI until the new one is ready, so the model never renders unlit
      if (current.current) {
        current.current.environment.dispose();
        current.current.background.dispose();
      }
      current.current = { environment, background: backgroundTexture };
      scene.environment = environment;
      setBackground(backgroundTexture);
      setProgress(100);
      setReady(true);
      invalidate();
    };

    if (url === STANDARD_ENVIRONMENT) {
      const pmremGenerator = new PMREMGenerator(renderer);
      const room = new RoomEnvironment(renderer);
      const environment = pmremGenerator.fromScene(room, 0.04).texture;
      room.dispose();
      pmremGenerator.dispose();
      apply(environment, environment);
      return;
    }

    new RGBELoader().load(
      url,
      (texture: Texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }

        const pmremGenerator = new PMREMGenerator(renderer);
        const environment = pmremGenerator.fromEquirectangular(texture).texture;
        pmremGenerator.dispose();
        texture.mapping = EquirectangularReflectionMapping;
        apply(environment, texture);
      },
      (xhr: ProgressEvent) => {
        if (!cancelled && xhr.lengthComputable) setProgress((xhr.loaded / xhr.total) * 100);
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error('Object3D: could not load lighting', error);
        setProgress(100);
        setReady(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [scene, renderer, url, enabled, invalidate]);

  useEffect(() => {
    if (!scene) return;
    scene.background = showBackground ? background : null;
    scene.backgroundBlurriness = backgroundBlur;
    invalidate();
  }, [scene, background, showBackground, backgroundBlur, invalidate]);

  // Free the textures on unmount
  useEffect(() => {
    return () => {
      if (current.current) {
        current.current.environment.dispose();
        current.current.background.dispose();
        current.current = null;
      }
    };
  }, [scene]);

  return { ready, progress };
}

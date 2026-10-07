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

        // Keep the old HDRI until the new one is ready, so the model never renders unlit
        if (current.current) {
          current.current.environment.dispose();
          current.current.background.dispose();
        }
        current.current = { environment, background: texture };
        scene.environment = environment;
        setBackground(texture);
        setProgress(100);
        setReady(true);
        invalidate();
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

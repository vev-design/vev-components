import { useEffect, useRef, useState } from 'react';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-expect-error - no types
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Loads the GLTF model
 */
export function useModel(url: string, setModelLoadingPercentage: (value: number) => void) {
  const loader = useRef(new GLTFLoader());
  const [gltf, setGltf] = useState<GLTF | undefined>();
  useEffect(() => {
    if (url && loader) {
      loader.current.load(
        url,
        (gltf: GLTF) => {
          setGltf(gltf);
        },
        (xhr) => {
          setModelLoadingPercentage((xhr.loaded / xhr.total) * 100);
        },
        (error) => {
          console.log('An error occurred: ', error);
        },
      );
    }
  }, [url, loader]);

  return gltf;
}

import { useEffect, useState } from 'react';
import { WebGLRenderer } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { createGLTFLoader } from '../util/gltf-loader';
import { disposeObject } from '../util/dispose-object';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ModelState {
  gltf?: GLTF;
  status: LoadStatus;
  progress: number;
}

/**
 * Loads the GLTF model once `enabled` is true.
 * The caller owns the returned model and must dispose it when it removes it from the scene.
 */
export function useModel(url: string, renderer: WebGLRenderer | undefined, enabled: boolean) {
  const [state, setState] = useState<ModelState>({ status: 'idle', progress: 0 });

  useEffect(() => {
    if (!url || !renderer || !enabled) return;

    let cancelled = false;
    setState({ status: 'loading', progress: 0 });

    createGLTFLoader(renderer).load(
      url,
      (gltf: GLTF) => {
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }
        setState({ gltf, status: 'loaded', progress: 100 });
      },
      (xhr: ProgressEvent) => {
        if (cancelled || !xhr.lengthComputable) return;
        setState((current) => ({ ...current, progress: (xhr.loaded / xhr.total) * 100 }));
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error('Object3D: could not load model', error);
        setState({ status: 'error', progress: 0 });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [url, renderer, enabled]);

  return state;
}

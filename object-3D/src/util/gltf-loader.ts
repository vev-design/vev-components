import { REVISION, WebGLRenderer } from 'three';
// @ts-expect-error - no types
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// @ts-expect-error - no types
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
// @ts-expect-error - no types
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
// @ts-expect-error - no types
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// The decoder binaries are not bundled. Load them from the CDN copy of the installed three version.
const DECODER_BASE = `https://cdn.jsdelivr.net/npm/three@0.${REVISION}.0/examples/jsm/libs`;

let dracoLoader: DRACOLoader | undefined;
let ktx2Loader: KTX2Loader | undefined;

/**
 * Creates a GLTFLoader that can decode Draco, Meshopt and KTX2 compressed models.
 * The decoders are shared by all instances on the page, so their workers start only once.
 */
export function createGLTFLoader(renderer: WebGLRenderer): GLTFLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader().setDecoderPath(`${DECODER_BASE}/draco/gltf/`);
  }
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader()
      .setTranscoderPath(`${DECODER_BASE}/basis/`)
      .detectSupport(renderer);
  }

  return new GLTFLoader()
    .setDRACOLoader(dracoLoader)
    .setKTX2Loader(ktx2Loader)
    .setMeshoptDecoder(MeshoptDecoder);
}

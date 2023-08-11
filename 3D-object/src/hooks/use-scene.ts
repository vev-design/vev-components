import * as THREE from 'three';
// @ts-expect-error - no types
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// @ts-expect-error - no types
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
// @ts-expect-error - no types
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import React, { useContext, useEffect, useRef } from 'react';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Object3dContext } from '../context/object-3d-context';

const FOV = 45;
const ASPECT = 2; // the canvas default
const NEAR = 0.1;
const FAR = 100;

/**
 * Sets up the scene with camera and controls.
 * Also adds the model when it's loaded
 */
export function useScene(
  canvasRef: React.MutableRefObject<HTMLCanvasElement>,
  labelRef: React.MutableRefObject<HTMLDivElement>,
  model: GLTF,
) {
  const {
    hdri,
    rotate,
    controls: enableControls,
    height,
    width,
    animation,
    zoom,
  } = useContext(Object3dContext);

  const scene = useRef<THREE.Scene>(null);
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const renderer = useRef<THREE.WebGLRenderer>(null);
  const controls = useRef<any>(null);
  const mixer = useRef<THREE.AnimationMixer>(null);
  const clock = useRef<THREE.Clock>(null);
  const currentClip = useRef<THREE.AnimationClip>(null);
  const rootMesh = useRef<THREE.Mesh>(new THREE.Mesh());
  const labelRenderer = useRef<CSS2DRenderer>(null);

  useEffect(() => {
    if (height && width && canvasRef && !scene.current) {
      // Renderer
      renderer.current = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: true,
      });

      renderer.current.setSize(width, height);
      renderer.current.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.current.toneMappingExposure = 1;
      renderer.current.outputColorSpace = 'srgb';
      renderer.current.shadowMap.type = THREE.PCFShadowMap;
      renderer.current.setPixelRatio(window.devicePixelRatio);

      // Scene
      scene.current = new THREE.Scene();

      // Camera
      camera.current = new THREE.PerspectiveCamera(FOV, ASPECT, NEAR, FAR);
      camera.current.layers.enableAll();
      scene.current.add(camera.current);

      // Root mesh
      scene.current.add(rootMesh.current);

      // Label renderer
      labelRenderer.current = new CSS2DRenderer({ element: labelRef.current });
      labelRenderer.current.setSize(width, height);
      labelRenderer.current.domElement.style.position = 'absolute';
      canvasRef.current.parentNode.prepend(labelRenderer.current.domElement);
      scene.current.add(labelRenderer.current);

      // Controls
      controls.current = new OrbitControls(camera.current, labelRenderer.current.domElement);
      controls.current.autoRotate = rotate;
      controls.current.enableZoom = true;
      controls.current.enableDamping = true;
      controls.current.enableZoom = zoom;
      controls.current.dampingFactor = 0.1;
      controls.current.update();
    }
  }, [canvasRef, height, labelRef, rotate, width, zoom]);

  // Set lightning
  useEffect(() => {
    if (scene.current) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer.current);
      pmremGenerator.compileEquirectangularShader();

      new RGBELoader().load(hdri, (texture) => {
        if (scene.current.environment) {
          scene.current.environment.dispose();
        }
        scene.current.environment = pmremGenerator.fromEquirectangular(texture).texture;
        texture.dispose();
        pmremGenerator.dispose();
      });
    }

    return () => {
      if (scene.current.environment) {
        scene.current.environment.dispose();
      }
    };
  }, [hdri]);

  // Update renderer aspect ratio and size when widget resize
  useEffect(() => {
    if (scene.current && camera.current) {
      camera.current.aspect = width / height;
      camera.current.updateProjectionMatrix();
      renderer.current.setSize(width, height);
      labelRenderer.current.setSize(width, height);
    }
  }, [height, width]);

  // Load the model
  useEffect(() => {
    if (model && model.scene && scene.current) {
      model.scene.castShadow = true;
      model.scene.receiveShadow = true;
      scene.current.add(model.scene);
    }
  }, [model]);

  useEffect(() => {
    if (model && model.animations) {
      clock.current = new THREE.Clock();
      mixer.current = new THREE.AnimationMixer(scene.current);
      model.animations.forEach((clip) => {
        if (currentClip.current && currentClip.current.name !== animation) {
          mixer.current.clipAction(currentClip.current).stop();
          mixer.current.uncacheClip(currentClip.current);
        }
        if (animation === clip.name) {
          currentClip.current = clip;
          mixer.current.clipAction(clip).play();
        }
      });
    }
  }, [animation, model]);

  // Set control settings
  useEffect(() => {
    if (controls.current) {
      controls.current.autoRotate = rotate;

      controls.current.enabled = enableControls;
    }
  }, [rotate, enableControls]);

  return {
    scene,
    camera,
    renderer,
    controls,
    mixer,
    clock,
    labelRenderer,
    rootMesh,
  };
}

import * as THREE from 'three';
// @ts-expect-error - no types
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// @ts-expect-error - no types
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
// @ts-expect-error - no types
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { useContext, useEffect, useState } from 'react';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Object3dContext } from '../context/object-3d-context';
import { NO_ANIMATION } from '../object-3d';

/**
 * Sets up the scene with camera and controls.
 * Also adds the model when it's loaded
 */
export function useSceneSetup(
  canvasRef: HTMLCanvasElement | null,
  labelRef: HTMLDivElement | null,
  model: GLTF,
  setLightingLoadingPercentage: (value: number) => void,
) {
  const {
    hdri,
    rotate,
    controls: enableControls,
    height,
    width,
    animation,
    zoom: enableZoom,
    fov,
    aspect,
    near,
    far,
    setContextCamera,
    setContextControls,
    savedCameraPosition,
    hotspots,
    rotationSpeed,
  } = useContext(Object3dContext);

  const [scene, setScene] = useState<THREE.Scene>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer>(null);
  const [controls, setControls] = useState<any>(null);
  const [mixer, setMixer] = useState<THREE.AnimationMixer>(null);
  const [labelRenderer, setLabelRenderer] = useState<CSS2DRenderer>(null);
  const [currentClip, setCurrentClip] = useState<THREE.AnimationClip>(
    new THREE.AnimationClip(NO_ANIMATION, 0, []),
  );
  const [currentModel, setCurrentModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (canvasRef && labelRef && !scene) {
      // Renderer
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.outputColorSpace = 'srgb';
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.setPixelRatio(window.devicePixelRatio);

      // Scene
      const scene = new THREE.Scene();

      // Camera
      const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      camera.layers.enableAll();
      scene.add(camera);
      if (setContextCamera) {
        setContextCamera(camera);
      }

      // Label renderer
      const labelRenderer = new CSS2DRenderer({ element: labelRef });
      labelRenderer.setSize(width, height);
      labelRenderer.domElement.style.position = 'absolute';
      canvasRef.parentNode.prepend(labelRenderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, labelRenderer.domElement);
      controls.autoRotate = rotate;
      controls.autoRotateSpeed = rotationSpeed;
      controls.enableDamping = true;
      controls.enableZoom = enableZoom;
      controls.dampingFactor = 0.1;
      controls.update();

      if (setContextControls) {
        setContextControls(controls);
      }

      setRenderer(renderer);
      setScene(scene);
      setCamera(camera);
      setLabelRenderer(labelRenderer);
      setControls(controls);
    }
  }, [canvasRef, labelRef]);

  useEffect(() => {
    if (controls) {
      controls.autoRotateSpeed = rotationSpeed;
    }
  }, [rotationSpeed]);

  // Set or update lightning
  useEffect(() => {
    if (scene && renderer) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();

      new RGBELoader().load(
        hdri,
        (texture) => {
          if (scene.environment) {
            scene.environment.dispose();
          }
          scene.environment = pmremGenerator.fromEquirectangular(texture).texture;
          texture.dispose();
          pmremGenerator.dispose();
        },
        (xhr) => {
          setLightingLoadingPercentage((xhr.loaded / xhr.total) * 100);
        },
      );
    }

    return () => {
      if (scene && scene.environment) {
        scene.environment.dispose();
      }
    };
  }, [hdri, renderer, scene]);

  // Update renderer aspect ratio and size when widget resize
  useEffect(() => {
    if (scene && camera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
      controls && controls.update();
      renderer && renderer.render(scene, camera);
      labelRenderer && labelRenderer.render(scene, camera);
    }
  }, [height, width, scene, camera, renderer, labelRenderer]);

  // Load the model
  useEffect(() => {
    if (model && model.scene === currentModel) {
      return;
    }

    if (scene && model && model.scene) {
      if (currentModel) {
        scene.remove(currentModel);
      }
      model.scene.castShadow = true;
      model.scene.receiveShadow = true;
      scene.add(model.scene);
      setCurrentModel(model.scene);
    }
  }, [currentModel, model, scene]);

  // Set up animations
  useEffect(() => {
    if (scene && model && model.animations) {
      const mixer = new THREE.AnimationMixer(scene);

      if (currentClip.name !== animation) {
        mixer.clipAction(currentClip).stop();
        mixer.uncacheClip(currentClip);
      }

      model.animations.forEach((clip) => {
        if (animation === clip.name) {
          mixer.clipAction(clip).play();
          setCurrentClip(clip);
        }
      });

      setMixer(mixer);
    }
  }, [animation, currentClip, model, scene]);

  // Set control settings
  useEffect(() => {
    if (controls) {
      controls.autoRotate = rotate;
      controls.enabled = enableControls;
      controls.enableZoom = enableZoom;
    }
  }, [rotate, enableControls, controls, enableZoom]);

  // Rerender when initial camera position or hotspots change
  useEffect(() => {
    controls && controls.update();
    renderer && renderer.render(scene, camera);
    labelRenderer && labelRenderer.render(scene, camera);
  }, [savedCameraPosition, hotspots]);

  return {
    scene,
    camera,
    renderer,
    controls,
    mixer,
    labelRenderer,
    currentModel,
  };
}

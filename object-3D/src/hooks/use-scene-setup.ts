import {
  ACESFilmicToneMapping,
  Group,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
// @ts-expect-error - no types
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// @ts-expect-error - no types
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Group as TweenGroup } from '@tweenjs/tween.js';
import { MutableRefObject, useContext, useEffect, useRef, useState } from 'react';
import { Object3dContext } from '../context/object-3d-context';
import { animateCamera } from '../util/animate-camera';

// Above 2, extra pixels cost a lot of GPU time and are hard to see
const MAX_PIXEL_RATIO = 2;
// Auto-rotation waits this long after the user lets go of the model
const ROTATION_RESUME_DELAY = 2000;

export interface CameraHome {
  position: Vector3;
  target: Vector3;
}

interface Three {
  renderer: WebGLRenderer;
  scene: Scene;
  pivot: Group;
  camera: PerspectiveCamera;
  labelRenderer: CSS2DRenderer;
  controls: any;
  tweens: TweenGroup;
}

/**
 * Sets up the renderer, scene, camera and controls.
 *
 * The model and the hotspots go into `pivot`, not directly into the scene. Scroll rotation and
 * pointer tilt turn the pivot, so the hotspots stay on the model.
 */
export function useSceneSetup(
  canvas: HTMLCanvasElement | null,
  labelElement: HTMLDivElement | null,
  home: MutableRefObject<CameraHome | null>,
  invalidate: () => void,
) {
  const {
    rotate,
    controls: enableControls,
    height,
    width,
    zoom: enableZoom,
    fov,
    aspect,
    near,
    far,
    exposure = 1,
    setContextCamera,
    setContextControls,
    rotationSpeed,
    eventCallbacks,
  } = useContext(Object3dContext);

  const [three, setThree] = useState<Three | null>(null);
  const autoRotate = useRef(rotate);
  const resumeRotationAt = useRef(0);

  useEffect(() => {
    if (!canvas || !labelElement) return;

    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.outputColorSpace = SRGBColorSpace;
    // Costs nothing until a light casts shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    const scene = new Scene();
    const pivot = new Group();
    scene.add(pivot);

    const camera = new PerspectiveCamera(fov, aspect, near, far);
    camera.layers.enableAll();
    scene.add(camera);

    // Hotspots are DOM nodes in this element. It sits on top of the canvas and receives all pointer input.
    const labelRenderer = new CSS2DRenderer({ element: labelElement });

    const controls = new OrbitControls(camera, labelRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.addEventListener('change', invalidate);
    controls.addEventListener('start', () => {
      resumeRotationAt.current = Infinity;
    });
    controls.addEventListener('end', () => {
      resumeRotationAt.current = performance.now() + ROTATION_RESUME_DELAY;
    });

    const tweens = new TweenGroup();

    if (setContextCamera) setContextCamera(camera);
    if (setContextControls) setContextControls(controls);

    setThree({ renderer, scene, pivot, camera, labelRenderer, controls, tweens });

    return () => {
      tweens.removeAll();
      controls.dispose();
      renderer.dispose();
      // Free the WebGL context now. Browsers allow only about 16 at a time.
      renderer.forceContextLoss();
    };
  }, [canvas, labelElement]);

  // Update renderer aspect ratio and size when widget resize
  useEffect(() => {
    if (!three || !width || !height) return;
    three.camera.aspect = width / height;
    three.camera.updateProjectionMatrix();
    three.renderer.setSize(width, height);
    three.labelRenderer.setSize(width, height);
    invalidate();
  }, [three, width, height]);

  useEffect(() => {
    if (!three) return;
    three.renderer.toneMappingExposure = exposure;
    invalidate();
  }, [three, exposure]);

  // Set control settings
  useEffect(() => {
    if (!three) return;
    const { controls } = three;
    controls.enabled = enableControls;
    controls.enableZoom = enableZoom;
    // OrbitControls always sets touch-action: none. Without drag, let touch gestures scroll the page.
    controls.domElement.style.touchAction = enableControls ? 'none' : '';
  }, [three, enableControls, enableZoom]);

  useEffect(() => {
    autoRotate.current = rotate;
    invalidate();
  }, [rotate]);

  useEffect(() => {
    if (three) three.controls.autoRotateSpeed = rotationSpeed;
  }, [three, rotationSpeed]);

  // Runs on every render, so the callbacks always see the current state
  useEffect(() => {
    if (!eventCallbacks || !three) return;
    const { camera, controls, tweens } = three;

    eventCallbacks.start_rotation((speed) => {
      controls.autoRotateSpeed = speed || rotationSpeed;
      autoRotate.current = true;
      resumeRotationAt.current = 0;
      invalidate();
    });
    eventCallbacks.stop_rotation(() => {
      autoRotate.current = false;
    });
    eventCallbacks.reset_camera(() => {
      if (home.current) {
        animateCamera(tweens, camera, controls, home.current.position, home.current.target);
        invalidate();
      }
    });
  });

  /** Call once per frame, before `controls.update()` */
  function updateAutoRotate(reducedMotion: boolean) {
    if (!three) return;
    three.controls.autoRotate =
      autoRotate.current && !reducedMotion && performance.now() >= resumeRotationAt.current;
  }

  return { ...three, updateAutoRotate };
}

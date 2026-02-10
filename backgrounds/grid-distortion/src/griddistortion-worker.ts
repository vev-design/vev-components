import * as THREE from 'three';

// Shaders
const vertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec4 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 offset = texture2D(uDataTexture, vUv);
  gl_FragColor = texture2D(uTexture, uv - 0.02 * offset.rg);
}`;

// State
let canvas: OffscreenCanvas | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let plane: THREE.Mesh | null = null;
let geometry: THREE.PlaneGeometry | null = null;
let material: THREE.ShaderMaterial | null = null;
let dataTexture: THREE.DataTexture | null = null;
let imageTexture: THREE.Texture | null = null;

let running = false;
let rafId: number | null = null;
let isVisible = true;

// Props
let gridSize = 15;
let mouseSize = 0.1;
let strength = 0.15;
let relaxation = 0.9;

// Mouse state
const mouseState = {
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
  vX: 0,
  vY: 0
};

// Canvas dimensions
let canvasWidth = 1;
let canvasHeight = 1;
let containerAspect = 1;

// Uniforms reference
let uniforms: {
  time: { value: number };
  resolution: { value: THREE.Vector4 };
  uTexture: { value: THREE.Texture | null };
  uDataTexture: { value: THREE.DataTexture | null };
} | null = null;

function initRenderer(offscreen: OffscreenCanvas, dpr: number) {
  canvas = offscreen;

  renderer = new THREE.WebGLRenderer({
    canvas: offscreen as any,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(dpr, 2));
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
  camera.position.z = 2;

  uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector4() },
    uTexture: { value: null },
    uDataTexture: { value: null }
  };

  createDataTexture(gridSize);

  material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true
  });

  geometry = new THREE.PlaneGeometry(1, 1, gridSize - 1, gridSize - 1);
  plane = new THREE.Mesh(geometry, material);
  scene.add(plane);
}

function createDataTexture(size: number) {
  if (dataTexture) {
    dataTexture.dispose();
  }

  const data = new Float32Array(4 * size * size);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.random() * 255 - 125;
    data[i * 4 + 1] = Math.random() * 255 - 125;
  }

  dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  dataTexture.needsUpdate = true;

  if (uniforms) {
    uniforms.uDataTexture.value = dataTexture;
  }
}

function updateGeometry(size: number) {
  if (!plane || !scene) return;

  if (geometry) {
    geometry.dispose();
  }

  geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1);
  plane.geometry = geometry;

  createDataTexture(size);
  gridSize = size;

  // Reapply scale after geometry change
  if (plane) {
    plane.scale.set(containerAspect, 1, 1);
  }
}

function setImageTexture(imageBitmap: ImageBitmap) {
  if (imageTexture) {
    imageTexture.dispose();
  }

  imageTexture = new THREE.Texture(imageBitmap as any);
  imageTexture.minFilter = THREE.LinearFilter;
  imageTexture.magFilter = THREE.LinearFilter;
  imageTexture.wrapS = THREE.ClampToEdgeWrapping;
  imageTexture.wrapT = THREE.ClampToEdgeWrapping;
  imageTexture.needsUpdate = true;

  if (uniforms) {
    uniforms.uTexture.value = imageTexture;
  }
}

function resize(width: number, height: number) {
  if (!renderer || !camera || !uniforms) return;

  canvasWidth = Math.max(1, width);
  canvasHeight = Math.max(1, height);
  containerAspect = canvasWidth / canvasHeight;

  renderer.setSize(canvasWidth, canvasHeight, false);

  if (plane) {
    plane.scale.set(containerAspect, 1, 1);
  }

  const frustumHeight = 1;
  const frustumWidth = frustumHeight * containerAspect;
  camera.left = -frustumWidth / 2;
  camera.right = frustumWidth / 2;
  camera.top = frustumHeight / 2;
  camera.bottom = -frustumHeight / 2;
  camera.updateProjectionMatrix();

  uniforms.resolution.value.set(canvasWidth, canvasHeight, 1, 1);
}

function updateDataTexture() {
  if (!dataTexture) return;

  const data = dataTexture.image.data as Float32Array;
  const size = gridSize;
  const dataLength = size * size;

  // Apply relaxation to all cells
  for (let i = 0; i < dataLength; i++) {
    const idx = i * 4;
    data[idx] *= relaxation;
    data[idx + 1] *= relaxation;
  }

  // Only process mouse interaction if mouse is moving or has position
  if (mouseState.vX !== 0 || mouseState.vY !== 0 || mouseState.x !== 0 || mouseState.y !== 0) {
    const gridMouseX = size * mouseState.x;
    const gridMouseY = size * mouseState.y;
    const maxDist = size * mouseSize;
    const maxDistSq = maxDist * maxDist;
    const strengthValue = strength * 100;

    for (let i = 0; i < size; i++) {
      const dx = gridMouseX - i;
      const dxSq = dx * dx;

      for (let j = 0; j < size; j++) {
        const dy = gridMouseY - j;
        const distSq = dxSq + dy * dy;

        if (distSq < maxDistSq && distSq > 0.0001) {
          const index = 4 * (i + size * j);
          const dist = Math.sqrt(distSq);
          const power = Math.min(maxDist / dist, 10);
          data[index] += strengthValue * mouseState.vX * power;
          data[index + 1] -= strengthValue * mouseState.vY * power;
        }
      }
    }
  }

  dataTexture.needsUpdate = true;
}

function render() {
  if (!renderer || !scene || !camera || !uniforms) return;

  uniforms.time.value += 0.05;
  updateDataTexture();
  renderer.render(scene, camera);
}

function loop() {
  if (!running || !isVisible) return;
  render();
  rafId = requestAnimationFrame(loop);
}

function start() {
  if (running) return;
  running = true;
  loop();
}

function stop() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function cleanup() {
  stop();

  if (geometry) {
    geometry.dispose();
    geometry = null;
  }
  if (material) {
    material.dispose();
    material = null;
  }
  if (dataTexture) {
    dataTexture.dispose();
    dataTexture = null;
  }
  if (imageTexture) {
    imageTexture.dispose();
    imageTexture = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
  plane = null;
  uniforms = null;
  canvas = null;
}

// Message handler
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      initRenderer(data.canvas, data.dpr || 1);
      self.postMessage({ type: 'ready' });
      break;

    case 'start':
      start();
      break;

    case 'stop':
      stop();
      break;

    case 'resize':
      resize(data.width, data.height);
      break;

    case 'visibility':
      isVisible = data.visible;
      if (isVisible && running) {
        loop();
      }
      break;

    case 'pointer':
      mouseState.vX = data.x - mouseState.prevX;
      mouseState.vY = data.y - mouseState.prevY;
      mouseState.x = data.x;
      mouseState.y = data.y;
      mouseState.prevX = data.x;
      mouseState.prevY = data.y;
      break;

    case 'pointerLeave':
      mouseState.x = 0;
      mouseState.y = 0;
      mouseState.prevX = 0;
      mouseState.prevY = 0;
      mouseState.vX = 0;
      mouseState.vY = 0;
      break;

    case 'props':
      if (typeof data.mouse !== 'undefined') mouseSize = data.mouse;
      if (typeof data.strength !== 'undefined') strength = data.strength;
      if (typeof data.relaxation !== 'undefined') relaxation = data.relaxation;
      if (typeof data.grid !== 'undefined' && data.grid !== gridSize) {
        updateGeometry(Math.round(data.grid));
      }
      break;

    case 'image':
      if (data.imageBitmap) {
        setImageTexture(data.imageBitmap);
      }
      break;

    case 'cleanup':
      cleanup();
      break;
  }
};

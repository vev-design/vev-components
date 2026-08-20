// LightPillar WebGL Worker - Renders on OffscreenCanvas in a separate thread

import { createQualityGovernor, getRenderSize, Size } from './quality';

const vertexShader = `
attribute vec2 aPosition;
attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec3 uTopColor;
uniform vec3 uBottomColor;
uniform float uIntensity;
uniform bool uInteractive;
uniform float uGlowAmount;
uniform float uPillarWidth;
uniform float uPillarHeight;
uniform float uNoiseIntensity;
uniform float uPillarRotation;
varying vec2 vUv;

const float PI = 3.141592653589793;
const float E = 2.71828182845904523536;
const float HALF = 0.5;

// exp() saturates mediump floats above ~11, and tanh() of an infinite input is
// NaN, which shows up as black blocks on GPUs where mediump really is fp16.
const float MAX_TANH_INPUT = 3.0;

float tanh(float x) {
  float exp2x = exp(2.0 * x);
  return (exp2x - 1.0) / (exp2x + 1.0);
}

mat2 rot(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float noise(vec2 coord) {
  float G = E;
  vec2 r = (G * sin(G * coord));
  return fract(r.x * r.y * (1.0 + coord.x));
}

vec3 applyWaveDeformation(vec3 pos, float timeOffset) {
  float frequency = 1.0;
  float amplitude = 1.0;
  vec3 deformed = pos;

  for(float i = 0.0; i < 4.0; i++) {
    deformed.xz *= rot(0.4);
    float phase = timeOffset * i * 2.0;
    vec3 oscillation = cos(deformed.zxy * frequency - phase);
    deformed += oscillation * amplitude;
    frequency *= 2.0;
    amplitude *= HALF;
  }
  return deformed;
}

float blendMin(float a, float b, float k) {
  float scaledK = k * 4.0;
  float h = max(scaledK - abs(a - b), 0.0);
  return min(a, b) - h * h * 0.25 / scaledK;
}

float blendMax(float a, float b, float k) {
  return -blendMin(-a, -b, k);
}

void main() {
  vec2 fragCoord = vUv * uResolution;
  vec2 uv = (fragCoord * 2.0 - uResolution) / uResolution.y;

  float rotAngle = uPillarRotation * PI / 180.0;
  uv *= rot(rotAngle);

  vec3 origin = vec3(0.0, 0.0, -10.0);
  vec3 direction = normalize(vec3(uv, 1.0));

  float maxDepth = 50.0;
  float depth = 0.1;

  mat2 rotX = rot(uTime * 0.3);
  if(uInteractive && length(uMouse) > 0.0) {
    rotX = rot(uMouse.x * PI * 2.0);
  }

  vec3 color = vec3(0.0);

  for(float i = 0.0; i < 64.0; i++) {
    if(depth > maxDepth) break;

    vec3 pos = origin + direction * depth;
    pos.xz *= rotX;

    vec3 deformed = pos;
    deformed.y *= uPillarHeight;
    deformed = applyWaveDeformation(deformed + vec3(0.0, uTime, 0.0), uTime);

    vec2 cosinePair = cos(deformed.xz);
    float fieldDistance = length(cosinePair) - 0.2;

    float radialBound = length(pos.xz) - uPillarWidth;
    fieldDistance = blendMax(radialBound, fieldDistance, 1.0);
    fieldDistance = abs(fieldDistance) * 0.15 + 0.01;

    vec3 gradient = mix(uBottomColor, uTopColor, smoothstep(15.0, -15.0, pos.y));
    color += gradient / fieldDistance;

    depth += fieldDistance;
  }

  float widthNormalization = uPillarWidth / 3.0;
  vec3 scaledColor = min(color * uGlowAmount / widthNormalization, vec3(MAX_TANH_INPUT));
  color = vec3(tanh(scaledColor.r), tanh(scaledColor.g), tanh(scaledColor.b));

  float rnd = noise(gl_FragCoord.xy);
  color -= rnd / 15.0 * uNoiseIntensity;

  gl_FragColor = vec4(color * uIntensity, 1.0);
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '').trim();
  const v = h.length === 3
    ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return [v[0] / 255, v[1] / 255, v[2] / 255];
};

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let uvBuffer: WebGLBuffer | null = null;

let locs: {
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uTopColor: WebGLUniformLocation | null;
  uBottomColor: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uInteractive: WebGLUniformLocation | null;
  uGlowAmount: WebGLUniformLocation | null;
  uPillarWidth: WebGLUniformLocation | null;
  uPillarHeight: WebGLUniformLocation | null;
  uNoiseIntensity: WebGLUniformLocation | null;
  uPillarRotation: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let isVisible = true;
let contextLost = false;
let contextLossCount = 0;
// Set when the visitor asked for reduced motion: a single frame is rendered and
// the loop never starts.
let staticMode = false;
let time = 0;
let lastTs = 0;
let lastFrame = 0;

// Exactly one animation frame may ever be pending. Without this, a `visibility`
// message pair arriving in the same frame as an already-scheduled callback
// leaves two self-scheduling loops alive, and each further pair doubles them.
let frameHandle: number | null = null;

const governor = createQualityGovernor();

// CSS size of the element. The rendered pixel size is derived from it so the
// quality tier can change resolution without another round trip.
let cssSize: Size = { width: 1, height: 1 };
let renderSize: Size = { width: 0, height: 0 };

// Props
let topColor: [number, number, number] = [0.32, 0.15, 1];
let bottomColor: [number, number, number] = [1, 0.62, 0.99];
let intensity = 1;
let rotationSpeed = 0.3;
let interactive = false;
let glowAmount = 0.005;
let pillarWidth = 3;
let pillarHeight = 0.4;
let noiseIntensity = 0.5;
let pillarRotation = 0;

let mouseTarget = { x: 0, y: 0 };
let mouseCurrent = { x: 0, y: 0 };

const createShader = (type: number, source: string): WebGLShader | null => {
  const shader = gl!.createShader(type);
  if (!shader) return null;
  gl!.shaderSource(shader, source);
  gl!.compileShader(shader);
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    gl!.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram_ = (): WebGLProgram | null => {
  const vs = createShader(gl!.VERTEX_SHADER, vertexShader);
  const fs = createShader(gl!.FRAGMENT_SHADER, fragmentShader);
  if (!vs || !fs) return null;

  const p = gl!.createProgram();
  if (!p) return null;

  gl!.attachShader(p, vs);
  gl!.attachShader(p, fs);
  gl!.linkProgram(p);

  if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
    gl!.deleteProgram(p);
    gl!.deleteShader(vs);
    gl!.deleteShader(fs);
    return null;
  }

  gl!.detachShader(p, vs);
  gl!.detachShader(p, fs);
  gl!.deleteShader(vs);
  gl!.deleteShader(fs);

  return p;
};

// Uniforms that only change when props change — uploaded from the `props`
// handler (and once at init), not re-sent every frame.
function applyStaticUniforms() {
  if (!gl) return;
  if (locs.uTopColor) gl.uniform3f(locs.uTopColor, topColor[0], topColor[1], topColor[2]);
  if (locs.uBottomColor) gl.uniform3f(locs.uBottomColor, bottomColor[0], bottomColor[1], bottomColor[2]);
  if (locs.uIntensity) gl.uniform1f(locs.uIntensity, intensity);
  if (locs.uInteractive) gl.uniform1i(locs.uInteractive, interactive ? 1 : 0);
  if (locs.uGlowAmount) gl.uniform1f(locs.uGlowAmount, glowAmount);
  if (locs.uPillarWidth) gl.uniform1f(locs.uPillarWidth, pillarWidth);
  if (locs.uPillarHeight) gl.uniform1f(locs.uPillarHeight, pillarHeight);
  if (locs.uNoiseIntensity) gl.uniform1f(locs.uNoiseIntensity, noiseIntensity);
  if (locs.uPillarRotation) gl.uniform1f(locs.uPillarRotation, pillarRotation);
}

// Resizing the drawing buffer reallocates it on the GPU, so only do it when the
// size actually changes.
function applyRenderSize() {
  if (!canvas || !gl) return;
  const next = getRenderSize(cssSize, governor.state().scale, pillarWidth);
  if (next.width === renderSize.width && next.height === renderSize.height) return;

  renderSize = next;
  canvas.width = next.width;
  canvas.height = next.height;
  gl.viewport(0, 0, next.width, next.height);
  if (locs.uResolution) gl.uniform2f(locs.uResolution, next.width, next.height);
}

function publishQuality() {
  const state = governor.state();
  self.postMessage({ type: 'quality', data: { ...state, ...renderSize } });
}

const cancelFrame = () => {
  if (frameHandle === null) return;
  cancelAnimationFrame(frameHandle);
  frameHandle = null;
};

const scheduleFrame = () => {
  if (frameHandle !== null || !gl || contextLost || !running || !isVisible) return;
  frameHandle = requestAnimationFrame(onFrame);
};

function draw() {
  if (!gl) return;

  if (locs.uTime) gl.uniform1f(locs.uTime, time);
  if (interactive) {
    const smoothing = 0.1;
    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * smoothing;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * smoothing;
    if (locs.uMouse) gl.uniform2f(locs.uMouse, mouseCurrent.x, mouseCurrent.y);
  }

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function onFrame(ts: number) {
  frameHandle = null;
  if (!gl || contextLost || !running || !isVisible) return;

  // Reduced motion, or the governor gave up on animating: render the current
  // state once and leave it on screen.
  if (staticMode || governor.state().frozen) {
    draw();
    return;
  }

  scheduleFrame();

  const interval = lastFrame ? ts - lastFrame : 0;
  if (interval && interval < 1000 / governor.state().targetFps - 0.5) return;
  lastFrame = ts;

  // Clamp delta so returning from a stall/pause doesn't jump the animation.
  const delta = lastTs ? Math.min((ts - lastTs) / 1000, 1 / 30) : 1 / 60;
  lastTs = ts;
  time += delta * rotationSpeed;

  draw();

  if (!interval || !governor.sample(interval)) return;

  const state = governor.state();
  applyRenderSize();
  publishQuality();
  if (state.frozen) cancelFrame();
}

function resumeLoop() {
  lastTs = 0;
  lastFrame = 0;
  scheduleFrame();
}

function setupGl(): boolean {
  if (!gl) return false;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  program = createProgram_();
  if (!program) return false;

  gl.useProgram(program);

  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  const uvLoc = gl.getAttribLocation(program, 'aUv');

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

  locs = {
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uMouse: gl.getUniformLocation(program, 'uMouse'),
    uTopColor: gl.getUniformLocation(program, 'uTopColor'),
    uBottomColor: gl.getUniformLocation(program, 'uBottomColor'),
    uIntensity: gl.getUniformLocation(program, 'uIntensity'),
    uInteractive: gl.getUniformLocation(program, 'uInteractive'),
    uGlowAmount: gl.getUniformLocation(program, 'uGlowAmount'),
    uPillarWidth: gl.getUniformLocation(program, 'uPillarWidth'),
    uPillarHeight: gl.getUniformLocation(program, 'uPillarHeight'),
    uNoiseIntensity: gl.getUniformLocation(program, 'uNoiseIntensity'),
    uPillarRotation: gl.getUniformLocation(program, 'uPillarRotation'),
  };

  applyStaticUniforms();
  renderSize = { width: 0, height: 0 };
  applyRenderSize();
  return true;
}

// A lost context means the GPU driver reset, which on this shader means it was
// overloaded. Come back at the cheapest tier, and stop animating if it happens
// again rather than risk taking the tab down with us.
function handleContextLost(event: Event) {
  event.preventDefault();
  contextLost = true;
  contextLossCount += 1;
  cancelFrame();
  publishQuality();
}

function handleContextRestored() {
  contextLost = false;
  if (contextLossCount > 1) governor.freeze();
  else governor.collapse();

  if (!setupGl()) return;
  publishQuality();
  resumeLoop();
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false
  });

  if (!gl) return;

  const target = canvas as unknown as EventTarget;
  target.addEventListener('webglcontextlost', handleContextLost as EventListener);
  target.addEventListener('webglcontextrestored', handleContextRestored as EventListener);

  if (!setupGl()) return;

  self.postMessage({ type: 'ready' });
}

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      init(data.canvas);
      break;

    case 'start':
      if (!running) {
        running = true;
        resumeLoop();
      }
      break;

    case 'stop':
      running = false;
      cancelFrame();
      break;

    case 'visibility':
      if (typeof data?.visible === 'boolean') {
        isVisible = data.visible;
        if (isVisible) {
          if (running) resumeLoop();
        } else {
          cancelFrame();
        }
      }
      break;

    case 'motion':
      if (typeof data?.reduced === 'boolean' && data.reduced !== staticMode) {
        staticMode = data.reduced;
        if (staticMode) cancelFrame();
        scheduleFrame();
      }
      break;

    case 'resize':
      if (typeof data?.cssWidth === 'number' && typeof data?.cssHeight === 'number') {
        cssSize = { width: data.cssWidth, height: data.cssHeight };
        applyRenderSize();
        scheduleFrame();
      }
      break;

    case 'mouse':
      mouseTarget = { x: data.x, y: data.y };
      break;

    case 'mouseLeave':
      mouseTarget = { x: 0, y: 0 };
      break;

    case 'props':
      if (data.topColor) topColor = hexToRgb(data.topColor);
      if (data.bottomColor) bottomColor = hexToRgb(data.bottomColor);
      if (typeof data.intensity === 'number') intensity = data.intensity;
      if (typeof data.rotationSpeed === 'number') rotationSpeed = data.rotationSpeed;
      if (typeof data.interactive === 'boolean') interactive = data.interactive;
      if (typeof data.glowAmount === 'number') glowAmount = data.glowAmount;
      if (typeof data.pillarWidth === 'number') pillarWidth = data.pillarWidth;
      if (typeof data.pillarHeight === 'number') pillarHeight = data.pillarHeight;
      if (typeof data.noiseIntensity === 'number') noiseIntensity = data.noiseIntensity;
      if (typeof data.pillarRotation === 'number') pillarRotation = data.pillarRotation;
      applyStaticUniforms();
      // The pixel budget depends on pillarWidth.
      applyRenderSize();
      scheduleFrame();
      break;

    case 'cleanup':
      running = false;
      cancelFrame();
      if (canvas) {
        const target = canvas as unknown as EventTarget;
        target.removeEventListener('webglcontextlost', handleContextLost as EventListener);
        target.removeEventListener('webglcontextrestored', handleContextRestored as EventListener);
      }
      if (gl) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (uvBuffer) gl.deleteBuffer(uvBuffer);
        if (program) gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      gl = null;
      canvas = null;
      program = null;
      positionBuffer = null;
      uvBuffer = null;
      break;
  }
};

// LightPillar WebGL Worker - Renders on OffscreenCanvas in a separate thread

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
precision highp float;
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
const float EPSILON = 0.001;
const float E = 2.71828182845904523536;
const float HALF = 0.5;

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

  for(float i = 0.0; i < 100.0; i++) {
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
    color += gradient * pow(1.0 / fieldDistance, 1.0);

    if(fieldDistance < EPSILON || depth > maxDepth) break;
    depth += fieldDistance;
  }

  float widthNormalization = uPillarWidth / 3.0;
  vec3 scaledColor = color * uGlowAmount / widthNormalization;
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
let time = 0;
let lastTs = 0;

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

function animate(ts: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl) return;

  const delta = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
  lastTs = ts;
  time += delta * rotationSpeed;

  // Smooth mouse
  const smoothing = 0.1;
  mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * smoothing;
  mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * smoothing;

  // Update uniforms
  if (locs.uTime) gl.uniform1f(locs.uTime, time);
  if (locs.uMouse) gl.uniform2f(locs.uMouse, mouseCurrent.x, mouseCurrent.y);
  if (locs.uTopColor) gl.uniform3f(locs.uTopColor, topColor[0], topColor[1], topColor[2]);
  if (locs.uBottomColor) gl.uniform3f(locs.uBottomColor, bottomColor[0], bottomColor[1], bottomColor[2]);
  if (locs.uIntensity) gl.uniform1f(locs.uIntensity, intensity);
  if (locs.uInteractive) gl.uniform1i(locs.uInteractive, interactive ? 1 : 0);
  if (locs.uGlowAmount) gl.uniform1f(locs.uGlowAmount, glowAmount);
  if (locs.uPillarWidth) gl.uniform1f(locs.uPillarWidth, pillarWidth);
  if (locs.uPillarHeight) gl.uniform1f(locs.uPillarHeight, pillarHeight);
  if (locs.uNoiseIntensity) gl.uniform1f(locs.uNoiseIntensity, noiseIntensity);
  if (locs.uPillarRotation) gl.uniform1f(locs.uPillarRotation, pillarRotation);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false
  });

  if (!gl) return;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  program = createProgram_();
  if (!program) return;

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
        lastTs = 0;
        requestAnimationFrame(animate);
      }
      break;

    case 'stop':
      running = false;
      break;

    case 'resize':
      if (canvas && gl) {
        canvas.width = data.width;
        canvas.height = data.height;
        gl.viewport(0, 0, data.width, data.height);
        if (locs.uResolution) {
          gl.uniform2f(locs.uResolution, data.width, data.height);
        }
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
      break;

    case 'cleanup':
      running = false;
      if (gl) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (uvBuffer) gl.deleteBuffer(uvBuffer);
        if (program) gl.deleteProgram(program);
      }
      gl = null;
      canvas = null;
      program = null;
      positionBuffer = null;
      uvBuffer = null;
      break;
  }
};

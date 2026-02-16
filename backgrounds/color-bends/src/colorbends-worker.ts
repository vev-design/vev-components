// ColorBends WebGL Worker - Renders on OffscreenCanvas in a separate thread

const MAX_COLORS = 8;

const frag = `
#define MAX_COLORS ${MAX_COLORS}
precision highp float;
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-6.0 / exp(6.0 * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
attribute vec2 aPosition;
attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let uvBuffer: WebGLBuffer | null = null;

let locs: {
  uCanvas: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uSpeed: WebGLUniformLocation | null;
  uRot: WebGLUniformLocation | null;
  uColorCount: WebGLUniformLocation | null;
  uColors: WebGLUniformLocation | null;
  uTransparent: WebGLUniformLocation | null;
  uScale: WebGLUniformLocation | null;
  uFrequency: WebGLUniformLocation | null;
  uWarpStrength: WebGLUniformLocation | null;
  uPointer: WebGLUniformLocation | null;
  uMouseInfluence: WebGLUniformLocation | null;
  uParallax: WebGLUniformLocation | null;
  uNoise: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let time = 0;
let lastTs = 0;
let width = 1;
let height = 1;

// Prop values
let speed = 0.2;
let rotation = 45;
let autoRotate = 0;
let scale = 1;
let frequency = 1;
let warpStrength = 1;
let mouseInfluence = 1;
let parallax = 0.5;
let noise = 0.1;
let transparent = true;
let colors: string[] = [];

// Smooth values
let pointerTarget = { x: 0, y: 0 };
let pointerCurrent = { x: 0, y: 0 };

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
  const vs = createShader(gl!.VERTEX_SHADER, vert);
  const fs = createShader(gl!.FRAGMENT_SHADER, frag);
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
  time += delta;

  // Smooth pointer
  const amt = Math.min(1, delta * 8);
  pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * amt;
  pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * amt;

  // Update uniforms
  if (locs.uTime) gl.uniform1f(locs.uTime, time);
  if (locs.uSpeed) gl.uniform1f(locs.uSpeed, speed);
  if (locs.uScale) gl.uniform1f(locs.uScale, scale);
  if (locs.uFrequency) gl.uniform1f(locs.uFrequency, frequency);
  if (locs.uWarpStrength) gl.uniform1f(locs.uWarpStrength, warpStrength);
  if (locs.uMouseInfluence) gl.uniform1f(locs.uMouseInfluence, mouseInfluence);
  if (locs.uParallax) gl.uniform1f(locs.uParallax, parallax);
  if (locs.uNoise) gl.uniform1f(locs.uNoise, noise);
  if (locs.uTransparent) gl.uniform1i(locs.uTransparent, transparent ? 1 : 0);
  if (locs.uPointer) gl.uniform2f(locs.uPointer, pointerCurrent.x, pointerCurrent.y);

  // Update rotation
  const deg = (rotation % 360) + autoRotate * time;
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  if (locs.uRot) gl.uniform2f(locs.uRot, c, s);

  // Update colors
  const colorArray = colors.filter(Boolean).slice(0, MAX_COLORS);
  const colorVecs: number[] = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    if (i < colorArray.length) {
      const hex = colorArray[i].replace('#', '').trim();
      const v = hex.length === 3
        ? [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16)
        ]
        : [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16)
        ];
      colorVecs.push(v[0] / 255, v[1] / 255, v[2] / 255);
    } else {
      colorVecs.push(0, 0, 0);
    }
  }
  if (locs.uColors) gl.uniform3fv(locs.uColors, colorVecs);
  if (locs.uColorCount) gl.uniform1i(locs.uColorCount, colorArray.length);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false
  });

  if (!gl) return;

  program = createProgram_();
  if (!program) return;

  gl.useProgram(program);

  // Create buffers
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
    uCanvas: gl.getUniformLocation(program, 'uCanvas'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uRot: gl.getUniformLocation(program, 'uRot'),
    uColorCount: gl.getUniformLocation(program, 'uColorCount'),
    uColors: gl.getUniformLocation(program, 'uColors[0]'),
    uTransparent: gl.getUniformLocation(program, 'uTransparent'),
    uScale: gl.getUniformLocation(program, 'uScale'),
    uFrequency: gl.getUniformLocation(program, 'uFrequency'),
    uWarpStrength: gl.getUniformLocation(program, 'uWarpStrength'),
    uPointer: gl.getUniformLocation(program, 'uPointer'),
    uMouseInfluence: gl.getUniformLocation(program, 'uMouseInfluence'),
    uParallax: gl.getUniformLocation(program, 'uParallax'),
    uNoise: gl.getUniformLocation(program, 'uNoise'),
  };

  gl.clearColor(0, 0, 0, transparent ? 0 : 1);

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
        width = data.width;
        height = data.height;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        if (locs.uCanvas) {
          gl.uniform2f(locs.uCanvas, data.cssWidth || width, data.cssHeight || height);
        }
      }
      break;

    case 'pointer':
      pointerTarget = { x: data.x, y: data.y };
      break;

    case 'props':
      if (typeof data.speed === 'number') speed = data.speed;
      if (typeof data.rotation === 'number') rotation = data.rotation;
      if (typeof data.autoRotate === 'number') autoRotate = data.autoRotate;
      if (typeof data.scale === 'number') scale = data.scale;
      if (typeof data.frequency === 'number') frequency = data.frequency;
      if (typeof data.warpStrength === 'number') warpStrength = data.warpStrength;
      if (typeof data.mouseInfluence === 'number') mouseInfluence = data.mouseInfluence;
      if (typeof data.parallax === 'number') parallax = data.parallax;
      if (typeof data.noise === 'number') noise = data.noise;
      if (typeof data.transparent === 'boolean') {
        transparent = data.transparent;
        if (gl) gl.clearColor(0, 0, 0, transparent ? 0 : 1);
      }
      if (Array.isArray(data.colors)) colors = data.colors;
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

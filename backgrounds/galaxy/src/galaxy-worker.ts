// Galaxy WebGL Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;
uniform float uOpacity;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) { return abs(fract(x) * 2.0 - 1.0); }
float tris(float x) { return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * fract(x) - 1.0)); }
float trisn(float x) { return 2.0 * tris(x) - 1.0; }

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float flareSize = smoothstep(0.9, 1.0, size) * tri(uStarSpeed / (PERIOD * seed + 1.0));
      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
      float star = Star(gv - offset - pad, flareSize);
      float twinkle = mix(1.0, trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0, uTwinkleIntensity);
      col += star * size * twinkle;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

  if (uAutoCenterRepulsion > 0.0) {
    float d = length(uv);
    uv += normalize(uv) * (uAutoCenterRepulsion / (d + 0.1)) * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mpos = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float d = length(uv - mpos);
    uv += normalize(uv - mpos) * (uRepulsionStrength / (d + 0.1)) * 0.05 * uMouseActiveFactor;
  } else {
    uv += (uMouse - vec2(0.5)) * 0.1 * uMouseActiveFactor;
  }

  float a = uTime * uRotationSpeed;
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  uv = rot * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    col += StarLayer(uv * scale + i * 453.32) * depth * smoothstep(1.0, 0.9, depth);
  }

  if (uTransparent) {
    gl_FragColor = vec4(col, min(smoothstep(0.0, 0.3, length(col)), 1.0) * uOpacity);
  } else {
    gl_FragColor = vec4(col, uOpacity);
  }
}
`;

type UniformName = 'uTime' | 'uResolution' | 'uFocal' | 'uRotation' | 'uStarSpeed' | 'uDensity' | 'uSpeed' | 'uMouse' | 'uGlowIntensity' | 'uMouseRepulsion' | 'uTwinkleIntensity' | 'uRotationSpeed' | 'uRepulsionStrength' | 'uMouseActiveFactor' | 'uAutoCenterRepulsion' | 'uTransparent' | 'uOpacity';

const UNIFORM_META: Record<UniformName, 'float' | 'vec2' | 'vec3' | 'int'> = {
  uTime: 'float', uResolution: 'vec3', uFocal: 'vec2', uRotation: 'vec2',
  uStarSpeed: 'float', uDensity: 'float', uSpeed: 'float', uMouse: 'vec2',
  uGlowIntensity: 'float', uMouseRepulsion: 'int', uTwinkleIntensity: 'float',
  uRotationSpeed: 'float', uRepulsionStrength: 'float', uMouseActiveFactor: 'float',
  uAutoCenterRepulsion: 'float', uTransparent: 'int', uOpacity: 'float'
};

const SMOOTHED: UniformName[] = ['uDensity', 'uGlowIntensity', 'uTwinkleIntensity', 'uRotationSpeed', 'uRepulsionStrength', 'uAutoCenterRepulsion', 'uSpeed', 'uOpacity'];

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let locs: Record<UniformName, WebGLUniformLocation | null> = {} as any;
let vals: Record<UniformName, number | Float32Array> = {} as any;
let targets: Partial<Record<UniformName, number>> = {};

let running = false, visible = true, time = 0, lastTs = 0;
let mouseTarget: [number, number] = [0.5, 0.5];
let mouseVal: [number, number] = [0.5, 0.5];
let activeTarget = 0, activeVal = 0;
let speed = 1, starSpeed = 0.5, disableAnim = false;

const createShader = (t: number, src: string) => {
  const s = gl!.createShader(t);
  if (!s) return null;
  gl!.shaderSource(s, src);
  gl!.compileShader(s);
  if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) { gl!.deleteShader(s); return null; }
  return s;
};

const createProg = () => {
  const vs = createShader(gl!.VERTEX_SHADER, vertexShader);
  const fs = createShader(gl!.FRAGMENT_SHADER, fragmentShader);
  if (!vs || !fs) return null;
  const p = gl!.createProgram();
  if (!p) return null;
  gl!.attachShader(p, vs);
  gl!.attachShader(p, fs);
  gl!.linkProgram(p);
  if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) { gl!.deleteProgram(p); return null; }
  gl!.detachShader(p, vs); gl!.detachShader(p, fs);
  gl!.deleteShader(vs); gl!.deleteShader(fs);
  return p;
};

const apply = (name: UniformName, value: number | Float32Array | [number, number]) => {
  const loc = locs[name];
  if (!loc || !gl) return;
  const t = UNIFORM_META[name];
  if (value instanceof Float32Array) {
    t === 'vec2' ? gl.uniform2fv(loc, value) : gl.uniform3fv(loc, value);
  } else if (Array.isArray(value)) {
    gl.uniform2f(loc, value[0], value[1]);
  } else if (t === 'int') {
    gl.uniform1i(loc, value);
  } else {
    gl.uniform1f(loc, value);
  }
  vals[name] = value as any;
};

function animate(ts: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl || !visible) return;

  const delta = lastTs ? (ts - lastTs) / 1000 : 1/60;
  lastTs = ts;

  if (!disableAnim) time += delta * speed;
  apply('uTime', time);
  apply('uStarSpeed', (time * starSpeed) / 10);

  // Smooth mouse
  const f = 1 - Math.exp(-delta / 0.2);
  mouseVal[0] += (mouseTarget[0] - mouseVal[0]) * f;
  mouseVal[1] += (mouseTarget[1] - mouseVal[1]) * f;
  activeVal += (activeTarget - activeVal) * f;
  apply('uMouse', mouseVal);
  apply('uMouseActiveFactor', activeVal);

  // Smooth uniforms
  SMOOTHED.forEach(name => {
    const t = targets[name];
    if (t === undefined) return;
    const c = (vals[name] as number) ?? t;
    if (Math.abs(t - c) < 1e-4) {
      if (vals[name] !== t) apply(name, t);
    } else {
      apply(name, c + (t - c) * Math.min(1, delta * 6));
    }
  });

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function init(offscreen: OffscreenCanvas, transparent: boolean) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    antialias: false, alpha: true, powerPreference: 'high-performance',
    depth: false, stencil: false, preserveDrawingBuffer: false
  });
  if (!gl) return;

  program = createProg();
  if (!program) return;
  gl.useProgram(program);

  if (transparent) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  (Object.keys(UNIFORM_META) as UniformName[]).forEach(n => {
    locs[n] = gl!.getUniformLocation(program!, n);
  });

  self.postMessage({ type: 'ready' });
}

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      init(data.canvas, data.transparent);
      break;
    case 'start':
      if (!running) { running = true; lastTs = 0; requestAnimationFrame(animate); }
      break;
    case 'stop':
      running = false;
      break;
    case 'resize':
      if (canvas && gl) {
        canvas.width = data.width;
        canvas.height = data.height;
        gl.viewport(0, 0, data.width, data.height);
        apply('uResolution', new Float32Array([data.width, data.height, data.width / data.height]));
      }
      break;
    case 'visibility':
      visible = data.visible;
      break;
    case 'mouse':
      mouseTarget = [data.x, data.y];
      activeTarget = data.active;
      break;
    case 'mouseLeave':
      mouseTarget = [0.5, 0.5];
      activeTarget = 0;
      break;
    case 'props':
      if (data.focal) apply('uFocal', new Float32Array(data.focal));
      if (data.rotation) apply('uRotation', new Float32Array(data.rotation));
      if (typeof data.density === 'number') targets.uDensity = data.density;
      if (typeof data.glowIntensity === 'number') targets.uGlowIntensity = data.glowIntensity;
      if (typeof data.twinkleIntensity === 'number') targets.uTwinkleIntensity = data.twinkleIntensity;
      if (typeof data.rotationSpeed === 'number') targets.uRotationSpeed = data.rotationSpeed;
      if (typeof data.repulsionStrength === 'number') targets.uRepulsionStrength = data.repulsionStrength;
      if (typeof data.autoCenterRepulsion === 'number') targets.uAutoCenterRepulsion = data.autoCenterRepulsion;
      if (typeof data.mouseRepulsion === 'boolean') apply('uMouseRepulsion', data.mouseRepulsion ? 1 : 0);
      if (typeof data.speed === 'number') { speed = data.speed; targets.uSpeed = data.speed; }
      if (typeof data.transparent === 'boolean') apply('uTransparent', data.transparent ? 1 : 0);
      if (typeof data.opacity === 'number') targets.uOpacity = data.opacity;
      if (typeof data.disableAnimation === 'boolean') disableAnim = data.disableAnimation;
      if (typeof data.starSpeed === 'number') starSpeed = data.starSpeed;
      break;
    case 'cleanup':
      running = false;
      if (gl && program) gl.deleteProgram(program);
      gl = null; canvas = null; program = null;
      break;
  }
};

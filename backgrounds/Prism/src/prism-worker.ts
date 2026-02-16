// Prism WebGL Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec2  iResolution;
uniform float iTime;

uniform float uHeight;
uniform float uBaseHalf;
uniform mat3  uRot;
uniform int   uUseBaseWobble;
uniform float uGlow;
uniform vec2  uOffsetPx;
uniform float uNoise;
uniform float uSaturation;
uniform float uScale;
uniform float uHueShift;
uniform float uColorFreq;
uniform float uBloom;
uniform float uCenterShift;
uniform float uInvBaseHalf;
uniform float uInvHeight;
uniform float uMinAxis;
uniform float uPxScale;
uniform float uTimeScale;

vec4 tanh4(vec4 x){
  vec4 e2x = exp(2.0*x);
  return (e2x - 1.0) / (e2x + 1.0);
}

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
}

float sdOctaAnisoInv(vec3 p){
  vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
  float m = q.x + q.y + q.z - 1.0;
  return m * uMinAxis * 0.5773502691896258;
}

float sdPyramidUpInv(vec3 p){
  float oct = sdOctaAnisoInv(p);
  float halfSpace = -p.y;
  return max(oct, halfSpace);
}

mat3 hueRotation(float a){
  float c = cos(a), s = sin(a);
  mat3 W = mat3(
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114
  );
  mat3 U = mat3(
     0.701, -0.587, -0.114,
    -0.299,  0.413, -0.114,
    -0.300, -0.588,  0.886
  );
  mat3 V = mat3(
     0.168, -0.331,  0.500,
     0.328,  0.035, -0.500,
    -0.497,  0.296,  0.201
  );
  return W + U * c + V * s;
}

void main(){
  vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

  float z = 5.0;
  float d = 0.0;

  vec3 p;
  vec4 o = vec4(0.0);

  float centerShift = uCenterShift;
  float cf = uColorFreq;

  mat2 wob = mat2(1.0);
  if (uUseBaseWobble == 1) {
    float t = iTime * uTimeScale;
    float c0 = cos(t + 0.0);
    float c1 = cos(t + 33.0);
    float c2 = cos(t + 11.0);
    wob = mat2(c0, c1, c2, c0);
  }

  const int STEPS = 100;
  for (int i = 0; i < STEPS; i++) {
    p = vec3(f, z);
    p.xz = p.xz * wob;
    p = uRot * p;
    vec3 q = p;
    q.y += centerShift;
    d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
    z -= d;
    o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
  }

  o = tanh4(o * o * (uGlow * uBloom) / 1e5);

  vec3 col = o.rgb;
  float n = rand(gl_FragCoord.xy + vec2(iTime));
  col += (n - 0.5) * uNoise;
  col = clamp(col, 0.0, 1.0);

  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

  if(abs(uHueShift) > 0.0001){
    col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
  }

  gl_FragColor = vec4(col, o.a);
}
`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let buffer: WebGLBuffer | null = null;

let locs: {
  iResolution: WebGLUniformLocation | null;
  iTime: WebGLUniformLocation | null;
  uHeight: WebGLUniformLocation | null;
  uBaseHalf: WebGLUniformLocation | null;
  uRot: WebGLUniformLocation | null;
  uUseBaseWobble: WebGLUniformLocation | null;
  uGlow: WebGLUniformLocation | null;
  uOffsetPx: WebGLUniformLocation | null;
  uNoise: WebGLUniformLocation | null;
  uSaturation: WebGLUniformLocation | null;
  uScale: WebGLUniformLocation | null;
  uHueShift: WebGLUniformLocation | null;
  uColorFreq: WebGLUniformLocation | null;
  uBloom: WebGLUniformLocation | null;
  uCenterShift: WebGLUniformLocation | null;
  uInvBaseHalf: WebGLUniformLocation | null;
  uInvHeight: WebGLUniformLocation | null;
  uMinAxis: WebGLUniformLocation | null;
  uPxScale: WebGLUniformLocation | null;
  uTimeScale: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let startTime = 0;
let dpr = 1;

// Props
let height = 3.5;
let baseWidth = 5.5;
let glow = 1;
let noise = 0;
let transparent = true;
let scale = 1.5;
let hueShift = 0;
let colorFrequency = 1;
let bloom = 1;
let offset = { x: 0, y: 0 };
let timeScale = 0.5;
let animationType: 'rotate' | 'hover' | '3drotate' = 'rotate';
let hoverStrength = 2;
let inertia = 0.05;

// State
let rotMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
let yaw = 0, pitch = 0, roll = 0;
let targetYaw = 0, targetPitch = 0;
let pointer = { x: 0, y: 0, inside: false };
let randomSpeeds = {
  wX: 0.3 + Math.random() * 0.6,
  wY: 0.2 + Math.random() * 0.7,
  wZ: 0.1 + Math.random() * 0.5,
  phX: Math.random() * Math.PI * 2,
  phZ: Math.random() * Math.PI * 2,
};

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

const setMat3FromEuler = (yawY: number, pitchX: number, rollZ: number, out: Float32Array) => {
  const cy = Math.cos(yawY), sy = Math.sin(yawY);
  const cx = Math.cos(pitchX), sx = Math.sin(pitchX);
  const cz = Math.cos(rollZ), sz = Math.sin(rollZ);

  out[0] = cy * cz + sy * sx * sz;
  out[1] = cx * sz;
  out[2] = -sy * cz + cy * sx * sz;
  out[3] = -cy * sz + sy * sx * cz;
  out[4] = cx * cz;
  out[5] = sy * sz + cy * sx * cz;
  out[6] = sy * cx;
  out[7] = -sx;
  out[8] = cy * cx;
  return out;
};

const updateRotationUniform = (yawVal: number, pitchVal: number, rollVal: number) => {
  setMat3FromEuler(yawVal, pitchVal, rollVal, rotMatrix);
  if (locs.uRot && gl) {
    gl.uniformMatrix3fv(locs.uRot, false, rotMatrix);
  }
};

const updateDerivedUniforms = () => {
  if (!gl) return;

  const h = Math.max(0.001, height);
  const baseHalf = Math.max(0.001, baseWidth * 0.5);
  const g = Math.max(0, glow);
  const n = Math.max(0, noise);
  const sat = transparent ? 1.5 : 1;
  const s = Math.max(0.001, scale);
  const cf = Math.max(0, colorFrequency);
  const b = Math.max(0, bloom);
  const centerShift = h * 0.25;
  const invBaseHalf = 1 / baseHalf;
  const invHeight = 1 / h;
  const minAxis = Math.min(baseHalf, h);

  if (locs.uHeight) gl.uniform1f(locs.uHeight, h);
  if (locs.uBaseHalf) gl.uniform1f(locs.uBaseHalf, baseHalf);
  if (locs.uGlow) gl.uniform1f(locs.uGlow, g);
  if (locs.uNoise) gl.uniform1f(locs.uNoise, n);
  if (locs.uSaturation) gl.uniform1f(locs.uSaturation, sat);
  if (locs.uScale) gl.uniform1f(locs.uScale, s);
  if (locs.uHueShift) gl.uniform1f(locs.uHueShift, hueShift);
  if (locs.uColorFreq) gl.uniform1f(locs.uColorFreq, cf);
  if (locs.uBloom) gl.uniform1f(locs.uBloom, b);
  if (locs.uCenterShift) gl.uniform1f(locs.uCenterShift, centerShift);
  if (locs.uInvBaseHalf) gl.uniform1f(locs.uInvBaseHalf, invBaseHalf);
  if (locs.uInvHeight) gl.uniform1f(locs.uInvHeight, invHeight);
  if (locs.uMinAxis) gl.uniform1f(locs.uMinAxis, minAxis);
  if (locs.uTimeScale) gl.uniform1f(locs.uTimeScale, timeScale);
  if (locs.uOffsetPx) gl.uniform2f(locs.uOffsetPx, offset.x * dpr, offset.y * dpr);
  if (locs.uUseBaseWobble) gl.uniform1i(locs.uUseBaseWobble, animationType === 'rotate' ? 1 : 0);

  // Update pxScale
  const heightPx = gl.drawingBufferHeight || 1;
  const pxScale = 1 / (heightPx * 0.1 * Math.max(0.001, s));
  if (locs.uPxScale) gl.uniform1f(locs.uPxScale, pxScale);
};

function animate(now: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl) return;

  const elapsed = (now - startTime) * 0.001;

  if (locs.iTime) gl.uniform1f(locs.iTime, elapsed);

  // Handle rotation based on animation type
  if (animationType === 'hover') {
    const maxPitch = 0.6 * hoverStrength;
    const maxYaw = 0.6 * hoverStrength;
    targetYaw = (pointer.inside ? -pointer.x : 0) * maxYaw;
    targetPitch = (pointer.inside ? pointer.y : 0) * maxPitch;
    yaw = lerp(yaw, targetYaw, inertia);
    pitch = lerp(pitch, targetPitch, inertia);
    roll = lerp(roll, 0, 0.1);
    updateRotationUniform(yaw, pitch, roll);
  } else if (animationType === '3drotate') {
    const tScaled = elapsed * timeScale;
    yaw = tScaled * randomSpeeds.wY;
    pitch = Math.sin(tScaled * randomSpeeds.wX + randomSpeeds.phX) * 0.6;
    roll = Math.sin(tScaled * randomSpeeds.wZ + randomSpeeds.phZ) * 0.5;
    updateRotationUniform(yaw, pitch, roll);
  } else {
    updateRotationUniform(0, 0, 0);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: transparent,
    antialias: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false
  });

  if (!gl) return;

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);

  program = createProgram_();
  if (!program) return;

  gl.useProgram(program);

  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  locs = {
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    iTime: gl.getUniformLocation(program, 'iTime'),
    uHeight: gl.getUniformLocation(program, 'uHeight'),
    uBaseHalf: gl.getUniformLocation(program, 'uBaseHalf'),
    uRot: gl.getUniformLocation(program, 'uRot'),
    uUseBaseWobble: gl.getUniformLocation(program, 'uUseBaseWobble'),
    uGlow: gl.getUniformLocation(program, 'uGlow'),
    uOffsetPx: gl.getUniformLocation(program, 'uOffsetPx'),
    uNoise: gl.getUniformLocation(program, 'uNoise'),
    uSaturation: gl.getUniformLocation(program, 'uSaturation'),
    uScale: gl.getUniformLocation(program, 'uScale'),
    uHueShift: gl.getUniformLocation(program, 'uHueShift'),
    uColorFreq: gl.getUniformLocation(program, 'uColorFreq'),
    uBloom: gl.getUniformLocation(program, 'uBloom'),
    uCenterShift: gl.getUniformLocation(program, 'uCenterShift'),
    uInvBaseHalf: gl.getUniformLocation(program, 'uInvBaseHalf'),
    uInvHeight: gl.getUniformLocation(program, 'uInvHeight'),
    uMinAxis: gl.getUniformLocation(program, 'uMinAxis'),
    uPxScale: gl.getUniformLocation(program, 'uPxScale'),
    uTimeScale: gl.getUniformLocation(program, 'uTimeScale'),
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
        startTime = performance.now();
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
        dpr = data.dpr || 1;
        gl.viewport(0, 0, data.width, data.height);
        if (locs.iResolution) {
          gl.uniform2f(locs.iResolution, data.width, data.height);
        }
        updateDerivedUniforms();
      }
      break;

    case 'pointer':
      pointer.x = data.x;
      pointer.y = data.y;
      pointer.inside = true;
      break;

    case 'pointerLeave':
      pointer.inside = false;
      break;

    case 'props':
      if (typeof data.height === 'number') height = data.height;
      if (typeof data.baseWidth === 'number') baseWidth = data.baseWidth;
      if (typeof data.glow === 'number') glow = data.glow;
      if (typeof data.noise === 'number') noise = data.noise;
      if (typeof data.transparent === 'boolean') transparent = data.transparent;
      if (typeof data.scale === 'number') scale = data.scale;
      if (typeof data.hueShift === 'number') hueShift = data.hueShift;
      if (typeof data.colorFrequency === 'number') colorFrequency = data.colorFrequency;
      if (typeof data.bloom === 'number') bloom = data.bloom;
      if (data.offset) offset = data.offset;
      if (typeof data.timeScale === 'number') timeScale = data.timeScale;
      if (data.animationType) animationType = data.animationType;
      if (typeof data.hoverStrength === 'number') hoverStrength = data.hoverStrength;
      if (typeof data.inertia === 'number') inertia = clamp(data.inertia, 0, 1);
      updateDerivedUniforms();
      break;

    case 'cleanup':
      running = false;
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
      gl = null;
      canvas = null;
      program = null;
      buffer = null;
      break;
  }
};

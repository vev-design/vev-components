// GradientBlinds WebGL Worker - Renders on OffscreenCanvas in a separate thread

const MAX_COLORS = 8;

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform float uAngle;
uniform float uNoise;
uniform float uBlindCount;
uniform float uSpotlightRadius;
uniform float uSpotlightSoftness;
uniform float uSpotlightOpacity;
uniform float uMirror;
uniform float uDistort;
uniform float uShineFlip;
uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

varying vec2 vUv;

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rotate2D(vec2 p, float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

vec3 getGradientColor(float t){
  float tt = clamp(t, 0.0, 1.0);
  int count = uColorCount;
  if (count < 2) count = 2;
  float scaled = tt * float(count - 1);
  float seg = floor(scaled);
  float f = fract(scaled);

  if (seg < 1.0) return mix(uColor0, uColor1, f);
  if (seg < 2.0 && count > 2) return mix(uColor1, uColor2, f);
  if (seg < 3.0 && count > 3) return mix(uColor2, uColor3, f);
  if (seg < 4.0 && count > 4) return mix(uColor3, uColor4, f);
  if (seg < 5.0 && count > 5) return mix(uColor4, uColor5, f);
  if (seg < 6.0 && count > 6) return mix(uColor5, uColor6, f);
  if (seg < 7.0 && count > 7) return mix(uColor6, uColor7, f);
  if (count > 7) return uColor7;
  if (count > 6) return uColor6;
  if (count > 5) return uColor5;
  if (count > 4) return uColor4;
  if (count > 3) return uColor3;
  if (count > 2) return uColor2;
  return uColor1;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv0 = fragCoord.xy / iResolution.xy;

    float aspect = iResolution.x / iResolution.y;
    vec2 p = uv0 * 2.0 - 1.0;
    p.x *= aspect;
    vec2 pr = rotate2D(p, uAngle);
    pr.x /= aspect;
    vec2 uv = pr * 0.5 + 0.5;

    vec2 uvMod = uv;
    if (uDistort > 0.0) {
      float a = uvMod.y * 6.0;
      float b = uvMod.x * 6.0;
      float w = 0.01 * uDistort;
      uvMod.x += sin(a) * w;
      uvMod.y += cos(b) * w;
    }
    float t = uvMod.x;
    if (uMirror > 0.5) {
      t = 1.0 - abs(1.0 - 2.0 * fract(t));
    }
    vec3 base = getGradientColor(t);

    vec2 offset = vec2(iMouse.x/iResolution.x, iMouse.y/iResolution.y);
    float d = length(uv0 - offset);
    float r = max(uSpotlightRadius, 1e-4);
    float dn = d / r;
    float spot = (1.0 - 2.0 * pow(dn, uSpotlightSoftness)) * uSpotlightOpacity;
    vec3 cir = vec3(spot);
    float stripe = fract(uvMod.x * max(uBlindCount, 1.0));
    if (uShineFlip > 0.5) stripe = 1.0 - stripe;
    vec3 ran = vec3(stripe);

    vec3 col = cir + base - ran;
    col += (rand(gl_FragCoord.xy + iTime) - 0.5) * uNoise;

    fragColor = vec4(col, 1.0);
}

void main() {
    vec4 color;
    mainImage(color, vUv * iResolution.xy);
    gl_FragColor = color;
}
`;

const hexToRGB = (hex: string): [number, number, number] => {
  const c = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const prepStops = (stops?: string[]) => {
  const base = (stops && stops.length ? stops : ['#FF9FFC', '#5227FF']).slice(0, MAX_COLORS);
  if (base.length === 1) base.push(base[0]);
  while (base.length < MAX_COLORS) base.push(base[base.length - 1]);
  const arr: [number, number, number][] = [];
  for (let i = 0; i < MAX_COLORS; i++) arr.push(hexToRGB(base[i]));
  const count = Math.max(2, Math.min(MAX_COLORS, stops?.length ?? 2));
  return { arr, count };
};

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;

let locs: {
  iResolution: WebGLUniformLocation | null;
  iMouse: WebGLUniformLocation | null;
  iTime: WebGLUniformLocation | null;
  uAngle: WebGLUniformLocation | null;
  uNoise: WebGLUniformLocation | null;
  uBlindCount: WebGLUniformLocation | null;
  uSpotlightRadius: WebGLUniformLocation | null;
  uSpotlightSoftness: WebGLUniformLocation | null;
  uSpotlightOpacity: WebGLUniformLocation | null;
  uMirror: WebGLUniformLocation | null;
  uDistort: WebGLUniformLocation | null;
  uShineFlip: WebGLUniformLocation | null;
  uColor0: WebGLUniformLocation | null;
  uColor1: WebGLUniformLocation | null;
  uColor2: WebGLUniformLocation | null;
  uColor3: WebGLUniformLocation | null;
  uColor4: WebGLUniformLocation | null;
  uColor5: WebGLUniformLocation | null;
  uColor6: WebGLUniformLocation | null;
  uColor7: WebGLUniformLocation | null;
  uColorCount: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let time = 0;
let lastTs = 0;
let paused = false;

// Props
let angle = 0;
let noise = 0.3;
let blindCount = 16;
let spotlightRadius = 0.5;
let spotlightSoftness = 1;
let spotlightOpacity = 1;
let mirrorGradient = false;
let distortAmount = 0;
let shineDirection: 'left' | 'right' = 'left';
let gradientColors: string[] = ['#FF9FFC', '#5227FF'];

// Smooth values
let mouseTarget: [number, number] = [0, 0];
let mouseCurrent: [number, number] = [0, 0];
let mouseDampening = 0.15;

// Interpolated uniforms
let currentAngle = 0;
let currentNoise = 0.3;
let currentBlindCount = 16;
let currentSpotlightRadius = 0.5;
let currentSpotlightSoftness = 1;
let currentSpotlightOpacity = 1;
let currentDistort = 0;

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

  if (!paused) {
    time += delta;
  }

  // Smooth mouse
  const tau = Math.max(1e-3, mouseDampening);
  const factor = 1 - Math.exp(-delta / tau);
  mouseCurrent[0] += (mouseTarget[0] - mouseCurrent[0]) * factor;
  mouseCurrent[1] += (mouseTarget[1] - mouseCurrent[1]) * factor;

  // Smooth other uniforms
  const blend = Math.min(1, delta * 6);
  const targetAngle = (angle % 360) * Math.PI / 180;
  currentAngle += (targetAngle - currentAngle) * blend;
  currentNoise += (noise - currentNoise) * blend;
  currentBlindCount += (blindCount - currentBlindCount) * blend;
  currentSpotlightRadius += (spotlightRadius - currentSpotlightRadius) * blend;
  currentSpotlightSoftness += (spotlightSoftness - currentSpotlightSoftness) * blend;
  currentSpotlightOpacity += (spotlightOpacity - currentSpotlightOpacity) * blend;
  currentDistort += (distortAmount - currentDistort) * blend;

  // Update uniforms
  if (locs.iTime) gl.uniform1f(locs.iTime, time);
  if (locs.iMouse) gl.uniform2f(locs.iMouse, mouseCurrent[0], mouseCurrent[1]);
  if (locs.uAngle) gl.uniform1f(locs.uAngle, currentAngle);
  if (locs.uNoise) gl.uniform1f(locs.uNoise, currentNoise);
  if (locs.uBlindCount) gl.uniform1f(locs.uBlindCount, Math.max(1, currentBlindCount));
  if (locs.uSpotlightRadius) gl.uniform1f(locs.uSpotlightRadius, currentSpotlightRadius);
  if (locs.uSpotlightSoftness) gl.uniform1f(locs.uSpotlightSoftness, currentSpotlightSoftness);
  if (locs.uSpotlightOpacity) gl.uniform1f(locs.uSpotlightOpacity, currentSpotlightOpacity);
  if (locs.uMirror) gl.uniform1f(locs.uMirror, mirrorGradient ? 1 : 0);
  if (locs.uDistort) gl.uniform1f(locs.uDistort, currentDistort);
  if (locs.uShineFlip) gl.uniform1f(locs.uShineFlip, shineDirection === 'right' ? 1 : 0);

  // Update colors
  const { arr, count } = prepStops(gradientColors);
  if (locs.uColor0) gl.uniform3f(locs.uColor0, arr[0][0], arr[0][1], arr[0][2]);
  if (locs.uColor1) gl.uniform3f(locs.uColor1, arr[1][0], arr[1][1], arr[1][2]);
  if (locs.uColor2) gl.uniform3f(locs.uColor2, arr[2][0], arr[2][1], arr[2][2]);
  if (locs.uColor3) gl.uniform3f(locs.uColor3, arr[3][0], arr[3][1], arr[3][2]);
  if (locs.uColor4) gl.uniform3f(locs.uColor4, arr[4][0], arr[4][1], arr[4][2]);
  if (locs.uColor5) gl.uniform3f(locs.uColor5, arr[5][0], arr[5][1], arr[5][2]);
  if (locs.uColor6) gl.uniform3f(locs.uColor6, arr[6][0], arr[6][1], arr[6][2]);
  if (locs.uColor7) gl.uniform3f(locs.uColor7, arr[7][0], arr[7][1], arr[7][2]);
  if (locs.uColorCount) gl.uniform1i(locs.uColorCount, count);

  if (!paused) {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false
  });

  if (!gl) return;

  program = createProgram_();
  if (!program) return;

  gl.useProgram(program);

  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  locs = {
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    iMouse: gl.getUniformLocation(program, 'iMouse'),
    iTime: gl.getUniformLocation(program, 'iTime'),
    uAngle: gl.getUniformLocation(program, 'uAngle'),
    uNoise: gl.getUniformLocation(program, 'uNoise'),
    uBlindCount: gl.getUniformLocation(program, 'uBlindCount'),
    uSpotlightRadius: gl.getUniformLocation(program, 'uSpotlightRadius'),
    uSpotlightSoftness: gl.getUniformLocation(program, 'uSpotlightSoftness'),
    uSpotlightOpacity: gl.getUniformLocation(program, 'uSpotlightOpacity'),
    uMirror: gl.getUniformLocation(program, 'uMirror'),
    uDistort: gl.getUniformLocation(program, 'uDistort'),
    uShineFlip: gl.getUniformLocation(program, 'uShineFlip'),
    uColor0: gl.getUniformLocation(program, 'uColor0'),
    uColor1: gl.getUniformLocation(program, 'uColor1'),
    uColor2: gl.getUniformLocation(program, 'uColor2'),
    uColor3: gl.getUniformLocation(program, 'uColor3'),
    uColor4: gl.getUniformLocation(program, 'uColor4'),
    uColor5: gl.getUniformLocation(program, 'uColor5'),
    uColor6: gl.getUniformLocation(program, 'uColor6'),
    uColor7: gl.getUniformLocation(program, 'uColor7'),
    uColorCount: gl.getUniformLocation(program, 'uColorCount'),
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
        if (locs.iResolution) {
          gl.uniform3f(locs.iResolution, data.width, data.height, 1);
        }
        // Center mouse initially
        if (!mouseTarget[0] && !mouseTarget[1]) {
          mouseTarget = [data.width / 2, data.height / 2];
          mouseCurrent = [data.width / 2, data.height / 2];
        }
      }
      break;

    case 'pointer':
      mouseTarget = [data.x, data.y];
      break;

    case 'pointerLeave':
      if (canvas) {
        mouseTarget = [canvas.width / 2, canvas.height / 2];
      }
      break;

    case 'props':
      if (typeof data.angle === 'number') angle = data.angle;
      if (typeof data.noise === 'number') noise = data.noise;
      if (typeof data.blindCount === 'number') blindCount = data.blindCount;
      if (typeof data.spotlightRadius === 'number') spotlightRadius = data.spotlightRadius;
      if (typeof data.spotlightSoftness === 'number') spotlightSoftness = data.spotlightSoftness;
      if (typeof data.spotlightOpacity === 'number') spotlightOpacity = data.spotlightOpacity;
      if (typeof data.mirrorGradient === 'boolean') mirrorGradient = data.mirrorGradient;
      if (typeof data.distortAmount === 'number') distortAmount = data.distortAmount;
      if (data.shineDirection) shineDirection = data.shineDirection;
      if (Array.isArray(data.gradientColors)) gradientColors = data.gradientColors;
      if (typeof data.mouseDampening === 'number') mouseDampening = data.mouseDampening;
      if (typeof data.paused === 'boolean') paused = data.paused;
      break;

    case 'cleanup':
      running = false;
      if (gl) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (program) gl.deleteProgram(program);
      }
      gl = null;
      canvas = null;
      program = null;
      positionBuffer = null;
      break;
  }
};

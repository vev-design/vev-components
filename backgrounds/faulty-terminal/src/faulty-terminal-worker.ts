// FaultyTerminal WebGL Worker - Renders on OffscreenCanvas in a separate thread

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

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;

  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.5;

  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);

  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  mat2 rot01 = rotate(0.1 * time);

  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = q * 0.5;
  return fbm(p + r * 0.5);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;

        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }

    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);

        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }

    p = fract(p);
    p *= uDigitSize;

    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);

    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;

    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){

    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;

    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);
    const float off = 0.002;
    float sum = digit(p + vec2(-off, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(0.0, -off)) + digit(p + vec2(0.0, off));

    vec3 baseColor = vec3(0.9) * middle + sum * 0.15 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }

    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

type UniformName = 'iTime' | 'iResolution' | 'uScale' | 'uGridMul' | 'uDigitSize' | 'uScanlineIntensity' |
  'uGlitchAmount' | 'uFlickerAmount' | 'uNoiseAmp' | 'uChromaticAberration' | 'uDither' | 'uCurvature' |
  'uTint' | 'uMouse' | 'uMouseStrength' | 'uUseMouse' | 'uPageLoadProgress' | 'uUsePageLoadAnimation' | 'uBrightness';

const UNIFORM_META: Record<UniformName, 'float' | 'vec2' | 'vec3'> = {
  iTime: 'float', iResolution: 'vec3', uScale: 'float', uGridMul: 'vec2', uDigitSize: 'float',
  uScanlineIntensity: 'float', uGlitchAmount: 'float', uFlickerAmount: 'float', uNoiseAmp: 'float',
  uChromaticAberration: 'float', uDither: 'float', uCurvature: 'float', uTint: 'vec3',
  uMouse: 'vec2', uMouseStrength: 'float', uUseMouse: 'float', uPageLoadProgress: 'float',
  uUsePageLoadAnimation: 'float', uBrightness: 'float'
};

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let locs: Record<UniformName, WebGLUniformLocation | null> = {} as any;

let running = false, visible = true, lastTs = 0;
let timeOffset = Math.random() * 100;
let frozenTime = 0;
let loadAnimationStart = 0;

// Props state
let props = {
  scale: 1,
  gridMul: [2, 1] as [number, number],
  digitSize: 1.5,
  timeScale: 0.3,
  pause: false,
  scanlineIntensity: 0.3,
  glitchAmount: 1,
  flickerAmount: 1,
  noiseAmp: 0,
  chromaticAberration: 0,
  dither: 0,
  curvature: 0.2,
  tint: [1, 1, 1] as [number, number, number],
  mouseReact: true,
  mouseStrength: 0.2,
  pageLoadAnimation: true,
  brightness: 1
};

// Mouse state
let mouseTarget: [number, number] = [0.5, 0.5];
let mouseVal: [number, number] = [0.5, 0.5];

const createShader = (type: number, src: string) => {
  const s = gl!.createShader(type);
  if (!s) return null;
  gl!.shaderSource(s, src);
  gl!.compileShader(s);
  if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
    gl!.deleteShader(s);
    return null;
  }
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
  if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
    gl!.deleteProgram(p);
    return null;
  }
  gl!.detachShader(p, vs);
  gl!.detachShader(p, fs);
  gl!.deleteShader(vs);
  gl!.deleteShader(fs);
  return p;
};

const apply = (name: UniformName, value: number | [number, number] | [number, number, number]) => {
  const loc = locs[name];
  if (!loc || !gl) return;
  const t = UNIFORM_META[name];
  if (t === 'vec2' && Array.isArray(value)) {
    gl.uniform2f(loc, value[0], value[1]);
  } else if (t === 'vec3' && Array.isArray(value)) {
    gl.uniform3f(loc, value[0], value[1], value[2]);
  } else if (typeof value === 'number') {
    gl.uniform1f(loc, value);
  }
};

function animate(ts: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl || !visible) return;

  const delta = lastTs ? (ts - lastTs) / 1000 : 1/60;
  lastTs = ts;

  // Calculate time
  let elapsed: number;
  if (props.pageLoadAnimation && loadAnimationStart === 0) {
    loadAnimationStart = ts;
  }

  if (!props.pause) {
    elapsed = ((ts * 0.001) + timeOffset) * props.timeScale;
    frozenTime = elapsed;
  } else {
    elapsed = frozenTime;
  }

  // Page load animation
  if (props.pageLoadAnimation && loadAnimationStart > 0) {
    const animationDuration = 2000;
    const animationElapsed = ts - loadAnimationStart;
    const progress = Math.min(animationElapsed / animationDuration, 1);
    apply('uPageLoadProgress', progress);
  }

  apply('iTime', elapsed);

  // Smooth mouse
  if (props.mouseReact) {
    const f = 0.08;
    mouseVal[0] += (mouseTarget[0] - mouseVal[0]) * f;
    mouseVal[1] += (mouseTarget[1] - mouseVal[1]) * f;
    apply('uMouse', mouseVal);
  }

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: false, antialias: true, powerPreference: 'high-performance',
    depth: false, stencil: false, preserveDrawingBuffer: false
  });
  if (!gl) return;

  program = createProg();
  if (!program) return;
  gl.useProgram(program);

  // Create buffers
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

  // Set up attributes
  const positionLoc = gl.getAttribLocation(program, 'aPosition');
  const uvLoc = gl.getAttribLocation(program, 'aUv');

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

  // Get uniform locations
  (Object.keys(UNIFORM_META) as UniformName[]).forEach(n => {
    locs[n] = gl!.getUniformLocation(program!, n);
  });

  gl.clearColor(0, 0, 0, 1);

  self.postMessage({ type: 'ready' });
}

function applyAllProps() {
  if (!gl) return;
  apply('uScale', props.scale);
  apply('uGridMul', props.gridMul);
  apply('uDigitSize', props.digitSize);
  apply('uScanlineIntensity', props.scanlineIntensity);
  apply('uGlitchAmount', props.glitchAmount);
  apply('uFlickerAmount', props.flickerAmount);
  apply('uNoiseAmp', props.noiseAmp);
  apply('uChromaticAberration', props.chromaticAberration);
  apply('uDither', props.dither);
  apply('uCurvature', props.curvature);
  apply('uTint', props.tint);
  apply('uMouseStrength', props.mouseStrength);
  apply('uUseMouse', props.mouseReact ? 1 : 0);
  apply('uPageLoadProgress', props.pageLoadAnimation ? 0 : 1);
  apply('uUsePageLoadAnimation', props.pageLoadAnimation ? 1 : 0);
  apply('uBrightness', props.brightness);
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
        apply('iResolution', [data.width, data.height, data.width / data.height]);
      }
      break;
    case 'visibility':
      visible = data.visible;
      break;
    case 'mouse':
      mouseTarget = [data.x, data.y];
      break;
    case 'props':
      if (typeof data.scale === 'number') props.scale = data.scale;
      if (Array.isArray(data.gridMul)) props.gridMul = data.gridMul;
      if (typeof data.digitSize === 'number') props.digitSize = data.digitSize;
      if (typeof data.timeScale === 'number') props.timeScale = data.timeScale;
      if (typeof data.pause === 'boolean') props.pause = data.pause;
      if (typeof data.scanlineIntensity === 'number') props.scanlineIntensity = data.scanlineIntensity;
      if (typeof data.glitchAmount === 'number') props.glitchAmount = data.glitchAmount;
      if (typeof data.flickerAmount === 'number') props.flickerAmount = data.flickerAmount;
      if (typeof data.noiseAmp === 'number') props.noiseAmp = data.noiseAmp;
      if (typeof data.chromaticAberration === 'number') props.chromaticAberration = data.chromaticAberration;
      if (typeof data.dither === 'number') props.dither = data.dither;
      if (typeof data.curvature === 'number') props.curvature = data.curvature;
      if (Array.isArray(data.tint)) props.tint = data.tint;
      if (typeof data.mouseReact === 'boolean') props.mouseReact = data.mouseReact;
      if (typeof data.mouseStrength === 'number') props.mouseStrength = data.mouseStrength;
      if (typeof data.pageLoadAnimation === 'boolean') props.pageLoadAnimation = data.pageLoadAnimation;
      if (typeof data.brightness === 'number') props.brightness = data.brightness;
      applyAllProps();
      break;
    case 'cleanup':
      running = false;
      if (gl && program) gl.deleteProgram(program);
      gl = null;
      canvas = null;
      program = null;
      break;
  }
};

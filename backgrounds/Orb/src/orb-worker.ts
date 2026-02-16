// Orb WebGL Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 vUv;

void main() {
  vUv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform float hue;
uniform float hover;
uniform float rot;
uniform float hoverIntensity;
varying vec2 vUv;

const vec3 BASE_COLOR1 = vec3(0.611765, 0.262745, 0.996078);
const vec3 BASE_COLOR2 = vec3(0.298039, 0.760784, 0.913725);
const vec3 BASE_COLOR3 = vec3(0.062745, 0.078431, 0.600000);
const float INNER_RADIUS = 0.6;
const float NOISE_SCALE = 0.65;
const float PI = 3.14159265;
const float INV_180 = 0.005555556;

vec3 rgb2yiq(vec3 c) {
  return vec3(
    dot(c, vec3(0.299, 0.587, 0.114)),
    dot(c, vec3(0.596, -0.274, -0.322)),
    dot(c, vec3(0.211, -0.523, 0.312))
  );
}

vec3 yiq2rgb(vec3 c) {
  return vec3(
    c.x + 0.956 * c.y + 0.621 * c.z,
    c.x - 0.272 * c.y - 0.647 * c.z,
    c.x - 1.106 * c.y + 1.703 * c.z
  );
}

vec3 adjustHue(vec3 color, float hueDeg) {
  float hueRad = hueDeg * INV_180 * PI;
  vec3 yiq = rgb2yiq(color);
  float cosA = cos(hueRad);
  float sinA = sin(hueRad);
  float i = yiq.y * cosA - yiq.z * sinA;
  float q = yiq.y * sinA + yiq.z * cosA;
  return yiq2rgb(vec3(yiq.x, i, q));
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract((p3.xxy + p3.yxx + p3.xyx) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(
    dot(d0, d0),
    dot(d1, d1),
    dot(d2, d2),
    dot(d3, d3)
  ), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

vec4 extractAlpha(vec3 colorIn) {
  float a = max(max(colorIn.r, colorIn.g), colorIn.b);
  return vec4(colorIn.rgb / (a + 1e-5), a);
}

vec4 draw(vec2 uv) {
  vec3 color1 = adjustHue(BASE_COLOR1, hue);
  vec3 color2 = adjustHue(BASE_COLOR2, hue);
  vec3 color3 = adjustHue(BASE_COLOR3, hue);

  float ang = atan(uv.y, uv.x);
  float len = length(uv);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;

  float n0 = snoise3(vec3(uv * NOISE_SCALE, iTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(mix(INNER_RADIUS, 1.0, 0.4), mix(INNER_RADIUS, 1.0, 0.6), n0);
  vec2 radialPos = uv * (r0 * invLen);
  float d0 = length(uv - radialPos);
  float v0 = 1.0 / (1.0 + d0 * 10.0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

  float a = -iTime;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = length(uv - pos);
  float v1 = 1.5 / (1.0 + d * d * 5.0);
  v1 *= 1.0 / (1.0 + d0 * 50.0);

  float v2 = smoothstep(1.0, mix(INNER_RADIUS, 1.0, n0 * 0.5), len);
  float v3 = smoothstep(INNER_RADIUS, mix(INNER_RADIUS, 1.0, 0.5), len);

  vec3 col = mix(color1, color2, cl);
  col = mix(color3, col, v0);
  col = (col + v1) * v2 * v3;
  col = clamp(col, 0.0, 1.0);

  return extractAlpha(col);
}

void main() {
  vec2 center = iResolution.xy * 0.5;
  float size = min(iResolution.x, iResolution.y);
  vec2 uv = (vUv * iResolution.xy - center) / size * 2.0;

  float s = sin(rot);
  float c = cos(rot);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  float hoverEffect = hover * hoverIntensity * 0.1;
  uv.x += hoverEffect * sin(uv.y * 10.0 + iTime);
  uv.y += hoverEffect * sin(uv.x * 10.0 + iTime);

  vec4 col = draw(uv);
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}
`;

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let uvBuffer: WebGLBuffer | null = null;

let locs: {
  iTime: WebGLUniformLocation | null;
  iResolution: WebGLUniformLocation | null;
  hue: WebGLUniformLocation | null;
  hover: WebGLUniformLocation | null;
  rot: WebGLUniformLocation | null;
  hoverIntensity: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let time = 0;
let lastTs = 0;

// Props
let hue = 0;
let hoverIntensity = 0.2;
let rotateOnHover = true;
let forceHoverState = false;

// State
let targetHover = 0;
let currentHover = 0;
let currentRot = 0;
let currentHue = 0;
let currentHoverIntensity = 0.2;
let width = 1;
let height = 1;

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
  time += delta;

  // Smooth interpolation
  const propLerpSpeed = 0.15;
  const hoverLerpSpeed = 0.25;
  const rotationSpeed = 0.3;

  currentHue += (hue - currentHue) * propLerpSpeed;
  currentHoverIntensity += (hoverIntensity - currentHoverIntensity) * propLerpSpeed;

  const effectiveHover = forceHoverState ? 1 : targetHover;
  currentHover += (effectiveHover - currentHover) * hoverLerpSpeed;

  if (rotateOnHover && effectiveHover > 0.5) {
    currentRot += delta * rotationSpeed;
  }

  // Update uniforms
  if (locs.iTime) gl.uniform1f(locs.iTime, time);
  if (locs.hue) gl.uniform1f(locs.hue, currentHue);
  if (locs.hover) gl.uniform1f(locs.hover, currentHover);
  if (locs.rot) gl.uniform1f(locs.rot, currentRot);
  if (locs.hoverIntensity) gl.uniform1f(locs.hoverIntensity, currentHoverIntensity);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: false
  });

  if (!gl) return;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  program = createProgram_();
  if (!program) return;

  gl.useProgram(program);

  const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
  const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);

  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  const uvLoc = gl.getAttribLocation(program, 'a_uv');
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

  locs = {
    iTime: gl.getUniformLocation(program, 'iTime'),
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    hue: gl.getUniformLocation(program, 'hue'),
    hover: gl.getUniformLocation(program, 'hover'),
    rot: gl.getUniformLocation(program, 'rot'),
    hoverIntensity: gl.getUniformLocation(program, 'hoverIntensity'),
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
        width = data.width;
        height = data.height;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        if (locs.iResolution) {
          gl.uniform3f(locs.iResolution, width, height, width / height);
        }
      }
      break;

    case 'hover':
      targetHover = data.hover;
      break;

    case 'props':
      if (typeof data.hue === 'number') hue = data.hue;
      if (typeof data.hoverIntensity === 'number') hoverIntensity = data.hoverIntensity;
      if (typeof data.rotateOnHover === 'boolean') rotateOnHover = data.rotateOnHover;
      if (typeof data.forceHoverState === 'boolean') forceHoverState = data.forceHoverState;
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

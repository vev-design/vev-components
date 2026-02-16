// Particles WebGL Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `
attribute vec3 position;
attribute vec4 random;
attribute vec3 color;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uTime;
uniform float uSpread;
uniform float uBaseSize;
uniform float uSizeRandomness;

varying vec4 vRandom;
varying vec3 vColor;

void main() {
  vRandom = random;
  vColor = color;

  vec3 pos = position * uSpread;
  pos.z *= 10.0;

  vec4 mPos = uModelMatrix * vec4(pos, 1.0);
  float t = uTime;
  mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
  mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
  mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

  vec4 mvPos = uViewMatrix * mPos;
  if (uSizeRandomness == 0.0) {
    gl_PointSize = uBaseSize;
  } else {
    gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / max(length(mvPos.xyz), 0.0001);
  }

  gl_Position = uProjectionMatrix * mvPos;
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform float uAlphaParticles;
varying vec4 vRandom;
varying vec3 vColor;

void main() {
  vec2 uv = gl_PointCoord.xy;
  float d = length(uv - vec2(0.5));

  if(uAlphaParticles < 0.5) {
    if(d > 0.5) {
      discard;
    }
    gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
  } else {
    float circle = smoothstep(0.5, 0.4, d) * 0.8;
    gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
  }
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

const defaultColors: string[] = ['#ffffff', '#ffffff', '#ffffff'];

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let randomBuffer: WebGLBuffer | null = null;
let colorBuffer: WebGLBuffer | null = null;

let locs: {
  uModelMatrix: WebGLUniformLocation | null;
  uViewMatrix: WebGLUniformLocation | null;
  uProjectionMatrix: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uSpread: WebGLUniformLocation | null;
  uBaseSize: WebGLUniformLocation | null;
  uSizeRandomness: WebGLUniformLocation | null;
  uAlphaParticles: WebGLUniformLocation | null;
} = {} as any;

let attribs: {
  position: number;
  random: number;
  color: number;
} = {} as any;

let running = false;
let time = 0;
let lastTs = 0;
let particleCount = 0;

// Props
let spread = 10;
let speed = 0.1;
let baseSize = 100;
let sizeRandomness = 1;
let alphaParticles = false;
let cameraDistance = 20;
let disableRotation = false;
let moveParticlesOnHover = false;
let hoverFactor = 1;
let colors: string[] = defaultColors;

// State
let pointer = { x: 0, y: 0, inside: false };
let viewMatrix = new Float32Array(16);
let projectionMatrix = new Float32Array(16);
let modelMatrix = new Float32Array(16);
let elapsed = 0;

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

const mat4Perspective = (out: Float32Array, fov: number, aspect: number, near: number, far: number) => {
  const f = 1.0 / Math.tan(fov / 2);
  out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = (far + near) / (near - far); out[11] = -1;
  out[12] = 0; out[13] = 0; out[14] = (2 * far * near) / (near - far); out[15] = 0;
};

const mat4LookAt = (out: Float32Array, eye: [number, number, number], center: [number, number, number], up: [number, number, number]) => {
  let x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, z0: number, z1: number, z2: number;
  z0 = eye[0] - center[0]; z1 = eye[1] - center[1]; z2 = eye[2] - center[2];
  let len = Math.hypot(z0, z1, z2);
  if (len === 0) { z2 = 1; } else { z0 /= len; z1 /= len; z2 /= len; }
  x0 = up[1] * z2 - up[2] * z1; x1 = up[2] * z0 - up[0] * z2; x2 = up[0] * z1 - up[1] * z0;
  len = Math.hypot(x0, x1, x2);
  if (len === 0) { x0 = 0; x1 = 0; x2 = 0; } else { x0 /= len; x1 /= len; x2 /= len; }
  y0 = z1 * x2 - z2 * x1; y1 = z2 * x0 - z0 * x2; y2 = z0 * x1 - z1 * x0;
  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  out[15] = 1;
};

const composeModelMatrix = (out: Float32Array, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number) => {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  out[0] = cz * cy; out[1] = cz * sy * sx - sz * cx; out[2] = cz * sy * cx + sz * sx; out[3] = 0;
  out[4] = sz * cy; out[5] = sz * sy * sx + cz * cx; out[6] = sz * sy * cx - cz * sx; out[7] = 0;
  out[8] = -sy; out[9] = cy * sx; out[10] = cy * cx; out[11] = 0;
  out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
};

const computeProjection = () => {
  if (!gl) return;
  const aspect = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight);
  mat4Perspective(projectionMatrix, (15 * Math.PI) / 180, aspect, 0.1, 100);
  if (locs.uProjectionMatrix) gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);
  mat4LookAt(viewMatrix, [0, 0, cameraDistance], [0, 0, 0], [0, 1, 0]);
  if (locs.uViewMatrix) gl.uniformMatrix4fv(locs.uViewMatrix, false, viewMatrix);
};

const updateModelMatrix = (t: number) => {
  if (!gl) return;
  const tx = moveParticlesOnHover && pointer.inside ? -pointer.x * hoverFactor : 0;
  const ty = moveParticlesOnHover && pointer.inside ? -pointer.y * hoverFactor : 0;
  const tz = 0;
  let rx = 0, ry = 0, rz = 0;
  if (!disableRotation) {
    rx = Math.sin(t * 0.2) * 0.1;
    ry = Math.cos(t * 0.5) * 0.15;
    rz = t * speed * 0.6;
  }
  composeModelMatrix(modelMatrix, tx, ty, tz, rx, ry, rz);
  if (locs.uModelMatrix) gl.uniformMatrix4fv(locs.uModelMatrix, false, modelMatrix);
};

const rebuildParticles = (count: number, colorsInput: string[]) => {
  if (!gl) return;
  const validCount = Math.max(0, Math.floor(count));
  if (validCount === 0) {
    particleCount = 0;
    return;
  }

  particleCount = validCount;
  const positions = new Float32Array(validCount * 3);
  const randoms = new Float32Array(validCount * 4);
  const colorData = new Float32Array(validCount * 3);
  const palette = (colorsInput && colorsInput.length ? colorsInput : defaultColors).map(hexToRgb);

  for (let i = 0; i < validCount; i++) {
    let x: number, y: number, z: number, len: number;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      len = x * x + y * y + z * z;
    } while (len > 1 || len === 0);
    const r = Math.cbrt(Math.random());
    positions[i * 3] = x * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = z * r;
    randoms[i * 4] = Math.random();
    randoms[i * 4 + 1] = Math.random();
    randoms[i * 4 + 2] = Math.random();
    randoms[i * 4 + 3] = Math.random();
    const col = palette[Math.floor(Math.random() * palette.length)];
    colorData[i * 3] = col[0];
    colorData[i * 3 + 1] = col[1];
    colorData[i * 3 + 2] = col[2];
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(attribs.position);
  gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, randomBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, randoms, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(attribs.random);
  gl.vertexAttribPointer(attribs.random, 4, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(attribs.color);
  gl.vertexAttribPointer(attribs.color, 3, gl.FLOAT, false, 0, 0);
};

function animate(ts: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl || particleCount <= 0) return;

  const delta = lastTs ? (ts - lastTs) : 16.67;
  lastTs = ts;
  elapsed += delta * speed;
  time = elapsed * 0.001;

  if (locs.uTime) gl.uniform1f(locs.uTime, time);
  if (locs.uSpread) gl.uniform1f(locs.uSpread, spread);
  if (locs.uBaseSize) gl.uniform1f(locs.uBaseSize, baseSize);
  if (locs.uSizeRandomness) gl.uniform1f(locs.uSizeRandomness, sizeRandomness);
  if (locs.uAlphaParticles) gl.uniform1f(locs.uAlphaParticles, alphaParticles ? 1 : 0);

  updateModelMatrix(time);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, particleCount);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false
  });

  if (!gl) return;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  program = createProgram_();
  if (!program) return;

  gl.useProgram(program);

  positionBuffer = gl.createBuffer();
  randomBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();

  attribs = {
    position: gl.getAttribLocation(program, 'position'),
    random: gl.getAttribLocation(program, 'random'),
    color: gl.getAttribLocation(program, 'color'),
  };

  locs = {
    uModelMatrix: gl.getUniformLocation(program, 'uModelMatrix'),
    uViewMatrix: gl.getUniformLocation(program, 'uViewMatrix'),
    uProjectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uSpread: gl.getUniformLocation(program, 'uSpread'),
    uBaseSize: gl.getUniformLocation(program, 'uBaseSize'),
    uSizeRandomness: gl.getUniformLocation(program, 'uSizeRandomness'),
    uAlphaParticles: gl.getUniformLocation(program, 'uAlphaParticles'),
  };

  viewMatrix = new Float32Array(16);
  projectionMatrix = new Float32Array(16);
  modelMatrix = new Float32Array(16);

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
        computeProjection();
      }
      break;

    case 'pointer':
      pointer.x = data.x;
      pointer.y = data.y;
      pointer.inside = data.inside;
      break;

    case 'pointerLeave':
      pointer.inside = false;
      break;

    case 'rebuild':
      rebuildParticles(data.count, data.colors);
      computeProjection();
      break;

    case 'props':
      if (typeof data.spread === 'number') spread = data.spread;
      if (typeof data.speed === 'number') speed = data.speed;
      if (typeof data.baseSize === 'number') baseSize = data.baseSize;
      if (typeof data.sizeRandomness === 'number') sizeRandomness = data.sizeRandomness;
      if (typeof data.alphaParticles === 'boolean') alphaParticles = data.alphaParticles;
      if (typeof data.cameraDistance === 'number') {
        cameraDistance = data.cameraDistance;
        computeProjection();
      }
      if (typeof data.disableRotation === 'boolean') disableRotation = data.disableRotation;
      if (typeof data.moveParticlesOnHover === 'boolean') moveParticlesOnHover = data.moveParticlesOnHover;
      if (typeof data.hoverFactor === 'number') hoverFactor = data.hoverFactor;
      if (Array.isArray(data.colors)) colors = data.colors;
      break;

    case 'cleanup':
      running = false;
      if (gl) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (randomBuffer) gl.deleteBuffer(randomBuffer);
        if (colorBuffer) gl.deleteBuffer(colorBuffer);
        if (program) gl.deleteProgram(program);
      }
      gl = null;
      canvas = null;
      program = null;
      positionBuffer = null;
      randomBuffer = null;
      colorBuffer = null;
      break;
  }
};

// Iridescence WebGL Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

const TRIANGLE_VERTICES = new Float32Array([
  -1, -1, 0, 0,
  3, -1, 2, 0,
  -1, 3, 0, 2,
]);

type UniformName = 'uTime' | 'uColor' | 'uResolution' | 'uMouse' | 'uAmplitude' | 'uSpeed';

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let buffer: WebGLBuffer | null = null;
let locs: Record<UniformName, WebGLUniformLocation | null> = {} as any;

let running = false;
let time = 0;
let lastTs = 0;

// Current values
let color: [number, number, number] = [1, 1, 1];
let speed = 1;
let amplitude = 0.1;
let mouseTarget: [number, number] = [0.5, 0.5];
let mouseVal: [number, number] = [0.5, 0.5];

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

const createProgram = (): WebGLProgram | null => {
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

  // Smooth mouse
  const f = 1 - Math.exp(-delta / 0.15);
  mouseVal[0] += (mouseTarget[0] - mouseVal[0]) * f;
  mouseVal[1] += (mouseTarget[1] - mouseVal[1]) * f;

  if (locs.uTime) gl.uniform1f(locs.uTime, time);
  if (locs.uMouse) gl.uniform2f(locs.uMouse, mouseVal[0], mouseVal[1]);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false
  });

  if (!gl) return;

  program = createProgram();
  if (!program) return;

  gl.useProgram(program);

  buffer = gl.createBuffer();
  if (!buffer) return;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'position');
  const uvLoc = gl.getAttribLocation(program, 'uv');
  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;

  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

  locs = {
    uTime: gl.getUniformLocation(program, 'uTime'),
    uColor: gl.getUniformLocation(program, 'uColor'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uMouse: gl.getUniformLocation(program, 'uMouse'),
    uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
  };

  // Set initial values
  if (locs.uColor) gl.uniform3f(locs.uColor, color[0], color[1], color[2]);
  if (locs.uAmplitude) gl.uniform1f(locs.uAmplitude, amplitude);
  if (locs.uSpeed) gl.uniform1f(locs.uSpeed, speed);
  if (locs.uMouse) gl.uniform2f(locs.uMouse, 0.5, 0.5);

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
          gl.uniform3f(locs.uResolution, data.width, data.height, data.width / data.height);
        }
      }
      break;

    case 'mouse':
      mouseTarget = [data.x, data.y];
      break;

    case 'props':
      if (gl) {
        if (data.color && locs.uColor) {
          color = data.color;
          gl.uniform3f(locs.uColor, color[0], color[1], color[2]);
        }
        if (typeof data.amplitude === 'number' && locs.uAmplitude) {
          amplitude = data.amplitude;
          gl.uniform1f(locs.uAmplitude, amplitude);
        }
        if (typeof data.speed === 'number' && locs.uSpeed) {
          speed = data.speed;
          gl.uniform1f(locs.uSpeed, speed);
        }
      }
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

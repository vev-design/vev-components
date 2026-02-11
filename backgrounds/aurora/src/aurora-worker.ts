// Aurora WebGL2 Worker - Renders on OffscreenCanvas in a separate thread

const VERT = `#version 300 es
in vec2 position;
out vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.54;
  gl_Position = vec4(position, 0.0, 0.8);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform vec2 uPointer;

in vec2 vUv;
out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 pointerNdc = uPointer / max(uResolution, vec2(1.0));
  vec2 parallax = (pointerNdc - 0.5) * vec2(0.08, 0.05);
  vec2 uv = vUv + parallax;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, fract(uv.x + 10.0), rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

let canvas: OffscreenCanvas | null = null;
let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;

interface Uniforms {
  uTime: WebGLUniformLocation | null;
  uAmplitude: WebGLUniformLocation | null;
  uBlend: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uPointer: WebGLUniformLocation | null;
  uColorStops: WebGLUniformLocation | null;
}

let locs: Uniforms = {
  uTime: null, uAmplitude: null, uBlend: null,
  uResolution: null, uPointer: null, uColorStops: null
};

let running = false, visible = true, lastTs = 0;
let logicalTime = 0;

// Props state
let speed = 1.0;
let amplitudeTarget = 1.0, amplitudeVal = 1.0;
let blendTarget = 0.5, blendVal = 0.5;
let colorStops = new Float32Array([0.322, 0.153, 1.0, 0.486, 1.0, 0.404, 0.322, 0.153, 1.0]);

// Pointer state
let pointerTarget: [number, number] = [0, 0];
let pointerVal: [number, number] = [0, 0];
let resolution: [number, number] = [1, 1];

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
  const vs = createShader(gl!.VERTEX_SHADER, VERT);
  const fs = createShader(gl!.FRAGMENT_SHADER, FRAG);
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

function animate(ts: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl || !visible) return;

  const delta = lastTs ? (ts - lastTs) / 1000 : 1/60;
  lastTs = ts;

  // Update time
  logicalTime += delta;
  gl.uniform1f(locs.uTime, logicalTime * speed);

  // Smooth pointer
  const pointerDamp = 0.2;
  const tau = Math.max(1e-3, pointerDamp);
  const factor = 1 - Math.exp(-delta / tau);
  pointerVal[0] += (pointerTarget[0] - pointerVal[0]) * factor;
  pointerVal[1] += (pointerTarget[1] - pointerVal[1]) * factor;
  gl.uniform2f(locs.uPointer, pointerVal[0], pointerVal[1]);

  // Smooth amplitude and blend
  const blendFactor = Math.min(1, delta * 6);
  if (Math.abs(amplitudeTarget - amplitudeVal) > 1e-4) {
    amplitudeVal += (amplitudeTarget - amplitudeVal) * blendFactor;
    gl.uniform1f(locs.uAmplitude, amplitudeVal);
  }
  if (Math.abs(blendTarget - blendVal) > 1e-4) {
    blendVal += (blendTarget - blendVal) * blendFactor;
    gl.uniform1f(locs.uBlend, blendVal);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl2', {
    alpha: true, antialias: true, powerPreference: 'high-performance',
    depth: false, stencil: false, preserveDrawingBuffer: false
  });
  if (!gl) return;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  program = createProg();
  if (!program) return;
  gl.useProgram(program);

  // Create buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // Get uniform locations
  locs.uTime = gl.getUniformLocation(program, 'uTime');
  locs.uAmplitude = gl.getUniformLocation(program, 'uAmplitude');
  locs.uBlend = gl.getUniformLocation(program, 'uBlend');
  locs.uResolution = gl.getUniformLocation(program, 'uResolution');
  locs.uPointer = gl.getUniformLocation(program, 'uPointer');
  locs.uColorStops = gl.getUniformLocation(program, 'uColorStops[0]');

  // Set initial uniforms
  gl.uniform1f(locs.uAmplitude, amplitudeVal);
  gl.uniform1f(locs.uBlend, blendVal);
  gl.uniform3fv(locs.uColorStops, colorStops);

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
        resolution = [data.width, data.height];
        gl.viewport(0, 0, data.width, data.height);
        gl.uniform2f(locs.uResolution, data.width, data.height);
        // Initialize pointer to center if not set
        if (pointerTarget[0] === 0 && pointerTarget[1] === 0) {
          pointerTarget = [data.width / 2, data.height / 2];
          pointerVal = [data.width / 2, data.height / 2];
        }
      }
      break;
    case 'visibility':
      visible = data.visible;
      break;
    case 'mouse':
      pointerTarget = [data.x * resolution[0], (1 - data.y) * resolution[1]];
      break;
    case 'props':
      if (typeof data.amplitude === 'number') amplitudeTarget = data.amplitude;
      if (typeof data.blend === 'number') blendTarget = data.blend;
      if (typeof data.speed === 'number') speed = data.speed;
      if (data.colorStops instanceof Float32Array) {
        colorStops = data.colorStops;
        if (gl && locs.uColorStops) {
          gl.uniform3fv(locs.uColorStops, colorStops);
        }
      }
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

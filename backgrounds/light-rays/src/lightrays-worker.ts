// LightRays WebGL Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `
attribute vec2 a_position;
varying vec2 vUv;

void main() {
  vUv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform vec2 rayPos;
uniform vec2 rayDir;
uniform vec3 raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2 mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float dist = length(sourceToCoord);
  vec2 dirNorm = sourceToCoord / max(dist, 0.0001);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + dist * 0.01) * 0.2;

  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - dist) / maxDistance, 0.0, 1.0);

  float fadeDist = iResolution.x * fadeDistance;
  float fadeFalloff = clamp((fadeDist - dist) / fadeDist, 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  vec4 fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
  gl_FragColor = fragColor;
}
`;

type RaysOrigin = 'top-center' | 'top-left' | 'top-right' | 'right' | 'left' | 'bottom-center' | 'bottom-right' | 'bottom-left';

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (origin: RaysOrigin, w: number, h: number): { anchor: [number, number]; dir: [number, number] } => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left': return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right': return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left': return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right': return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left': return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center': return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right': return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let buffer: WebGLBuffer | null = null;

let locs: {
  iTime: WebGLUniformLocation | null;
  iResolution: WebGLUniformLocation | null;
  rayPos: WebGLUniformLocation | null;
  rayDir: WebGLUniformLocation | null;
  raysColor: WebGLUniformLocation | null;
  raysSpeed: WebGLUniformLocation | null;
  lightSpread: WebGLUniformLocation | null;
  rayLength: WebGLUniformLocation | null;
  pulsating: WebGLUniformLocation | null;
  fadeDistance: WebGLUniformLocation | null;
  saturation: WebGLUniformLocation | null;
  mousePos: WebGLUniformLocation | null;
  mouseInfluence: WebGLUniformLocation | null;
  noiseAmount: WebGLUniformLocation | null;
  distortion: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let time = 0;
let lastTs = 0;

// Current values with smooth interpolation
let width = 1;
let height = 1;
let raysOrigin: RaysOrigin = 'top-center';

let current = {
  raysColor: [1, 1, 1] as [number, number, number],
  raysSpeed: 1,
  lightSpread: 1,
  rayLength: 2,
  pulsating: 0,
  fadeDistance: 1,
  saturation: 1,
  mouseInfluence: 0.1,
  noiseAmount: 0,
  distortion: 0,
  rayPos: [0, 0] as [number, number],
  rayDir: [0, 1] as [number, number],
};

let target = { ...current, raysColor: [...current.raysColor] as [number, number, number], rayPos: [...current.rayPos] as [number, number], rayDir: [...current.rayDir] as [number, number] };

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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function animate(ts: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl) return;

  const delta = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
  lastTs = ts;
  time += delta;

  const lerpSpeed = 0.15;
  const mouseSmoothing = 0.88;

  // Smooth interpolate all values
  current.raysColor[0] = lerp(current.raysColor[0], target.raysColor[0], lerpSpeed);
  current.raysColor[1] = lerp(current.raysColor[1], target.raysColor[1], lerpSpeed);
  current.raysColor[2] = lerp(current.raysColor[2], target.raysColor[2], lerpSpeed);
  current.raysSpeed = lerp(current.raysSpeed, target.raysSpeed, lerpSpeed);
  current.lightSpread = lerp(current.lightSpread, target.lightSpread, lerpSpeed);
  current.rayLength = lerp(current.rayLength, target.rayLength, lerpSpeed);
  current.pulsating = lerp(current.pulsating, target.pulsating, lerpSpeed);
  current.fadeDistance = lerp(current.fadeDistance, target.fadeDistance, lerpSpeed);
  current.saturation = lerp(current.saturation, target.saturation, lerpSpeed);
  current.mouseInfluence = lerp(current.mouseInfluence, target.mouseInfluence, lerpSpeed);
  current.noiseAmount = lerp(current.noiseAmount, target.noiseAmount, lerpSpeed);
  current.distortion = lerp(current.distortion, target.distortion, lerpSpeed);
  current.rayPos[0] = lerp(current.rayPos[0], target.rayPos[0], lerpSpeed);
  current.rayPos[1] = lerp(current.rayPos[1], target.rayPos[1], lerpSpeed);
  current.rayDir[0] = lerp(current.rayDir[0], target.rayDir[0], lerpSpeed);
  current.rayDir[1] = lerp(current.rayDir[1], target.rayDir[1], lerpSpeed);

  // Smooth mouse
  mouseVal[0] = mouseVal[0] * mouseSmoothing + mouseTarget[0] * (1 - mouseSmoothing);
  mouseVal[1] = mouseVal[1] * mouseSmoothing + mouseTarget[1] * (1 - mouseSmoothing);

  // Update uniforms
  if (locs.iTime) gl.uniform1f(locs.iTime, time);
  if (locs.raysColor) gl.uniform3f(locs.raysColor, current.raysColor[0], current.raysColor[1], current.raysColor[2]);
  if (locs.raysSpeed) gl.uniform1f(locs.raysSpeed, current.raysSpeed);
  if (locs.lightSpread) gl.uniform1f(locs.lightSpread, current.lightSpread);
  if (locs.rayLength) gl.uniform1f(locs.rayLength, current.rayLength);
  if (locs.pulsating) gl.uniform1f(locs.pulsating, current.pulsating);
  if (locs.fadeDistance) gl.uniform1f(locs.fadeDistance, current.fadeDistance);
  if (locs.saturation) gl.uniform1f(locs.saturation, current.saturation);
  if (locs.mouseInfluence) gl.uniform1f(locs.mouseInfluence, current.mouseInfluence);
  if (locs.noiseAmount) gl.uniform1f(locs.noiseAmount, current.noiseAmount);
  if (locs.distortion) gl.uniform1f(locs.distortion, current.distortion);
  if (locs.rayPos) gl.uniform2f(locs.rayPos, current.rayPos[0], current.rayPos[1]);
  if (locs.rayDir) gl.uniform2f(locs.rayDir, current.rayDir[0], current.rayDir[1]);
  if (locs.mousePos) gl.uniform2f(locs.mousePos, mouseVal[0], mouseVal[1]);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
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

  buffer = gl.createBuffer();
  if (!buffer) return;

  const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  locs = {
    iTime: gl.getUniformLocation(program, 'iTime'),
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    rayPos: gl.getUniformLocation(program, 'rayPos'),
    rayDir: gl.getUniformLocation(program, 'rayDir'),
    raysColor: gl.getUniformLocation(program, 'raysColor'),
    raysSpeed: gl.getUniformLocation(program, 'raysSpeed'),
    lightSpread: gl.getUniformLocation(program, 'lightSpread'),
    rayLength: gl.getUniformLocation(program, 'rayLength'),
    pulsating: gl.getUniformLocation(program, 'pulsating'),
    fadeDistance: gl.getUniformLocation(program, 'fadeDistance'),
    saturation: gl.getUniformLocation(program, 'saturation'),
    mousePos: gl.getUniformLocation(program, 'mousePos'),
    mouseInfluence: gl.getUniformLocation(program, 'mouseInfluence'),
    noiseAmount: gl.getUniformLocation(program, 'noiseAmount'),
    distortion: gl.getUniformLocation(program, 'distortion'),
  };

  self.postMessage({ type: 'ready' });
}

function updateRayPosDir() {
  const { anchor, dir } = getAnchorAndDir(raysOrigin, width, height);
  target.rayPos = anchor;
  target.rayDir = dir;
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
          gl.uniform2f(locs.iResolution, width, height);
        }
        updateRayPosDir();
      }
      break;

    case 'mouse':
      mouseTarget = [data.x, data.y];
      break;

    case 'props':
      if (data.raysColor) target.raysColor = hexToRgb(data.raysColor);
      if (typeof data.raysSpeed === 'number') target.raysSpeed = data.raysSpeed;
      if (typeof data.lightSpread === 'number') target.lightSpread = data.lightSpread;
      if (typeof data.rayLength === 'number') target.rayLength = data.rayLength;
      if (typeof data.pulsating === 'boolean') target.pulsating = data.pulsating ? 1 : 0;
      if (typeof data.fadeDistance === 'number') target.fadeDistance = data.fadeDistance;
      if (typeof data.saturation === 'number') target.saturation = data.saturation;
      if (typeof data.mouseInfluence === 'number') target.mouseInfluence = data.mouseInfluence;
      if (typeof data.noiseAmount === 'number') target.noiseAmount = data.noiseAmount;
      if (typeof data.distortion === 'number') target.distortion = data.distortion;
      if (data.raysOrigin) {
        raysOrigin = data.raysOrigin;
        updateRayPosDir();
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

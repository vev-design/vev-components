// FloatingLines WebGL Worker - Renders on OffscreenCanvas in a separate thread

const MAX_GRADIENT_STOPS = 8;

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
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;

  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int maxIdx = lineGradientCount - 1;
    int idx2 = (idx + 1 > maxIdx) ? maxIdx : (idx + 1);

    vec3 c1, c2;
    if (idx == 0) c1 = lineGradient[0];
    else if (idx == 1) c1 = lineGradient[1];
    else if (idx == 2) c1 = lineGradient[2];
    else if (idx == 3) c1 = lineGradient[3];
    else if (idx == 4) c1 = lineGradient[4];
    else if (idx == 5) c1 = lineGradient[5];
    else if (idx == 6) c1 = lineGradient[6];
    else c1 = lineGradient[7];

    if (idx2 == 0) c2 = lineGradient[0];
    else if (idx2 == 1) c2 = lineGradient[1];
    else if (idx2 == 2) c2 = lineGradient[2];
    else if (idx2 == 3) c2 = lineGradient[3];
    else if (idx2 == 4) c2 = lineGradient[4];
    else if (idx2 == 5) c2 = lineGradient[5];
    else if (idx2 == 6) c2 = lineGradient[6];
    else c2 = lineGradient[7];

    gradientColor = mix(c1, c2, f);
  }

  return gradientColor * 0.5;
}

  float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;

  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);

  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  if (enableBottom) {
    for (int i = 0; i < 10; ++i) {
      if (i < bottomLineCount) {
        float fi = float(i);
        float t = fi / max(float(bottomLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);

        float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        col += lineCol * wave(
          ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
          1.5 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        ) * 0.2;
      }
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < 10; ++i) {
      if (i < middleLineCount) {
        float fi = float(i);
        float t = fi / max(float(middleLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);

        float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        col += lineCol * wave(
          ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
          2.0 + 0.15 * fi,
          baseUv,
          mouseUv,
          interactive
        );
      }
    }
  }

  if (enableTop) {
    for (int i = 0; i < 10; ++i) {
      if (i < topLineCount) {
        float fi = float(i);
        float t = fi / max(float(topLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);

        float angle = topWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        ruv.x *= -1.0;
        col += lineCol * wave(
          ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
          1.0 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        ) * 0.1;
      }
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const hexToVec3 = (hex: string): [number, number, number] => {
  let value = hex.trim();
  if (value.startsWith('#')) value = value.slice(1);
  let r = 255, g = 255, b = 255;
  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }
  return [r / 255, g / 255, b / 255];
};

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let uvBuffer: WebGLBuffer | null = null;

let locs: {
  iTime: WebGLUniformLocation | null;
  iResolution: WebGLUniformLocation | null;
  animationSpeed: WebGLUniformLocation | null;
  enableTop: WebGLUniformLocation | null;
  enableMiddle: WebGLUniformLocation | null;
  enableBottom: WebGLUniformLocation | null;
  topLineCount: WebGLUniformLocation | null;
  middleLineCount: WebGLUniformLocation | null;
  bottomLineCount: WebGLUniformLocation | null;
  topLineDistance: WebGLUniformLocation | null;
  middleLineDistance: WebGLUniformLocation | null;
  bottomLineDistance: WebGLUniformLocation | null;
  topWavePosition: WebGLUniformLocation | null;
  middleWavePosition: WebGLUniformLocation | null;
  bottomWavePosition: WebGLUniformLocation | null;
  iMouse: WebGLUniformLocation | null;
  interactive: WebGLUniformLocation | null;
  bendRadius: WebGLUniformLocation | null;
  bendStrength: WebGLUniformLocation | null;
  bendInfluence: WebGLUniformLocation | null;
  parallax: WebGLUniformLocation | null;
  parallaxStrength: WebGLUniformLocation | null;
  parallaxOffset: WebGLUniformLocation | null;
  lineGradient: WebGLUniformLocation | null;
  lineGradientCount: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let time = 0;
let lastTs = 0;

// Props
let animationSpeed = 1;
let enabledWaves: string[] = ['top', 'middle', 'bottom'];
let lineCount = 6;
let lineDistance = 5;
let topWavePosition = { x: 10.0, y: 0.5, rotate: -0.4 };
let middleWavePosition = { x: 5.0, y: 0.0, rotate: 0.2 };
let bottomWavePosition = { x: 2.0, y: -0.7, rotate: 0.4 };
let interactive = true;
let bendRadius = 5.0;
let bendStrength = -0.5;
let parallax = true;
let parallaxStrength = 0.2;
let linesGradient: string[] = [];

// State
let mouseTarget = { x: -1000, y: -1000 };
let mouseCurrent = { x: -1000, y: -1000 };
let targetInfluence = 0;
let currentInfluence = 0;
let parallaxTarget = { x: 0, y: 0 };
let parallaxCurrent = { x: 0, y: 0 };
let mouseDamping = 0.05;

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

  // Smooth mouse
  const amt = Math.min(1, mouseDamping);
  mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * amt;
  mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * amt;
  currentInfluence += (targetInfluence - currentInfluence) * amt;
  parallaxCurrent.x += (parallaxTarget.x - parallaxCurrent.x) * amt;
  parallaxCurrent.y += (parallaxTarget.y - parallaxCurrent.y) * amt;

  // Update uniforms
  if (locs.iTime) gl.uniform1f(locs.iTime, time);
  if (locs.animationSpeed) gl.uniform1f(locs.animationSpeed, animationSpeed);

  if (locs.enableTop) gl.uniform1i(locs.enableTop, enabledWaves.includes('top') ? 1 : 0);
  if (locs.enableMiddle) gl.uniform1i(locs.enableMiddle, enabledWaves.includes('middle') ? 1 : 0);
  if (locs.enableBottom) gl.uniform1i(locs.enableBottom, enabledWaves.includes('bottom') ? 1 : 0);

  if (locs.topLineCount) gl.uniform1i(locs.topLineCount, enabledWaves.includes('top') ? lineCount : 0);
  if (locs.middleLineCount) gl.uniform1i(locs.middleLineCount, enabledWaves.includes('middle') ? lineCount : 0);
  if (locs.bottomLineCount) gl.uniform1i(locs.bottomLineCount, enabledWaves.includes('bottom') ? lineCount : 0);

  const dist = lineDistance * 0.01;
  if (locs.topLineDistance) gl.uniform1f(locs.topLineDistance, dist);
  if (locs.middleLineDistance) gl.uniform1f(locs.middleLineDistance, dist);
  if (locs.bottomLineDistance) gl.uniform1f(locs.bottomLineDistance, dist);

  if (locs.topWavePosition) gl.uniform3f(locs.topWavePosition, topWavePosition.x, topWavePosition.y, topWavePosition.rotate);
  if (locs.middleWavePosition) gl.uniform3f(locs.middleWavePosition, middleWavePosition.x, middleWavePosition.y, middleWavePosition.rotate);
  if (locs.bottomWavePosition) gl.uniform3f(locs.bottomWavePosition, bottomWavePosition.x, bottomWavePosition.y, bottomWavePosition.rotate);

  if (locs.interactive) gl.uniform1i(locs.interactive, interactive ? 1 : 0);
  if (locs.bendRadius) gl.uniform1f(locs.bendRadius, bendRadius);
  if (locs.bendStrength) gl.uniform1f(locs.bendStrength, bendStrength);
  if (locs.bendInfluence) gl.uniform1f(locs.bendInfluence, currentInfluence);

  if (locs.parallax) gl.uniform1i(locs.parallax, parallax ? 1 : 0);
  if (locs.parallaxStrength) gl.uniform1f(locs.parallaxStrength, parallaxStrength);
  if (locs.parallaxOffset) gl.uniform2f(locs.parallaxOffset, parallaxCurrent.x, parallaxCurrent.y);

  if (locs.iMouse) gl.uniform2f(locs.iMouse, mouseCurrent.x, mouseCurrent.y);

  // Update gradient
  if (linesGradient.length > 0) {
    const stops = linesGradient.slice(0, MAX_GRADIENT_STOPS);
    const colorArray: number[] = [];
    for (let i = 0; i < MAX_GRADIENT_STOPS; i++) {
      if (i < stops.length) {
        const [r, g, b] = hexToVec3(stops[i]);
        colorArray.push(r, g, b);
      } else {
        colorArray.push(1, 1, 1);
      }
    }
    if (locs.lineGradient) gl.uniform3fv(locs.lineGradient, colorArray);
    if (locs.lineGradientCount) gl.uniform1i(locs.lineGradientCount, stops.length);
  } else {
    if (locs.lineGradientCount) gl.uniform1i(locs.lineGradientCount, 0);
  }

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false
  });

  if (!gl) return;

  gl.clearColor(0, 0, 0, 1);

  program = createProgram_();
  if (!program) return;

  gl.useProgram(program);

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
    iTime: gl.getUniformLocation(program, 'iTime'),
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    animationSpeed: gl.getUniformLocation(program, 'animationSpeed'),
    enableTop: gl.getUniformLocation(program, 'enableTop'),
    enableMiddle: gl.getUniformLocation(program, 'enableMiddle'),
    enableBottom: gl.getUniformLocation(program, 'enableBottom'),
    topLineCount: gl.getUniformLocation(program, 'topLineCount'),
    middleLineCount: gl.getUniformLocation(program, 'middleLineCount'),
    bottomLineCount: gl.getUniformLocation(program, 'bottomLineCount'),
    topLineDistance: gl.getUniformLocation(program, 'topLineDistance'),
    middleLineDistance: gl.getUniformLocation(program, 'middleLineDistance'),
    bottomLineDistance: gl.getUniformLocation(program, 'bottomLineDistance'),
    topWavePosition: gl.getUniformLocation(program, 'topWavePosition'),
    middleWavePosition: gl.getUniformLocation(program, 'middleWavePosition'),
    bottomWavePosition: gl.getUniformLocation(program, 'bottomWavePosition'),
    iMouse: gl.getUniformLocation(program, 'iMouse'),
    interactive: gl.getUniformLocation(program, 'interactive'),
    bendRadius: gl.getUniformLocation(program, 'bendRadius'),
    bendStrength: gl.getUniformLocation(program, 'bendStrength'),
    bendInfluence: gl.getUniformLocation(program, 'bendInfluence'),
    parallax: gl.getUniformLocation(program, 'parallax'),
    parallaxStrength: gl.getUniformLocation(program, 'parallaxStrength'),
    parallaxOffset: gl.getUniformLocation(program, 'parallaxOffset'),
    lineGradient: gl.getUniformLocation(program, 'lineGradient[0]'),
    lineGradientCount: gl.getUniformLocation(program, 'lineGradientCount'),
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
      }
      break;

    case 'pointer':
      mouseTarget = { x: data.x, y: data.y };
      targetInfluence = 1.0;
      if (parallax) {
        parallaxTarget = { x: data.parallaxX, y: data.parallaxY };
      }
      break;

    case 'pointerLeave':
      targetInfluence = 0.0;
      break;

    case 'props':
      if (typeof data.animationSpeed === 'number') animationSpeed = data.animationSpeed;
      if (Array.isArray(data.enabledWaves)) enabledWaves = data.enabledWaves;
      if (typeof data.lineCount === 'number') lineCount = data.lineCount;
      if (typeof data.lineDistance === 'number') lineDistance = data.lineDistance;
      if (data.topWavePosition) topWavePosition = data.topWavePosition;
      if (data.middleWavePosition) middleWavePosition = data.middleWavePosition;
      if (data.bottomWavePosition) bottomWavePosition = data.bottomWavePosition;
      if (typeof data.interactive === 'boolean') interactive = data.interactive;
      if (typeof data.bendRadius === 'number') bendRadius = data.bendRadius;
      if (typeof data.bendStrength === 'number') bendStrength = data.bendStrength;
      if (typeof data.mouseDamping === 'number') mouseDamping = data.mouseDamping;
      if (typeof data.parallax === 'boolean') parallax = data.parallax;
      if (typeof data.parallaxStrength === 'number') parallaxStrength = data.parallaxStrength;
      if (Array.isArray(data.linesGradient)) linesGradient = data.linesGradient;
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

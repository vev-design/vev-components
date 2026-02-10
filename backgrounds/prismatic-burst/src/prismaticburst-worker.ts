// PrismaticBurst WebGL2 Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;

uniform float uIntensity;
uniform float uSpeed;
uniform int   uAnimType;
uniform vec2  uMouse;
uniform int   uColorCount;
uniform float uDistort;
uniform vec2  uOffset;
uniform sampler2D uGradient;
uniform float uNoiseAmount;
uniform int   uRayCount;

float hash21(vec2 p){
    p = floor(p);
    float f = 52.9829189 * fract(dot(p, vec2(0.065, 0.005)));
    return fract(f);
}

mat2 rot30(){ return mat2(0.8, -0.5, 0.5, 0.8); }

float layeredNoise(vec2 fragPx){
    vec2 p = mod(fragPx + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
    vec2 q = rot30() * p;
    float n = 0.0;
    n += 0.40 * hash21(q);
    n += 0.25 * hash21(q * 2.0 + 17.0);
    n += 0.20 * hash21(q * 4.0 + 47.0);
    n += 0.10 * hash21(q * 8.0 + 113.0);
    n += 0.05 * hash21(q * 16.0 + 191.0);
    return n;
}

vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
    float focal = res.y * max(dist, 1e-3);
    return normalize(vec3(2.0 * (frag - offset) - res, focal));
}

float edgeFade(vec2 frag, vec2 res, vec2 offset){
    vec2 toC = frag - 0.5 * res - offset;
    float r = length(toC) / (0.5 * min(res.x, res.y));
    float x = clamp(r, 0.0, 1.0);
    float q = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    float s = q * 0.5;
    s = pow(s, 1.5);
    float tail = 1.0 - pow(1.0 - s, 2.0);
    s = mix(s, tail, 0.2);
    float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
    return clamp(s + dn, 0.0, 1.0);
}

mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }

vec3 sampleGradient(float t){
    t = clamp(t, 0.0, 1.0);
    return texture(uGradient, vec2(t, 0.5)).rgb;
}

vec2 rot2(vec2 v, float a){
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c) * v;
}

float bendAngle(vec3 q, float t){
    float a = 0.8 * sin(q.x * 0.55 + t * 0.6)
            + 0.7 * sin(q.y * 0.50 - t * 0.5)
            + 0.6 * sin(q.z * 0.60 + t * 0.7);
    return a;
}

void main(){
    vec2 frag = gl_FragCoord.xy;
    float t = uTime * uSpeed;
    float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
    vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
    float marchT = 0.0;
    vec3 col = vec3(0.0);
    float n = layeredNoise(frag);
    vec4 c = cos(t * 0.2 + vec4(0.0, 33.0, 11.0, 0.0));
    mat2 M2 = mat2(c.x, c.y, c.z, c.w);
    float amp = clamp(uDistort, 0.0, 50.0) * 0.15;

    mat3 rot3dMat = mat3(1.0);
    if(uAnimType == 1){
      vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
      rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
    }
    mat3 hoverMat = mat3(1.0);
    if(uAnimType == 2){
      vec2 m = uMouse * 2.0 - 1.0;
      vec3 ang = vec3(m.y * 0.6, m.x * 0.6, 0.0);
      hoverMat = rotY(ang.y) * rotX(ang.x);
    }

    for (int i = 0; i < 44; ++i) {
        vec3 P = marchT * dir;
        P.z -= 2.0;
        float rad = length(P);
        vec3 Pl = P * (10.0 / max(rad, 1e-6));

        if(uAnimType == 0){
            Pl.xz *= M2;
        } else if(uAnimType == 1){
      Pl = rot3dMat * Pl;
        } else {
      Pl = hoverMat * Pl;
        }

        float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;

        float grow = smoothstep(0.35, 3.0, marchT);
        float a1 = amp * grow * bendAngle(Pl * 0.6, t);
        float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
        vec3 Pb = Pl;
        Pb.xz = rot2(Pb.xz, a1);
        Pb.xy = rot2(Pb.xy, a2);

        float rayPattern = smoothstep(
            0.5, 0.7,
            sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
            sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
        );

        if (uRayCount > 0) {
            float ang = atan(Pb.y, Pb.x);
            float comb = 0.5 + 0.5 * cos(float(uRayCount) * ang);
            comb = pow(comb, 3.0);
            rayPattern *= smoothstep(0.15, 0.95, comb);
        }

        vec3 spectralDefault = 1.0 + vec3(
            cos(marchT * 3.0 + 0.0),
            cos(marchT * 3.0 + 1.0),
            cos(marchT * 3.0 + 2.0)
        );

        float saw = fract(marchT * 0.25);
        float tRay = saw * saw * (3.0 - 2.0 * saw);
        vec3 userGradient = 2.0 * sampleGradient(tRay);
        vec3 spectral = (uColorCount > 0) ? userGradient : spectralDefault;
        vec3 base = (0.05 / (0.4 + stepLen))
                  * smoothstep(5.0, 0.0, rad)
                  * spectral;

        col += base * rayPattern;
        marchT += stepLen;
    }

    col *= edgeFade(frag, uResolution, uOffset);
    col *= uIntensity;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const hexToRgb01 = (hex: string): [number, number, number] => {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const intVal = parseInt(h, 16);
  if (isNaN(intVal) || (h.length !== 6 && h.length !== 8)) return [1, 1, 1];
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;
  return [r, g, b];
};

const toPx = (v: number | string | undefined): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const num = parseFloat(s.replace('px', ''));
  return isNaN(num) ? 0 : num;
};

let canvas: OffscreenCanvas | null = null;
let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let vao: WebGLVertexArrayObject | null = null;
let buffer: WebGLBuffer | null = null;
let gradientTexture: WebGLTexture | null = null;

let locs: {
  uResolution: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uSpeed: WebGLUniformLocation | null;
  uAnimType: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uColorCount: WebGLUniformLocation | null;
  uDistort: WebGLUniformLocation | null;
  uOffset: WebGLUniformLocation | null;
  uGradient: WebGLUniformLocation | null;
  uNoiseAmount: WebGLUniformLocation | null;
  uRayCount: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let accumTime = 0;
let lastTime = 0;
let paused = false;

// Props
let intensity = 2;
let speed = 0.5;
let animationType: 'rotate' | 'rotate3d' | 'hover' = 'rotate3d';
let colors: string[] = [];
let distort = 0;
let offset = { x: 0, y: 0 };
let hoverDampness = 0;
let rayCount = 0;

// State
let pointerTarget: [number, number] = [0.5, 0.5];
let pointerSmooth: [number, number] = [0.5, 0.5];

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

const updateGradientTexture = () => {
  if (!gl || !gradientTexture) return;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gradientTexture);

  if (Array.isArray(colors) && colors.length > 0) {
    const capped = colors.slice(0, 64);
    const count = capped.length;
    const data = new Uint8Array(count * 4);
    for (let i = 0; i < count; i++) {
      const [r, g, b] = hexToRgb01(capped[i]);
      data[i * 4 + 0] = Math.round(r * 255);
      data[i * 4 + 1] = Math.round(g * 255);
      data[i * 4 + 2] = Math.round(b * 255);
      data[i * 4 + 3] = 255;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, count, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    if (locs.uColorCount) gl.uniform1i(locs.uColorCount, count);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    if (locs.uColorCount) gl.uniform1i(locs.uColorCount, 0);
  }
};

function animate(now: number) {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!gl) return;

  const dt = Math.max(0, now - lastTime) * 0.001;
  lastTime = now;

  if (!paused) {
    accumTime += dt;
  }

  // Smooth pointer
  const tau = 0.02 + Math.max(0, Math.min(1, hoverDampness)) * 0.5;
  const alpha = 1 - Math.exp(-dt / tau);
  pointerSmooth[0] += (pointerTarget[0] - pointerSmooth[0]) * alpha;
  pointerSmooth[1] += (pointerTarget[1] - pointerSmooth[1]) * alpha;

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  if (locs.uMouse) gl.uniform2f(locs.uMouse, pointerSmooth[0], pointerSmooth[1]);
  if (locs.uTime) gl.uniform1f(locs.uTime, accumTime);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

function init(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });

  if (!gl) return;

  program = createProgram_();
  if (!program) return;

  buffer = gl.createBuffer();
  vao = gl.createVertexArray();
  if (!buffer || !vao) return;

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 0, 0,
    3, -1, 2, 0,
    -1, 3, 0, 2,
  ]), gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'position');
  const uvLocation = gl.getAttribLocation(program, 'uv');
  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(uvLocation);
  gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
  gl.bindVertexArray(null);

  gl.useProgram(program);

  locs = {
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uIntensity: gl.getUniformLocation(program, 'uIntensity'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uAnimType: gl.getUniformLocation(program, 'uAnimType'),
    uMouse: gl.getUniformLocation(program, 'uMouse'),
    uColorCount: gl.getUniformLocation(program, 'uColorCount'),
    uDistort: gl.getUniformLocation(program, 'uDistort'),
    uOffset: gl.getUniformLocation(program, 'uOffset'),
    uGradient: gl.getUniformLocation(program, 'uGradient'),
    uNoiseAmount: gl.getUniformLocation(program, 'uNoiseAmount'),
    uRayCount: gl.getUniformLocation(program, 'uRayCount'),
  };

  gradientTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gradientTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  if (locs.uGradient) gl.uniform1i(locs.uGradient, 0);
  if (locs.uNoiseAmount) gl.uniform1f(locs.uNoiseAmount, 0.8);

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
        lastTime = performance.now();
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
          gl.uniform2f(locs.uResolution, data.width, data.height);
        }
      }
      break;

    case 'pointer':
      pointerTarget = [data.x, data.y];
      break;

    case 'props':
      if (gl) {
        gl.useProgram(program);
        if (typeof data.intensity === 'number') {
          intensity = data.intensity;
          if (locs.uIntensity) gl.uniform1f(locs.uIntensity, intensity);
        }
        if (typeof data.speed === 'number') {
          speed = data.speed;
          if (locs.uSpeed) gl.uniform1f(locs.uSpeed, speed);
        }
        if (data.animationType) {
          animationType = data.animationType;
          const animTypeMap: Record<string, number> = { rotate: 0, rotate3d: 1, hover: 2 };
          if (locs.uAnimType) gl.uniform1i(locs.uAnimType, animTypeMap[animationType] ?? 0);
        }
        if (typeof data.distort === 'number') {
          distort = data.distort;
          if (locs.uDistort) gl.uniform1f(locs.uDistort, distort);
        }
        if (data.offset) {
          offset = data.offset;
          const ox = toPx(offset.x);
          const oy = toPx(offset.y);
          if (locs.uOffset) gl.uniform2f(locs.uOffset, ox, oy);
        }
        if (typeof data.rayCount === 'number') {
          rayCount = data.rayCount;
          if (locs.uRayCount) gl.uniform1i(locs.uRayCount, Math.max(0, Math.floor(rayCount)));
        }
        if (typeof data.hoverDampness === 'number') {
          hoverDampness = data.hoverDampness;
        }
        if (Array.isArray(data.colors)) {
          colors = data.colors;
          updateGradientTexture();
        }
        if (typeof data.paused === 'boolean') {
          paused = data.paused;
        }
      }
      break;

    case 'cleanup':
      running = false;
      if (gl) {
        if (gradientTexture) gl.deleteTexture(gradientTexture);
        if (buffer) gl.deleteBuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        if (program) gl.deleteProgram(program);
      }
      gl = null;
      canvas = null;
      program = null;
      vao = null;
      buffer = null;
      gradientTexture = null;
      break;
  }
};

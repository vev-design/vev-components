// Threads WebGL Worker - Renders on OffscreenCanvas in a separate thread

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;

#define PI 3.1415926538

const int u_line_count = 40;
const float u_line_width = 7.0;
const float u_line_blur = 10.0;

float Perlin2D(vec2 P) {
    vec2 Pi = floor(P);
    vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
    vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
    Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
    Pt += vec2(26.0, 161.0).xyxy;
    Pt *= Pt;
    Pt = Pt.xzxz * Pt.yyww;
    vec4 hash_x = fract(Pt * (1.0 / 951.135664));
    vec4 hash_y = fract(Pt * (1.0 / 642.949883));
    vec4 grad_x = hash_x - 0.49999;
    vec4 grad_y = hash_y - 0.49999;
    vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
        * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
    grad_results *= 1.4142135623730950;
    vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
               * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
    vec4 blend2 = vec4(blend, vec2(1.0 - blend));
    return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
    return (1.0 / max(resolution.x, resolution.y)) * count;
}

float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
    float split_offset = (perc * 0.4);
    float split_point = 0.1 + split_offset;

    float amplitude_normal = smoothstep(split_point, 0.7, st.x);
    float amplitude_strength = 0.5;
    float finalAmplitude = amplitude_normal * amplitude_strength
                           * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

    float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
    float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

    float xnoise = mix(
        Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
        Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
        st.x * 0.3
    );

    float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

    float line_start = smoothstep(
        y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        y,
        st.y
    );

    float line_end = smoothstep(
        y,
        y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        st.y
    );

    return clamp(
        (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
        0.0,
        1.0
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float line_strength = 1.0;
    for (int i = 0; i < u_line_count; i++) {
        float p = float(i) / float(u_line_count);
        line_strength *= (1.0 - lineFn(
            uv,
            u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p),
            p,
            (PI * 1.0) * p,
            uMouse,
            iTime,
            uAmplitude,
            uDistance
        ));
    }

    float colorVal = 1.0 - line_strength;
    fragColor = vec4(uColor * colorVal, colorVal);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

const TRIANGLE_VERTICES = new Float32Array([
  -1, -1, 0, 0,
  3, -1, 2, 0,
  -1, 3, 0, 2,
]);

let canvas: OffscreenCanvas | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let buffer: WebGLBuffer | null = null;
let locs: {
  iTime: WebGLUniformLocation | null;
  iResolution: WebGLUniformLocation | null;
  uColor: WebGLUniformLocation | null;
  uAmplitude: WebGLUniformLocation | null;
  uDistance: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
} = {} as any;

let running = false;
let time = 0;
let lastTs = 0;

// Current values
let color: [number, number, number] = [1, 1, 1];
let amplitude = 1;
let distance = 0;
let mouseTarget: [number, number] = [0.5, 0.5];
let mouseVal: [number, number] = [0.5, 0.5];
let mouseEnabled = false;

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
  const smoothing = mouseEnabled ? 0.05 : 1.0;
  mouseVal[0] += smoothing * (mouseTarget[0] - mouseVal[0]);
  mouseVal[1] += smoothing * (mouseTarget[1] - mouseVal[1]);

  if (locs.iTime) gl.uniform1f(locs.iTime, time);
  if (locs.uMouse) gl.uniform2f(locs.uMouse, mouseVal[0], mouseVal[1]);

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
    preserveDrawingBuffer: false
  });

  if (!gl) return;

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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
    iTime: gl.getUniformLocation(program, 'iTime'),
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    uColor: gl.getUniformLocation(program, 'uColor'),
    uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
    uDistance: gl.getUniformLocation(program, 'uDistance'),
    uMouse: gl.getUniformLocation(program, 'uMouse'),
  };

  // Set initial values
  if (locs.uColor) gl.uniform3f(locs.uColor, color[0], color[1], color[2]);
  if (locs.uAmplitude) gl.uniform1f(locs.uAmplitude, amplitude);
  if (locs.uDistance) gl.uniform1f(locs.uDistance, distance);
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
        if (locs.iResolution) {
          gl.uniform3f(locs.iResolution, data.width, data.height, data.width / data.height);
        }
      }
      break;

    case 'mouse':
      mouseTarget = [data.x, data.y];
      break;

    case 'mouseLeave':
      mouseTarget = [0.5, 0.5];
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
        if (typeof data.distance === 'number' && locs.uDistance) {
          distance = data.distance;
          gl.uniform1f(locs.uDistance, distance);
        }
        if (typeof data.mouseEnabled === 'boolean') {
          mouseEnabled = data.mouseEnabled;
          if (!mouseEnabled) {
            mouseTarget = [0.5, 0.5];
          }
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

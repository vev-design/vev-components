import React, { useEffect, useRef } from 'react';
import styles from './Prism.module.css';
import { registerVevComponent } from "@vev/react";

type PrismProps = {
  height?: number;
  baseWidth?: number;
  animationType?: 'rotate' | 'hover' | '3drotate';
  glow?: number;
  offset?: { x?: number; y?: number };
  noise?: number;
  transparent?: boolean;
  scale?: number;
  hueShift?: number;
  colorFrequency?: number;
  hoverStrength?: number;
  inertia?: number;
  bloom?: number;
  suspendWhenOffscreen?: boolean;
  timeScale?: number;
};

const vertexShader = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec2  iResolution;
uniform float iTime;

uniform float uHeight;
uniform float uBaseHalf;
uniform mat3  uRot;
uniform int   uUseBaseWobble;
uniform float uGlow;
uniform vec2  uOffsetPx;
uniform float uNoise;
uniform float uSaturation;
uniform float uScale;
uniform float uHueShift;
uniform float uColorFreq;
uniform float uBloom;
uniform float uCenterShift;
uniform float uInvBaseHalf;
uniform float uInvHeight;
uniform float uMinAxis;
uniform float uPxScale;
uniform float uTimeScale;

vec4 tanh4(vec4 x){
  vec4 e2x = exp(2.0*x);
  return (e2x - 1.0) / (e2x + 1.0);
}

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
}

float sdOctaAnisoInv(vec3 p){
  vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
  float m = q.x + q.y + q.z - 1.0;
  return m * uMinAxis * 0.5773502691896258;
}

float sdPyramidUpInv(vec3 p){
  float oct = sdOctaAnisoInv(p);
  float halfSpace = -p.y;
  return max(oct, halfSpace);
}

mat3 hueRotation(float a){
  float c = cos(a), s = sin(a);
  mat3 W = mat3(
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114
  );
  mat3 U = mat3(
     0.701, -0.587, -0.114,
    -0.299,  0.413, -0.114,
    -0.300, -0.588,  0.886
  );
  mat3 V = mat3(
     0.168, -0.331,  0.500,
     0.328,  0.035, -0.500,
    -0.497,  0.296,  0.201
  );
  return W + U * c + V * s;
}

void main(){
  vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

  float z = 5.0;
  float d = 0.0;

  vec3 p;
  vec4 o = vec4(0.0);

  float centerShift = uCenterShift;
  float cf = uColorFreq;

  mat2 wob = mat2(1.0);
  if (uUseBaseWobble == 1) {
    float t = iTime * uTimeScale;
    float c0 = cos(t + 0.0);
    float c1 = cos(t + 33.0);
    float c2 = cos(t + 11.0);
    wob = mat2(c0, c1, c2, c0);
  }

  const int STEPS = 100;
  for (int i = 0; i < STEPS; i++) {
    p = vec3(f, z);
    p.xz = p.xz * wob;
    p = uRot * p;
    vec3 q = p;
    q.y += centerShift;
    d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
    z -= d;
    o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
  }

  o = tanh4(o * o * (uGlow * uBloom) / 1e5);

  vec3 col = o.rgb;
  float n = rand(gl_FragCoord.xy + vec2(iTime));
  col += (n - 0.5) * uNoise;
  col = clamp(col, 0.0, 1.0);

  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

  if(abs(uHueShift) > 0.0001){
    col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
  }

  gl_FragColor = vec4(col, o.a);
}
`;

const TRIANGLE_VERTICES = new Float32Array([
  -1, -1, 0, 0,
  3, -1, 2, 0,
  -1, 3, 0, 2,
]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[Prism] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[Prism] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

type UniformLocations = {
  iResolution: WebGLUniformLocation | null;
  iTime: WebGLUniformLocation | null;
  uHeight: WebGLUniformLocation | null;
  uBaseHalf: WebGLUniformLocation | null;
  uRot: WebGLUniformLocation | null;
  uUseBaseWobble: WebGLUniformLocation | null;
  uGlow: WebGLUniformLocation | null;
  uOffsetPx: WebGLUniformLocation | null;
  uNoise: WebGLUniformLocation | null;
  uSaturation: WebGLUniformLocation | null;
  uScale: WebGLUniformLocation | null;
  uHueShift: WebGLUniformLocation | null;
  uColorFreq: WebGLUniformLocation | null;
  uBloom: WebGLUniformLocation | null;
  uCenterShift: WebGLUniformLocation | null;
  uInvBaseHalf: WebGLUniformLocation | null;
  uInvHeight: WebGLUniformLocation | null;
  uMinAxis: WebGLUniformLocation | null;
  uPxScale: WebGLUniformLocation | null;
  uTimeScale: WebGLUniformLocation | null;
};

type DerivedValues = {
  height: number;
  baseHalf: number;
  glow: number;
  noise: number;
  saturation: number;
  scale: number;
  hueShift: number;
  colorFreq: number;
  bloom: number;
  centerShift: number;
  invBaseHalf: number;
  invHeight: number;
  minAxis: number;
};

type GLState = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  uniforms: UniformLocations;
  resizeObserver: ResizeObserver | null;
  animationFrame: number;
  pointer: { x: number; y: number; inside: boolean };
  rotMatrix: Float32Array;
  yaw: number;
  pitch: number;
  roll: number;
  targetYaw: number;
  targetPitch: number;
  randomSpeeds: { wX: number; wY: number; wZ: number; phX: number; phZ: number };
  derived: DerivedValues;
  offset: { x: number; y: number };
  dpr: number;
  hoverStrength: number;
  inertia: number;
  timeScale: number;
  animationType: PrismProps['animationType'];
  noiseIsZero: boolean;
  useBaseWobble: 0 | 1;
  hoverHandlersAttached: boolean;
  suspendObserver: IntersectionObserver | null;
  suspendWhenOffscreen: boolean;
  isVisible: boolean;
  startTime: number;
  pointerMove: (e: PointerEvent) => void;
  pointerLeave: () => void;
  start: () => void;
  stop: () => void;
};

const setMat3FromEuler = (yawY: number, pitchX: number, rollZ: number, out: Float32Array) => {
  const cy = Math.cos(yawY);
  const sy = Math.sin(yawY);
  const cx = Math.cos(pitchX);
  const sx = Math.sin(pitchX);
  const cz = Math.cos(rollZ);
  const sz = Math.sin(rollZ);

  const r00 = cy * cz + sy * sx * sz;
  const r01 = -cy * sz + sy * sx * cz;
  const r02 = sy * cx;

  const r10 = cx * sz;
  const r11 = cx * cz;
  const r12 = -sx;

  const r20 = -sy * cz + cy * sx * sz;
  const r21 = sy * sz + cy * sx * cz;
  const r22 = cy * cx;

  out[0] = r00;
  out[1] = r10;
  out[2] = r20;
  out[3] = r01;
  out[4] = r11;
  out[5] = r21;
  out[6] = r02;
  out[7] = r12;
  out[8] = r22;
  return out;
};

const updateRotationUniform = (state: GLState, yaw: number, pitch: number, roll: number) => {
  const matrix = setMat3FromEuler(yaw, pitch, roll, state.rotMatrix);
  if (state.uniforms.uRot) {
    state.gl.uniformMatrix3fv(state.uniforms.uRot, false, matrix);
  }
};

const updatePxScale = (state: GLState) => {
  if (!state.uniforms.uPxScale) return;
  const height = state.gl.drawingBufferHeight || 1;
  const pxScale = 1 / (height * 0.1 * Math.max(0.001, state.derived.scale));
  state.gl.uniform1f(state.uniforms.uPxScale, pxScale);
};

const updateOffsetUniform = (state: GLState) => {
  if (!state.uniforms.uOffsetPx) return;
  const dpr = state.dpr || 1;
  state.gl.uniform2f(state.uniforms.uOffsetPx, state.offset.x * dpr, state.offset.y * dpr);
};

const applyDerivedUniforms = (state: GLState, props: PrismProps) => {
  const height = Math.max(0.001, props.height ?? 3.5);
  const baseHalf = Math.max(0.001, (props.baseWidth ?? 5.5) * 0.5);
  const glow = Math.max(0, props.glow ?? 1);
  const noise = Math.max(0, props.noise ?? 0.5);
  const saturation = (props.transparent ?? true) ? 1.5 : 1;
  const scale = Math.max(0.001, props.scale ?? 3.6);
  const hueShift = props.hueShift ?? 0;
  const colorFreq = Math.max(0, props.colorFrequency ?? 1);
  const bloom = Math.max(0, props.bloom ?? 1);
  const centerShift = height * 0.25;
  const invBaseHalf = 1 / baseHalf;
  const invHeight = 1 / height;
  const minAxis = Math.min(baseHalf, height);

  state.derived = {
    height,
    baseHalf,
    glow,
    noise,
    saturation,
    scale,
    hueShift,
    colorFreq,
    bloom,
    centerShift,
    invBaseHalf,
    invHeight,
    minAxis,
  };
  state.offset = { x: props.offset?.x ?? 0, y: props.offset?.y ?? 0 };
  state.noiseIsZero = noise < 1e-6;

  const { gl, uniforms } = state;
  gl.useProgram(state.program);

  uniforms.uHeight && gl.uniform1f(uniforms.uHeight, height);
  uniforms.uBaseHalf && gl.uniform1f(uniforms.uBaseHalf, baseHalf);
  uniforms.uGlow && gl.uniform1f(uniforms.uGlow, glow);
  uniforms.uNoise && gl.uniform1f(uniforms.uNoise, noise);
  uniforms.uSaturation && gl.uniform1f(uniforms.uSaturation, saturation);
  uniforms.uScale && gl.uniform1f(uniforms.uScale, scale);
  uniforms.uHueShift && gl.uniform1f(uniforms.uHueShift, hueShift);
  uniforms.uColorFreq && gl.uniform1f(uniforms.uColorFreq, colorFreq);
  uniforms.uBloom && gl.uniform1f(uniforms.uBloom, bloom);
  uniforms.uCenterShift && gl.uniform1f(uniforms.uCenterShift, centerShift);
  uniforms.uInvBaseHalf && gl.uniform1f(uniforms.uInvBaseHalf, invBaseHalf);
  uniforms.uInvHeight && gl.uniform1f(uniforms.uInvHeight, invHeight);
  uniforms.uMinAxis && gl.uniform1f(uniforms.uMinAxis, minAxis);

  updateOffsetUniform(state);
  updatePxScale(state);
  state.start();
};

const updateTimeScale = (state: GLState, value: number | undefined) => {
  const timeScale = Math.max(0, value ?? 0.5);
  state.timeScale = timeScale;
  if (state.uniforms.uTimeScale) {
    state.gl.uniform1f(state.uniforms.uTimeScale, timeScale);
  }
  state.start();
};

const setHoverHandlers = (state: GLState, enable: boolean) => {
  if (typeof window === 'undefined') return;
  if (enable && !state.hoverHandlersAttached) {
    window.addEventListener('pointermove', state.pointerMove, { passive: true });
    window.addEventListener('mouseleave', state.pointerLeave);
    window.addEventListener('blur', state.pointerLeave);
    state.hoverHandlersAttached = true;
  } else if (!enable && state.hoverHandlersAttached) {
    window.removeEventListener('pointermove', state.pointerMove);
    window.removeEventListener('mouseleave', state.pointerLeave);
    window.removeEventListener('blur', state.pointerLeave);
    state.hoverHandlersAttached = false;
  }
};

const updateAnimationMode = (
  state: GLState,
  animationType: PrismProps['animationType'],
  hoverStrength: number | undefined,
  inertia: number | undefined
) => {
  state.animationType = animationType ?? 'rotate';
  state.hoverStrength = Math.max(0, hoverStrength ?? 1);
  state.inertia = clamp(inertia ?? 0.12, 0, 1);
  state.useBaseWobble = state.animationType === 'rotate' ? 1 : 0;

  if (state.uniforms.uUseBaseWobble) {
    state.gl.uniform1i(state.uniforms.uUseBaseWobble, state.useBaseWobble);
  }

  setHoverHandlers(state, state.animationType === 'hover');
  state.pointer.inside = state.animationType !== 'hover' ? false : state.pointer.inside;
  state.start();
};

const applySuspension = (state: GLState, enabled: boolean) => {
  state.suspendWhenOffscreen = enabled;
  state.suspendObserver?.disconnect();
  state.suspendObserver = null;
  state.isVisible = true;

  if (enabled && typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      state.isVisible = visible;
      if (visible) state.start();
      else state.stop();
    });
    observer.observe(state.container);
    state.suspendObserver = observer;
  } else {
    state.start();
  }
};

const Prism: React.FC<PrismProps> = ({
  height = 3.5,
  baseWidth = 5.5,
  animationType = 'rotate',
  glow = 1,
  offset = { x: 0, y: 0 },
  noise = 0.5,
  transparent = true,
  scale = 3.6,
  hueShift = 0,
  colorFrequency = 1,
  hoverStrength = 2,
  inertia = 0.05,
  bloom = 1,
  suspendWhenOffscreen = false,
  timeScale = 0.5
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glStateRef = useRef<GLState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: transparent,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      console.warn('[Prism] WebGL not supported');
      container.removeChild(canvas);
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      container.removeChild(canvas);
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
      console.warn('[Prism] Failed to create buffer');
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);

    const uniforms: UniformLocations = {
      iResolution: gl.getUniformLocation(program, 'iResolution'),
      iTime: gl.getUniformLocation(program, 'iTime'),
      uHeight: gl.getUniformLocation(program, 'uHeight'),
      uBaseHalf: gl.getUniformLocation(program, 'uBaseHalf'),
      uRot: gl.getUniformLocation(program, 'uRot'),
      uUseBaseWobble: gl.getUniformLocation(program, 'uUseBaseWobble'),
      uGlow: gl.getUniformLocation(program, 'uGlow'),
      uOffsetPx: gl.getUniformLocation(program, 'uOffsetPx'),
      uNoise: gl.getUniformLocation(program, 'uNoise'),
      uSaturation: gl.getUniformLocation(program, 'uSaturation'),
      uScale: gl.getUniformLocation(program, 'uScale'),
      uHueShift: gl.getUniformLocation(program, 'uHueShift'),
      uColorFreq: gl.getUniformLocation(program, 'uColorFreq'),
      uBloom: gl.getUniformLocation(program, 'uBloom'),
      uCenterShift: gl.getUniformLocation(program, 'uCenterShift'),
      uInvBaseHalf: gl.getUniformLocation(program, 'uInvBaseHalf'),
      uInvHeight: gl.getUniformLocation(program, 'uInvHeight'),
      uMinAxis: gl.getUniformLocation(program, 'uMinAxis'),
      uPxScale: gl.getUniformLocation(program, 'uPxScale'),
      uTimeScale: gl.getUniformLocation(program, 'uTimeScale'),
    };

    const pointer = { x: 0, y: 0, inside: true };
    const pointerMove = (e: PointerEvent) => {
      const ww = Math.max(1, window.innerWidth);
      const wh = Math.max(1, window.innerHeight);
      const cx = ww * 0.5;
      const cy = wh * 0.5;
      pointer.x = clamp((e.clientX - cx) / (ww * 0.5), -1, 1);
      pointer.y = clamp((e.clientY - cy) / (wh * 0.5), -1, 1);
      pointer.inside = true;
      glStateRef.current?.start();
    };
    const pointerLeave = () => {
      pointer.inside = false;
      glStateRef.current?.start();
    };

    const state: GLState = {
      gl,
      program,
      buffer,
      canvas,
      container,
      uniforms,
      resizeObserver: null,
      animationFrame: 0,
      pointer,
      rotMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
      yaw: 0,
      pitch: 0,
      roll: 0,
      targetYaw: 0,
      targetPitch: 0,
      randomSpeeds: {
        wX: 0.3 + Math.random() * 0.6,
        wY: 0.2 + Math.random() * 0.7,
        wZ: 0.1 + Math.random() * 0.5,
        phX: Math.random() * Math.PI * 2,
        phZ: Math.random() * Math.PI * 2,
      },
      derived: {
        height,
        baseHalf: baseWidth * 0.5,
        glow,
        noise,
        saturation: transparent ? 1.5 : 1,
        scale,
        hueShift,
        colorFreq: colorFrequency,
        bloom,
        centerShift: height * 0.25,
        invBaseHalf: 1 / (baseWidth * 0.5),
        invHeight: 1 / height,
        minAxis: Math.min(height, baseWidth * 0.5),
      },
      offset: { x: offset?.x ?? 0, y: offset?.y ?? 0 },
      dpr: 1,
      hoverStrength,
      inertia,
      timeScale,
      animationType,
      noiseIsZero: noise < 1e-6,
      useBaseWobble: 1,
      hoverHandlersAttached: false,
      suspendObserver: null,
      suspendWhenOffscreen,
      isVisible: true,
      startTime: performance.now(),
      pointerMove,
      pointerLeave,
      start: () => {
        if (state.animationFrame || (state.suspendWhenOffscreen && !state.isVisible)) return;
        state.animationFrame = requestAnimationFrame(render);
      },
      stop: () => {
        if (!state.animationFrame) return;
        cancelAnimationFrame(state.animationFrame);
        state.animationFrame = 0;
      },
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const heightPx = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== heightPx) {
        canvas.width = width;
        canvas.height = heightPx;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
      gl.viewport(0, 0, width, heightPx);
      state.dpr = dpr;
      uniforms.iResolution && gl.uniform2f(uniforms.iResolution, width, heightPx);
      updatePxScale(state);
      updateOffsetUniform(state);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', resize);
    resize();
    state.resizeObserver = resizeObserver;

    const render = (now: number) => {
      if (state.suspendWhenOffscreen && !state.isVisible) {
        state.animationFrame = 0;
        return;
      }

      state.animationFrame = 0;
      const elapsed = (now - state.startTime) * 0.001;

      gl.useProgram(program);
      uniforms.iTime && gl.uniform1f(uniforms.iTime, elapsed);

      let shouldContinue = true;
      if (state.animationType === 'hover') {
        const maxPitch = 0.6 * state.hoverStrength;
        const maxYaw = 0.6 * state.hoverStrength;
        state.targetYaw = (state.pointer.inside ? -state.pointer.x : 0) * maxYaw;
        state.targetPitch = (state.pointer.inside ? state.pointer.y : 0) * maxPitch;
        state.yaw = lerp(state.yaw, state.targetYaw, state.inertia);
        state.pitch = lerp(state.pitch, state.targetPitch, state.inertia);
        state.roll = lerp(state.roll, 0, 0.1);
        updateRotationUniform(state, state.yaw, state.pitch, state.roll);

        if (state.noiseIsZero) {
          const settled =
            Math.abs(state.yaw - state.targetYaw) < 1e-4 &&
            Math.abs(state.pitch - state.targetPitch) < 1e-4 &&
            Math.abs(state.roll) < 1e-4;
          if (settled) shouldContinue = false;
        }
      } else if (state.animationType === '3drotate') {
        const tScaled = elapsed * state.timeScale;
        state.yaw = tScaled * state.randomSpeeds.wY;
        state.pitch = Math.sin(tScaled * state.randomSpeeds.wX + state.randomSpeeds.phX) * 0.6;
        state.roll = Math.sin(tScaled * state.randomSpeeds.wZ + state.randomSpeeds.phZ) * 0.5;
        updateRotationUniform(state, state.yaw, state.pitch, state.roll);
        if (state.timeScale < 1e-6) shouldContinue = false;
      } else {
        updateRotationUniform(state, 0, 0, 0);
        if (state.timeScale < 1e-6) shouldContinue = false;
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (shouldContinue) {
        state.start();
      }
    };

    glStateRef.current = state;

    applyDerivedUniforms(state, {
      height,
      baseWidth,
      glow,
      noise,
      transparent,
      scale,
      hueShift,
      colorFrequency,
      bloom,
      offset,
    });
    updateTimeScale(state, timeScale);
    updateAnimationMode(state, animationType, hoverStrength, inertia);
    applySuspension(state, suspendWhenOffscreen);
    state.start();

    return () => {
      state.stop();
      state.resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      setHoverHandlers(state, false);
      state.suspendObserver?.disconnect();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      gl.deleteBuffer(state.buffer);
      gl.deleteProgram(state.program);
      glStateRef.current = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    applyDerivedUniforms(state, {
      height,
      baseWidth,
      glow,
      noise,
      transparent,
      scale,
      hueShift,
      colorFrequency,
      bloom,
      offset,
    });
  }, [height, baseWidth, glow, noise, transparent, scale, hueShift, colorFrequency, bloom, offset?.x, offset?.y]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    updateTimeScale(state, timeScale);
  }, [timeScale]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    updateAnimationMode(state, animationType, hoverStrength, inertia);
  }, [animationType, hoverStrength, inertia]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    applySuspension(state, suspendWhenOffscreen);
  }, [suspendWhenOffscreen]);

  return <div className={styles.wrapper} ref={containerRef} />;
};


registerVevComponent(Prism, {
  name: "Prism",
  props: [
    { name: "animationType", type: "select", initialValue: "rotate",  options:{
      items: [
        { label: "Rotate", value: "rotate" },
        { label: "Hover", value: "hover" },
        { label: "3D Rotate", value: "3drotate" },
      ],
      
    } },
    { name: "timeScale", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "scale", type: "number", initialValue: 3.6, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "height", type: "number", initialValue: 3.5, options:{
      display: "slider",
      min: 0,
      max: 8,
    } },
    { name: "baseWidth", type: "number", initialValue: 5.5, options:{
      display: "slider",
      min: 0,
      max: 10,
    } },
    { name: "noise", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "glow", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 3,
    } },
    { name: "hueShift", type: "number", initialValue: 0 , options:{
      display: "slider",
      min: 0,
      max: 3.06,
    } },
    { name: "colorFrequency", type: "number", initialValue: 0.8, options:{
      display: "slider",
      min: 0,
      max: 4,
    } },
    
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Prism;

import React, { useEffect, useRef, useState } from "react";
import { registerVevComponent } from "@vev/react";
import styles from './Particles.module.css';
import { SilkeBox, SilkeColorPickerButton, SilkeText } from "@vev/silke";


interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  className?: string;
}

const defaultColors: string[] = ['#ffffff', '#ffffff', '#ffffff'];

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

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

type UniformLocations = {
  uModelMatrix: WebGLUniformLocation | null;
  uViewMatrix: WebGLUniformLocation | null;
  uProjectionMatrix: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uSpread: WebGLUniformLocation | null;
  uBaseSize: WebGLUniformLocation | null;
  uSizeRandomness: WebGLUniformLocation | null;
  uAlphaParticles: WebGLUniformLocation | null;
};

type GLState = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  buffers: {
    position: WebGLBuffer;
    random: WebGLBuffer;
    color: WebGLBuffer;
  };
  attribs: {
    position: number;
    random: number;
    color: number;
  };
  uniforms: UniformLocations;
  count: number;
  animationFrame: number;
  pointer: { x: number; y: number; inside: boolean };
  hoverFactor: number;
  moveParticlesOnHover: boolean;
  speed: number;
  disableRotation: boolean;
  alphaParticles: boolean;
  cameraDistance: number;
  spread: number;
  baseSize: number;
  sizeRandomness: number;
  elapsed: number;
  lastTime: number;
  viewMatrix: Float32Array;
  projectionMatrix: Float32Array;
  modelMatrix: Float32Array;
  resizeObserver: ResizeObserver;
  pointerMoveHandler: (e: PointerEvent) => void;
  pointerLeaveHandler: () => void;
  start: () => void;
  stop: () => void;
};

const identityMatrix = () => {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
};

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[Particles] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) => {
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
    console.warn('[Particles] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

const bindAttribute = (
  gl: WebGLRenderingContext,
  buffer: WebGLBuffer,
  location: number,
  data: Float32Array,
  size: number
) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
};

const rebuildParticles = (state: GLState, count: number, colorsInput?: string[]) => {
  const gl = state.gl;
  const validCount = Math.max(0, Math.floor(count));
  if (validCount === 0) {
    state.count = 0;
    return;
  }
  
  state.count = validCount;
  const positions = new Float32Array(validCount * 3);
  const randoms = new Float32Array(validCount * 4);
  const colors = new Float32Array(validCount * 3);
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
    const posIdx = i * 3;
    const randIdx = i * 4;
    const colIdx = i * 3;
    
    if (posIdx + 3 <= positions.length) {
      positions[posIdx] = x * r;
      positions[posIdx + 1] = y * r;
      positions[posIdx + 2] = z * r;
    }
    
    if (randIdx + 4 <= randoms.length) {
      randoms[randIdx] = Math.random();
      randoms[randIdx + 1] = Math.random();
      randoms[randIdx + 2] = Math.random();
      randoms[randIdx + 3] = Math.random();
    }
    
    const col = palette[Math.floor(Math.random() * palette.length)];
    if (colIdx + 3 <= colors.length) {
      colors[colIdx] = col[0];
      colors[colIdx + 1] = col[1];
      colors[colIdx + 2] = col[2];
    }
  }

  bindAttribute(gl, state.buffers.position, state.attribs.position, positions, 3);
  bindAttribute(gl, state.buffers.random, state.attribs.random, randoms, 4);
  bindAttribute(gl, state.buffers.color, state.attribs.color, colors, 3);
  state.start();
};

const updateUniforms = (
  state: GLState,
  {
    particleSpread,
    particleBaseSize,
    sizeRandomness,
    alphaParticles,
  }: {
    particleSpread: number;
    particleBaseSize: number;
    sizeRandomness: number;
    alphaParticles: boolean;
  }
) => {
  const { gl, uniforms } = state;
  gl.useProgram(state.program);
  uniforms.uSpread && gl.uniform1f(uniforms.uSpread, particleSpread);
  uniforms.uBaseSize && gl.uniform1f(uniforms.uBaseSize, particleBaseSize);
  uniforms.uSizeRandomness && gl.uniform1f(uniforms.uSizeRandomness, sizeRandomness);
  uniforms.uAlphaParticles && gl.uniform1f(uniforms.uAlphaParticles, alphaParticles ? 1 : 0);
  state.spread = particleSpread;
  state.baseSize = particleBaseSize;
  state.sizeRandomness = sizeRandomness;
  state.alphaParticles = alphaParticles;
};

const mat4Perspective = (out: Float32Array, fov: number, aspect: number, near: number, far: number) => {
  const f = 1.0 / Math.tan(fov / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) / (near - far);
  out[15] = 0;
};

const mat4LookAt = (out: Float32Array, eye: [number, number, number], center: [number, number, number], up: [number, number, number]) => {
  let x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, z0: number, z1: number, z2: number;
  z0 = eye[0] - center[0];
  z1 = eye[1] - center[1];
  z2 = eye[2] - center[2];
  let len = Math.hypot(z0, z1, z2);
  if (len === 0) {
    z2 = 1;
  } else {
    z0 /= len;
    z1 /= len;
    z2 /= len;
  }

  x0 = up[1] * z2 - up[2] * z1;
  x1 = up[2] * z0 - up[0] * z2;
  x2 = up[0] * z1 - up[1] * z0;
  len = Math.hypot(x0, x1, x2);
  if (len === 0) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    x0 /= len;
    x1 /= len;
    x2 /= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  out[15] = 1;
};

const composeModelMatrix = (
  out: Float32Array,
  tx: number,
  ty: number,
  tz: number,
  rx: number,
  ry: number,
  rz: number
) => {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  out[0] = cz * cy;
  out[1] = cz * sy * sx - sz * cx;
  out[2] = cz * sy * cx + sz * sx;
  out[3] = 0;
  out[4] = sz * cy;
  out[5] = sz * sy * sx + cz * cx;
  out[6] = sz * sy * cx - cz * sx;
  out[7] = 0;
  out[8] = -sy;
  out[9] = cy * sx;
  out[10] = cy * cx;
  out[11] = 0;
  out[12] = tx;
  out[13] = ty;
  out[14] = tz;
  out[15] = 1;
};

const computeProjection = (state: GLState) => {
  const gl = state.gl;
  const aspect = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight);
  mat4Perspective(state.projectionMatrix, (15 * Math.PI) / 180, aspect, 0.1, 100);
  state.uniforms.uProjectionMatrix &&
    gl.uniformMatrix4fv(state.uniforms.uProjectionMatrix, false, state.projectionMatrix);
  mat4LookAt(state.viewMatrix, [0, 0, state.cameraDistance], [0, 0, 0], [0, 1, 0]);
  state.uniforms.uViewMatrix && gl.uniformMatrix4fv(state.uniforms.uViewMatrix, false, state.viewMatrix);
};

const updateModelMatrix = (state: GLState, time: number) => {
  const tx =
    state.moveParticlesOnHover && state.pointer.inside ? -state.pointer.x * state.hoverFactor : 0;
  const ty =
    state.moveParticlesOnHover && state.pointer.inside ? -state.pointer.y * state.hoverFactor : 0;
  const tz = 0;
  let rx = 0;
  let ry = 0;
  let rz = 0;
  if (!state.disableRotation) {
    rx = Math.sin(time * 0.2) * 0.1;
    ry = Math.cos(time * 0.5) * 0.15;
    rz = time * state.speed * 0.6;
  }
  composeModelMatrix(state.modelMatrix, tx, ty, tz, rx, ry, rz);
  state.uniforms.uModelMatrix &&
    state.gl.uniformMatrix4fv(state.uniforms.uModelMatrix, false, state.modelMatrix);
};

const attachPointerHandlers = (state: GLState) => {
  if (!state.moveParticlesOnHover) return;
  window.addEventListener('pointermove', state.pointerMoveHandler, { passive: true });
 state.container.addEventListener('pointerleave', state.pointerLeaveHandler);
};

const detachPointerHandlers = (state: GLState) => {
  window.removeEventListener('pointermove', state.pointerMoveHandler);
  state.container.removeEventListener('pointerleave', state.pointerLeaveHandler);
};

const drawScene = (state: GLState) => {
  if (state.count <= 0) return;
  state.gl.drawArrays(state.gl.POINTS, 0, state.count);
};

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glStateRef = useRef<GLState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      console.warn('[Particles] WebGL not supported');
      container.removeChild(canvas);
      return;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      container.removeChild(canvas);
      return;
    }

    const positionBuffer = gl.createBuffer();
    const randomBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    if (!positionBuffer || !randomBuffer || !colorBuffer) {
      console.warn('[Particles] Failed to create buffers');
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    const attribLocations = {
      position: gl.getAttribLocation(program, 'position'),
      random: gl.getAttribLocation(program, 'random'),
      color: gl.getAttribLocation(program, 'color'),
    };

    const uniforms = {
      uModelMatrix: gl.getUniformLocation(program, 'uModelMatrix'),
      uViewMatrix: gl.getUniformLocation(program, 'uViewMatrix'),
      uProjectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uSpread: gl.getUniformLocation(program, 'uSpread'),
      uBaseSize: gl.getUniformLocation(program, 'uBaseSize'),
      uSizeRandomness: gl.getUniformLocation(program, 'uSizeRandomness'),
      uAlphaParticles: gl.getUniformLocation(program, 'uAlphaParticles'),
    };

    const state: GLState = {
      gl,
      program,
      canvas,
      container,
      buffers: {
        position: positionBuffer,
        random: randomBuffer,
        color: colorBuffer,
      },
      attribs: attribLocations,
      uniforms,
      count: 0,
      animationFrame: 0,
      pointer: { x: 0, y: 0, inside: false },
      hoverFactor: particleHoverFactor,
      moveParticlesOnHover,
      speed,
      disableRotation,
      alphaParticles,
      cameraDistance,
      spread: particleSpread,
      baseSize: particleBaseSize,
      sizeRandomness,
      elapsed: 0,
      lastTime: performance.now(),
      viewMatrix: new Float32Array(16),
      projectionMatrix: new Float32Array(16),
      modelMatrix: new Float32Array(16),
      resizeObserver: null,
      pointerMoveHandler: () => {},
      pointerLeaveHandler: () => {},
      start: () => {},
      stop: () => {},
    };

    const resize = () => {
      console.log('resize');
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
      gl.viewport(0, 0, width, height);
      computeProjection(state);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    state.resizeObserver = resizeObserver;

    window.addEventListener('resize', resize);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      state.pointer.inside =
        state.pointer.x >= -1 && state.pointer.x <= 1 && state.pointer.y >= -1 && state.pointer.y <= 1;
      if (!state.animationFrame) state.start();
    };

    const handlePointerLeave = () => {
      state.pointer.inside = false;
    };

    const render = (now: number) => {
      state.animationFrame = requestAnimationFrame(render);
      const delta = now - state.lastTime;
      state.lastTime = now;
      state.elapsed += delta * state.speed;

      const time = state.elapsed * 0.001;
      uniforms.uTime && gl.uniform1f(uniforms.uTime, time);
      updateModelMatrix(state, time);
      drawScene(state);
    };

    state.pointerMoveHandler = handlePointerMove;
    state.pointerLeaveHandler = handlePointerLeave;
    state.start = () => {
      if (state.animationFrame) return;
      state.animationFrame = requestAnimationFrame(render);
    };
    state.stop = () => {
      if (!state.animationFrame) return;
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = 0;
    };

    const cleanup = () => {
      state.stop();
      state.resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      detachPointerHandlers(state);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(randomBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      glStateRef.current = null;
    };

    glStateRef.current = state;
    
    resize();
    rebuildParticles(state, particleCount, particleColors);
    updateUniforms(state, { particleSpread, particleBaseSize, sizeRandomness, alphaParticles });
    computeProjection(state);
    attachPointerHandlers(state);
    state.start();

    return cleanup;
  }, [containerRef]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    rebuildParticles(state, particleCount, particleColors);
  }, [particleCount, particleColors]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    updateUniforms(state, { particleSpread, particleBaseSize, sizeRandomness, alphaParticles });
  }, [particleSpread, particleBaseSize, sizeRandomness, alphaParticles]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    state.speed = speed;
    state.disableRotation = disableRotation;
    state.cameraDistance = cameraDistance;
    computeProjection(state);
  }, [speed, disableRotation, cameraDistance]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    state.hoverFactor = particleHoverFactor;
    state.moveParticlesOnHover = moveParticlesOnHover;
    detachPointerHandlers(state);
    attachPointerHandlers(state);
  }, [moveParticlesOnHover, particleHoverFactor]);

  const wrapperClassName = className ? `${styles.wrapper} ${className}` : styles.wrapper;
  return <div ref={containerRef} className={wrapperClassName} />;
};

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState(props.value || ["#ffffff", "#ffffff", "#ffffff"]);
  const handleChange = (color: string, index: number) => {
    setValue(value.map((c: string, i: number) => i === index ? color : c));
    props.onChange?.(value);
  }

  return <SilkeBox gap="s" vAlign="center" hAlign="start" vPad="s">
    <SilkeText>Particles Colors</SilkeText>
    <SilkeBox gap="s" align="center" vPad="s">
    {value.map((color: string, index: number) => (
      <SilkeColorPickerButton  value={color} size="s" onChange={(v) => handleChange(v, index)} key={index} /> 
    ))}
  </SilkeBox>
  </SilkeBox>
}


registerVevComponent(Particles, {
  name: "Particles",
  props: [
    { name: "particleColors", type: "array", initialValue: ["#ffffff", "#ffffff", "#ffffff"], component: multipleColorSelect, of: "string" },
    { name: "particleCount", type: "number", initialValue: 200, options:{
      display: "slider",
      min: 0,
      max: 1000,
    } },
    { name: "particleSpread", type: "number", initialValue: 10, options:{
      display: "slider",
      min: 0,
      max: 100,
    } },
    { name: "speed", type: "number", initialValue: 0.1, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "particleBaseSize",title: "Base Size", type: "number", initialValue: 100, options:{
      display: "slider",
      min: 0,
      max: 100,
    } },
  

    { name: "moveParticlesOnHover", title: "Mouse interaction", type: "boolean", initialValue: false },
    { name: "alphaParticles",title: "Particles transparency", type: "boolean", initialValue: false },
    { name: "disableRotation",title: "Disable rotation", type: "boolean", initialValue: false },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Particles;

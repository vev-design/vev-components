import React, { useCallback, useEffect, useRef } from 'react';
import styles from './Galaxy.module.css';
import { registerVevComponent } from '@vev/react';
import { animationManager } from './AnimationManager';

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;
uniform float uOpacity;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5; 
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      vec3 color = vec3(1.0);

      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;
      
      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

  vec2 mouseNorm = uMouse - vec2(0.5);
  
  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;

  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  if (uTransparent) {
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha);
    alpha = min(alpha, 1.0);
    gl_FragColor = vec4(col, alpha * uOpacity);
  } else {
    gl_FragColor = vec4(col, uOpacity);
  }
}
`;

type Vec2 = [number, number];

interface GalaxyProps extends React.HTMLAttributes<HTMLDivElement> {
  focal?: Vec2;
  rotation?: Vec2;
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseRepulsion?: boolean;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  repulsionStrength?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
  opacity?: number;
  hostRef: React.RefObject<HTMLDivElement>;
}

type UniformName =
  | 'uTime'
  | 'uResolution'
  | 'uFocal'
  | 'uRotation'
  | 'uStarSpeed'
  | 'uDensity'
  | 'uSpeed'
  | 'uMouse'
  | 'uGlowIntensity'
  | 'uSaturation'
  | 'uMouseRepulsion'
  | 'uTwinkleIntensity'
  | 'uRotationSpeed'
  | 'uRepulsionStrength'
  | 'uMouseActiveFactor'
  | 'uAutoCenterRepulsion'
  | 'uTransparent'
  | 'uOpacity';

type UniformValue = number | Float32Array | [number, number];

type UniformMetaType = 'float' | 'vec2' | 'vec3' | 'int';

const UNIFORM_META: Record<UniformName, UniformMetaType> = {
  uTime: 'float',
  uResolution: 'vec3',
  uFocal: 'vec2',
  uRotation: 'vec2',
  uStarSpeed: 'float',
  uDensity: 'float',
  uSpeed: 'float',
  uMouse: 'vec2',
  uGlowIntensity: 'float',
  uSaturation: 'float',
  uMouseRepulsion: 'int',
  uTwinkleIntensity: 'float',
  uRotationSpeed: 'float',
  uRepulsionStrength: 'float',
  uMouseActiveFactor: 'float',
  uAutoCenterRepulsion: 'float',
  uTransparent: 'int',
  uOpacity: 'float'
};

const FLOAT_SMOOTHED: UniformName[] = [
  'uDensity',
  'uGlowIntensity',
  'uSaturation',
  'uTwinkleIntensity',
  'uRotationSpeed',
  'uRepulsionStrength',
  'uAutoCenterRepulsion',
  'uSpeed',
  'uOpacity'
];

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || 'Unknown shader compile error');
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext, vertex: string, fragment: string) => {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || 'Unknown program link error');
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
};

const buildResolution = (width: number, height: number) =>
  new Float32Array([width, height, width / Math.max(height, 1)]);

const toVec2 = (value: Vec2) => new Float32Array(value);

function Galaxy({
  focal = [0.5, 0.5],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  mouseRepulsion = true,
  repulsionStrength = 2,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  autoCenterRepulsion = 0,
  transparent = true,
  opacity = 1.0,
  hostRef,
  ...rest
}: GalaxyProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformLocationsRef = useRef<Record<UniformName, WebGLUniformLocation | null>>(
    {} as Record<UniformName, WebGLUniformLocation | null>
  );
  const uniformValuesRef = useRef<Record<UniformName, UniformValue>>({} as Record<
    UniformName,
    UniformValue
  >);
  const floatTargetsRef = useRef<Partial<Record<UniformName, number>>>({});
  const instanceIdRef = useRef<string>(`galaxy-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`);
  const lastTimeRef = useRef<number>(0);
  const logicalTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  const starSpeedRef = useRef<number>(starSpeed);
  const disableAnimationRef = useRef<boolean>(disableAnimation);
  const mouseInteractionRef = useRef<boolean>(mouseInteraction);
  const pointerTargetRef = useRef<[number, number]>([0.5, 0.5]);
  const pointerValueRef = useRef<[number, number]>([0.5, 0.5]);
  const pointerActiveTargetRef = useRef<number>(0);
  const pointerActiveRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const lastUniformValuesRef = useRef<Map<UniformName, UniformValue>>(new Map());
  const wasPausedRef = useRef<boolean>(false);
  const drawSceneRef = useRef<(() => void) | null>(null);

  const applyUniform = useCallback((name: UniformName, value: UniformValue) => {
    const gl = glRef.current;
    const location = uniformLocationsRef.current[name];
    if (!gl || !location) return;

    const type = UNIFORM_META[name];
    if (value instanceof Float32Array) {
      if (type === 'vec2') {
        gl.uniform2fv(location, value);
      } else {
        gl.uniform3fv(location, value);
      }
    } else if (Array.isArray(value)) {
      gl.uniform2f(location, value[0], value[1]);
    } else if (type === 'int') {
      gl.uniform1i(location, value);
    } else {
      gl.uniform1f(location, value);
    }
    uniformValuesRef.current[name] = value;
  }, []);

  const setNumericTarget = useCallback(
    (name: UniformName, value: number) => {
      const type = UNIFORM_META[name];
      if (type === 'int') {
        applyUniform(name, Math.round(value));
        return;
      }
      floatTargetsRef.current[name] = value;
      if (uniformValuesRef.current[name] === undefined && glRef.current) {
        applyUniform(name, value);
      }
    },
    [applyUniform]
  );

  const updateVec2Uniform = useCallback((name: UniformName, value: Vec2) => {
    applyUniform(name, toVec2(value));
  }, [applyUniform]);

  useEffect(() => {
    speedRef.current = speed;
    setNumericTarget('uSpeed', speed);
  }, [speed, setNumericTarget]);

  useEffect(() => {
    starSpeedRef.current = starSpeed;
  }, [starSpeed]);

  useEffect(() => {
    disableAnimationRef.current = disableAnimation;
  }, [disableAnimation]);

  useEffect(() => {
    mouseInteractionRef.current = mouseInteraction;
    if (!mouseInteraction) {
      pointerTargetRef.current = [0.5, 0.5];
      pointerActiveTargetRef.current = 0;
    }
    // Update priority based on interaction state
    if (isVisibleRef.current) {
      animationManager.setPriority(instanceIdRef.current, mouseInteraction ? 10 : 5);
    }
  }, [mouseInteraction]);

  useEffect(() => updateVec2Uniform('uFocal', focal), [focal, updateVec2Uniform]);
  useEffect(() => updateVec2Uniform('uRotation', rotation), [rotation, updateVec2Uniform]);
  useEffect(() => setNumericTarget('uDensity', density), [density, setNumericTarget]);
  useEffect(() => setNumericTarget('uGlowIntensity', glowIntensity), [glowIntensity, setNumericTarget]);
  useEffect(() => setNumericTarget('uSaturation', saturation), [saturation, setNumericTarget]);
  useEffect(() => setNumericTarget('uTwinkleIntensity', twinkleIntensity), [twinkleIntensity, setNumericTarget]);
  useEffect(() => setNumericTarget('uRotationSpeed', rotationSpeed), [rotationSpeed, setNumericTarget]);
  useEffect(() => setNumericTarget('uRepulsionStrength', repulsionStrength), [repulsionStrength, setNumericTarget]);
  useEffect(() => setNumericTarget('uAutoCenterRepulsion', autoCenterRepulsion), [autoCenterRepulsion, setNumericTarget]);
  useEffect(() => setNumericTarget('uMouseRepulsion', mouseRepulsion ? 1 : 0), [mouseRepulsion, setNumericTarget]);
  useEffect(() => setNumericTarget('uOpacity', opacity), [opacity, setNumericTarget]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.className = styles.canvas;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    // Performance detection: detect low-end devices
    const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const maxPixelRatio = isLowEndDevice ? 1.5 : Math.min(window.devicePixelRatio || 1, 2);
    
    // Disable antialiasing on low-end devices for better performance
    const gl = canvas.getContext('webgl', { 
      antialias: !isLowEndDevice, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    if (!gl) {
      console.error('WebGL not supported');
      return () => { };
    }
    glRef.current = gl;

    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);
    programRef.current = program;

    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 1);
    }

    const positionLocation = gl.getAttribLocation(program, 'position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    (Object.keys(UNIFORM_META) as UniformName[]).forEach((name) => {
      const location = gl.getUniformLocation(program, name);
      uniformLocationsRef.current[name] = location;
    });

    applyUniform('uFocal', toVec2(focal));
    applyUniform('uRotation', toVec2(rotation));
    applyUniform('uDensity', density);
    floatTargetsRef.current.uDensity = density;
    applyUniform('uGlowIntensity', glowIntensity);
    floatTargetsRef.current.uGlowIntensity = glowIntensity;
    applyUniform('uSaturation', saturation);
    floatTargetsRef.current.uSaturation = saturation;
    applyUniform('uTwinkleIntensity', twinkleIntensity);
    floatTargetsRef.current.uTwinkleIntensity = twinkleIntensity;
    applyUniform('uRotationSpeed', rotationSpeed);
    floatTargetsRef.current.uRotationSpeed = rotationSpeed;
    applyUniform('uRepulsionStrength', repulsionStrength);
    floatTargetsRef.current.uRepulsionStrength = repulsionStrength;
    applyUniform('uAutoCenterRepulsion', autoCenterRepulsion);
    floatTargetsRef.current.uAutoCenterRepulsion = autoCenterRepulsion;
    const mouseRepelValue = mouseRepulsion ? 1 : 0;
    applyUniform('uMouseRepulsion', mouseRepelValue);
    floatTargetsRef.current.uMouseRepulsion = mouseRepelValue;
    applyUniform('uSpeed', speed);
    floatTargetsRef.current.uSpeed = speed;
    applyUniform('uTransparent', transparent ? 1 : 0);
    floatTargetsRef.current.uTransparent = transparent ? 1 : 0;
    applyUniform('uOpacity', opacity);
    floatTargetsRef.current.uOpacity = opacity;
    applyUniform('uMouse', [0.5, 0.5]);
    applyUniform('uMouseActiveFactor', 0);

    const drawScene = () => {
      if (!glRef.current) return;
      glRef.current.drawArrays(glRef.current.TRIANGLES, 0, 3);
    };
    drawSceneRef.current = drawScene;

    let resizeTimeout: number | null = null;
    const resize = () => {
      if (resizeTimeout) return;
      resizeTimeout = window.setTimeout(() => {
        resizeTimeout = null;
        if (!canvasRef.current || !glRef.current) return;
        const rect = container.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
        const width = Math.max(1, Math.floor(rect.width * ratio));
        const height = Math.max(1, Math.floor(rect.height * ratio));
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        applyUniform('uResolution', buildResolution(width, height));
        drawScene();
      }, 100);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    // Throttle mouse move events for better performance
    let mouseUpdateTimeout: number | null = null;
    const updateMousePosition = (x: number, y: number, active: number) => {
      if (mouseUpdateTimeout) return;
      mouseUpdateTimeout = window.setTimeout(() => {
        mouseUpdateTimeout = null;
        pointerTargetRef.current = [x, y];
        pointerActiveTargetRef.current = active;
      }, 16); // ~60fps max update rate for mouse
    };

 
    const handlePointerLeave = () => {
      updateMousePosition(0.5, 0.5, 0);
    };

    const handleWindowMouseMove = (event: MouseEvent) => {
      if (!mouseInteractionRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      updateMousePosition(x, y, inside ? 1 : 0);
    };

    canvas.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    hostRef.current?.addEventListener('mousemove', handleWindowMouseMove, { passive: true });

    // Animation loop callback - registered with shared AnimationManager
    const animationCallback = (timestamp: number, delta: number) => {
      if (!glRef.current || !isVisibleRef.current) return;

      // Handle resume - force update all uniforms on first frame after resume
      const isResuming = wasPausedRef.current;
      if (isResuming) {
        wasPausedRef.current = false;
        // Force update all uniforms on resume to prevent glitch
        lastUniformValuesRef.current.clear();
        // Use a very small, fixed delta on first frame to continue smoothly without jump
        // This simulates a normal frame interval
        const resumeDelta = 1 / 60; // ~16ms, one frame
        if (!disableAnimationRef.current) {
          logicalTimeRef.current += resumeDelta * speedRef.current;
        }
      } else {
        // Normal time advancement (skip if animation disabled)
        if (!disableAnimationRef.current) {
          logicalTimeRef.current += delta * speedRef.current;
        }
      }

      const currentTime = logicalTimeRef.current;
      
      // Always update time uniforms (or if resuming, force update)
      const timeValue = currentTime;
      const lastTime = lastUniformValuesRef.current.get('uTime');
      if (isResuming || lastTime !== timeValue) {
        applyUniform('uTime', timeValue);
        lastUniformValuesRef.current.set('uTime', timeValue);
      }
      
      const starSpeedValue = (currentTime * starSpeedRef.current) / 10;
      const lastStarSpeed = lastUniformValuesRef.current.get('uStarSpeed');
      if (isResuming || lastStarSpeed !== starSpeedValue) {
        applyUniform('uStarSpeed', starSpeedValue);
        lastUniformValuesRef.current.set('uStarSpeed', starSpeedValue);
      }

      // Smooth mouse interpolation
      const tau = 0.2;
      const factor = delta > 0 ? 1 - Math.exp(-delta / tau) : 1;
      const target = pointerTargetRef.current;
      const current = pointerValueRef.current;
      current[0] += (target[0] - current[0]) * factor;
      current[1] += (target[1] - current[1]) * factor;
      pointerValueRef.current = current;
      
      // Update mouse uniform (always on resume, or if changed significantly)
      const mouseValue: [number, number] = [current[0], current[1]];
      const lastMouse = lastUniformValuesRef.current.get('uMouse') as [number, number] | undefined;
      if (isResuming || !lastMouse || Math.abs(mouseValue[0] - lastMouse[0]) > 0.001 || Math.abs(mouseValue[1] - lastMouse[1]) > 0.001) {
        applyUniform('uMouse', mouseValue);
        lastUniformValuesRef.current.set('uMouse', mouseValue);
      }

      pointerActiveRef.current +=
        (pointerActiveTargetRef.current - pointerActiveRef.current) * factor;
      const activeFactor = pointerActiveRef.current;
      const lastActiveFactor = lastUniformValuesRef.current.get('uMouseActiveFactor');
      if (isResuming || lastActiveFactor !== activeFactor) {
        applyUniform('uMouseActiveFactor', activeFactor);
        lastUniformValuesRef.current.set('uMouseActiveFactor', activeFactor);
      }

      // Smooth uniform transitions
      FLOAT_SMOOTHED.forEach((name) => {
        const target = floatTargetsRef.current[name];
        if (typeof target !== 'number') return;
        const current = (uniformValuesRef.current[name] as number) ?? target;
        
        // On resume, immediately set to target to prevent glitch
        if (isResuming) {
          applyUniform(name, target);
          lastUniformValuesRef.current.set(name, target);
          return;
        }
        
        if (Math.abs(target - current) < 1e-4) {
          if (uniformValuesRef.current[name] !== target) {
            applyUniform(name, target);
            lastUniformValuesRef.current.set(name, target);
          }
          return;
        }
        const blend = Math.min(1, (delta || 0) * 6);
        const next = current + (target - current) * blend;
        applyUniform(name, next);
        lastUniformValuesRef.current.set(name, next);
      });

      drawScene();
    };

    // Register with shared animation manager
    // Priority based on visibility and interaction
    const priority = isVisibleRef.current ? (mouseInteractionRef.current ? 10 : 5) : 0;
    animationManager.register(instanceIdRef.current, animationCallback, priority);

    // Force immediate redraw with fresh uniforms when resuming (prevents glitch)
    const forceRedrawOnResume = () => {
      if (!glRef.current || !isVisibleRef.current) return;
      
      // Update resolution in case container size changed while paused
      if (canvasRef.current) {
        const rect = container.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.floor(rect.width * ratio));
        const height = Math.max(1, Math.floor(rect.height * ratio));
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        glRef.current.viewport(0, 0, width, height);
        applyUniform('uResolution', buildResolution(width, height));
      }
      
      // The animation callback will handle uniform updates on next frame
      // Just trigger an immediate draw with current state
      // Use double requestAnimationFrame to ensure it happens after any pending updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animationCallback(0, 10);
          if (drawSceneRef.current && glRef.current && isVisibleRef.current) {
            drawSceneRef.current();
          }
        });
      });
    };

    forceRedrawOnResume();

    // Intersection Observer for better visibility detection
    // Using rootMargin to trigger slightly before element is fully visible for smoother transitions
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting ?? true;
        const wasPaused = !isVisibleRef.current && isVisible;
        isVisibleRef.current = isVisible;
        if (isVisible) {
          console.log('isVisible', isVisible);
          wasPausedRef.current = wasPaused;
          animationManager.resume(instanceIdRef.current);
          animationManager.setPriority(instanceIdRef.current, mouseInteractionRef.current ? 10 : 5);
          // Force immediate redraw to prevent glitch when coming into view
          if (wasPaused) {
            console.log('forceRedrawOnResume');
            forceRedrawOnResume();
          }
        } else {
          animationManager.pause(instanceIdRef.current);
          animationManager.setPriority(instanceIdRef.current, 0);
        }
      },
      { 
        threshold: 0.02,
        // Trigger slightly before element enters viewport for smoother transition
        rootMargin: '50px'
      }
    );
    intersectionObserver.observe(container);

    return () => {
  
      // Unregister from shared animation manager
      animationManager.unregister(instanceIdRef.current);
      
      // Cleanup visibility observers
      intersectionObserver.disconnect();
      
      // Cleanup timeouts
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (mouseUpdateTimeout) clearTimeout(mouseUpdateTimeout);
      
      // Cleanup observers and event listeners
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      hostRef.current?.removeEventListener('mousemove', handleWindowMouseMove);
      
      // Cleanup DOM
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      
      // Cleanup WebGL resources
      if (programRef.current && glRef.current) {
        glRef.current.deleteProgram(programRef.current);
      }
      programRef.current = null;
      glRef.current = null;
      canvasRef.current = null;
      uniformLocationsRef.current = {} as Record<UniformName, WebGLUniformLocation | null>;
      uniformValuesRef.current = {} as Record<UniformName, UniformValue>;
      lastUniformValuesRef.current.clear();
    };
  }, []);


  return <div ref={containerRef}   className={styles.wrapper} />;
}


registerVevComponent(Galaxy, {
  name: "Galaxy",
  props: [
    {
      name: "opacity", title: "Opacity", type: "number", initialValue: 1.0, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "density", title: "Density", type: "number", initialValue: 1, options: {
        display: "slider",
        min: 0,
        max: 3,
      }
    },
    {
      name: "glowIntensity", title: "Glow Intensity", type: "number", initialValue: 0.3, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "saturation", title: "Saturation", type: "number", initialValue: 0.0, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "twinkleIntensity", title: "Twinkle Intensity", type: "number", initialValue: 0.3, options: {
        display: "slider",
        min: 0,
        max: 1,
      }
    },
    {
      name: "rotationSpeed", title: "Rotation Speed", type: "number", initialValue: 0.1, options: {
        display: "slider",
        min: 0,
        max: 0.5,
      }
    },
    {
      name: "repulsionStrength", title: "Repulsion Strength", type: "number", initialValue: 2, options: {
        display: "slider",
        min: 0,
        max: 10,
      }
    },
    {
      name: "autoCenterRepulsion", title: "Auto Center Repulsion", type: "number", initialValue: 0, options: {
        display: "slider",
        min: 0,
        max: 20,
      }
    },
    {
      name: "starSpeed", title: "Star Speed", type: "number", initialValue: 0.5, options: {
        display: "slider",
        min: 0,
        max: 5,
      }
    },
    {
      name: "speed", title: "Animation Speed", type: "number", initialValue: 1.0, options: {
        display: "slider",
        min: 0,
        max: 3,
      }
    },
    { name: "mouseInteraction", title: "Mouse Interaction", type: "boolean", initialValue: true },
    { name: "mouseRepulsion", title: "Mouse Repulsion", type: "boolean", initialValue: true },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Galaxy;

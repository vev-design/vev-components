import React from "react";
import styles from "./FaultyTerminal.module.css";
import { registerVevComponent, useEditorState } from "@vev/react";
import { useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { SilkeColorPickerButton } from "@vev/silke";

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
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; 
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  // Optimized: reduced from 3 octaves to 2 for weak devices
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;

  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.5;

  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);

  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  // Optimized: simplified pattern with fewer FBM calls for weak devices
  vec2 offset1 = vec2(1.0);
  mat2 rot01 = rotate(0.1 * time);

  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = q * 0.5; // Simplified calculation
  return fbm(p + r * 0.5);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
    
    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;
        
        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }
    
    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
        
        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }
    
    p = fract(p);
    p *= uDigitSize;
    
    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);
    
    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;
    
    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
    
    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){

    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;

    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    // Optimized: reduce from 9 samples to 5 for better performance on weak devices
    float middle = digit(p);
    const float off = 0.002;
    float sum = digit(p + vec2(-off, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(0.0, -off)) + digit(p + vec2(0.0, off));

    vec3 baseColor = vec3(0.9) * middle + sum * 0.15 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }
    
    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3)
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

// Global cache for instant remounting when scrolling
// Stores canvas, context, and compiled program for reuse
const globalCache = {
  canvas: null as HTMLCanvasElement | null,
  gl: null as WebGLRenderingContext | null,
  program: null as WebGLProgram | null,
  buffers: null as { position: WebGLBuffer | null; uv: WebGLBuffer | null } | null,
  inUse: false,
  initialized: false
};

// Pre-warm cache on module load for instant first mount
function initializeCache() {
  if (globalCache.initialized || typeof document === 'undefined') return;

  try {
    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    });

    if (!gl) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    // Create buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, 1, 1
    ]), gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 1, 0, 0, 1, 1, 1
    ]), gl.STATIC_DRAW);

    globalCache.canvas = canvas;
    globalCache.gl = gl;
    globalCache.program = program;
    globalCache.buffers = { position: positionBuffer, uv: uvBuffer };
    globalCache.initialized = true;
  } catch (e) {
    // Silently fail - will create on first mount
  }
}

// Initialize cache immediately on module load
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(() => initializeCache(), { timeout: 100 });
} else {
  setTimeout(initializeCache, 0);
}

// Simple shader compilation - no caching for simplicity and reliability
function compileShaders(gl: WebGLRenderingContext, vertSource: string, fragSource: string) {
  const vertShader = compileShader(gl, vertSource, gl.VERTEX_SHADER);
  const fragShader = compileShader(gl, fragSource, gl.FRAGMENT_SHADER);

  if (vertShader && fragShader) {
    return { vertexShader: vertShader, fragmentShader: fragShader };
  }

  return null;
}

interface WebGLState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: { [key: string]: WebGLUniformLocation | null };
  buffers: { position: WebGLBuffer | null; uv: WebGLBuffer | null };
}

function compileShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertSource: string, fragSource: string): WebGLProgram | null {
  const shaders = compileShaders(gl, vertSource, fragSource);

  if (!shaders) return null;

  const program = gl.createProgram();
  if (!program) {
    // Clean up shaders if program creation fails
    gl.deleteShader(shaders.vertexShader);
    gl.deleteShader(shaders.fragmentShader);
    return null;
  }

  gl.attachShader(program, shaders.vertexShader);
  gl.attachShader(program, shaders.fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    // Clean up shaders on link failure
    gl.deleteShader(shaders.vertexShader);
    gl.deleteShader(shaders.fragmentShader);
    return null;
  }

  // After successful linking, shaders can be detached and deleted
  // The program retains the compiled code
  gl.detachShader(program, shaders.vertexShader);
  gl.detachShader(program, shaders.fragmentShader);
  gl.deleteShader(shaders.vertexShader);
  gl.deleteShader(shaders.fragmentShader);

  return program;
}

function FaultyTerminal({
  scale = 1,
  gridMul = [2, 1],
  digitSize = 1.5,
  timeScale = 0.3,
  pause = false,
  scanlineIntensity = 0.3,
  glitchAmount = 1,
  flickerAmount = 1,
  noiseAmp = 0,
  chromaticAberration = 0,
  dither = 0,
  curvature = 0.2,
  tint = '#ffffff',
  mouseReact = true,
  mouseStrength = 0.2,
  dpr = 1, // Force 1x resolution for maximum performance on weak devices
  pageLoadAnimation = true,
  brightness = 1,
  className,
  style,
  ...rest
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glStateRef = useRef<WebGLState | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const frozenTimeRef = useRef(0);
  const loadAnimationStartRef = useRef(0);
  const timeOffsetRef = useRef(Math.random() * 100);
  const startTimeRef = useRef(0);
  const lastUpdateRef = useRef<{[key: string]: any}>({});
  const mouseListenerAddedRef = useRef(false);

  // Detect editor mode to pause heavy operations
  const editorState = useEditorState();
  const isEditorMode = editorState?.disabled ?? false;

  // Memoize the processed dither value to avoid recalculation
  const processedDither = useMemo(() =>
    typeof dither === 'boolean' ? (dither ? 1 : 0) : dither,
    [dither]
  );

  // Memoize tint RGB conversion - expensive operation
  const tintRgb = useMemo(() => hexToRgb(tint), [tint]);

  // Props refs for smooth updates - initialize once
  const propsRef = useRef({
    scale,
    gridMul,
    digitSize,
    timeScale,
    pause,
    scanlineIntensity,
    glitchAmount,
    flickerAmount,
    noiseAmp,
    chromaticAberration,
    dither: processedDither,
    curvature,
    tint,
    mouseReact,
    mouseStrength,
    pageLoadAnimation,
    brightness
  });

  // Update props ref synchronously
  useLayoutEffect(() => {
    propsRef.current = {
      scale,
      gridMul,
      digitSize,
      timeScale,
      pause,
      scanlineIntensity,
      glitchAmount,
      flickerAmount,
      noiseAmp,
      chromaticAberration,
      dither: processedDither,
      curvature,
      tint,
      mouseReact,
      mouseStrength,
      pageLoadAnimation,
      brightness
    };
  }, [scale, gridMul, digitSize, timeScale, pause, scanlineIntensity, glitchAmount, flickerAmount, noiseAmp, chromaticAberration, processedDither, curvature, tint, mouseReact, mouseStrength, pageLoadAnimation, brightness]);

  // Memoize mouse handler to avoid recreation
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const ctn = containerRef.current;
    if (!ctn) return;
    const rect = ctn.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    mouseRef.current = { x, y };
  }, []);

  // Use useLayoutEffect for instant rendering before browser paint
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let canvas: HTMLCanvasElement;
    let gl: WebGLRenderingContext;
    let program: WebGLProgram;
    let positionBuffer: WebGLBuffer | null;
    let uvBuffer: WebGLBuffer | null;
    let isReused = false;

    // Try to reuse cached resources for instant remounting (including first mount)
    if (globalCache.initialized && globalCache.canvas && globalCache.gl &&
        globalCache.program && globalCache.buffers && !globalCache.inUse) {
      canvas = globalCache.canvas;
      gl = globalCache.gl;
      program = globalCache.program;
      positionBuffer = globalCache.buffers.position;
      uvBuffer = globalCache.buffers.uv;
      globalCache.inUse = true;
      isReused = true;
    } else {
      // Create new resources only if cache unavailable
      canvas = document.createElement('canvas');
      canvas.className = styles.canvas;

      const glContext = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false
      });

      if (!glContext) {
        console.error('WebGL not supported');
        return;
      }
      gl = glContext;

      const createdProgram = createProgram(gl, vertexShader, fragmentShader);
      if (!createdProgram) return;
      program = createdProgram;

      // Create buffers
      positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
      ]), gl.STATIC_DRAW);

      uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 0, 1, 0, 0, 1, 1, 1
      ]), gl.STATIC_DRAW);

      // Store in cache for next mount
      globalCache.canvas = canvas;
      globalCache.gl = gl;
      globalCache.program = program;
      globalCache.buffers = { position: positionBuffer, uv: uvBuffer };
      globalCache.initialized = true;
      globalCache.inUse = true;
    }

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvasRef.current = canvas;
    container.appendChild(canvas);

    gl.useProgram(program);

    // Get uniform locations
    const getUniformLocation = (name: string) => gl.getUniformLocation(program, name);
    const uniforms: { [key: string]: WebGLUniformLocation | null } = {
      iTime: getUniformLocation('iTime'),
      iResolution: getUniformLocation('iResolution'),
      uScale: getUniformLocation('uScale'),
      uGridMul: getUniformLocation('uGridMul'),
      uDigitSize: getUniformLocation('uDigitSize'),
      uScanlineIntensity: getUniformLocation('uScanlineIntensity'),
      uGlitchAmount: getUniformLocation('uGlitchAmount'),
      uFlickerAmount: getUniformLocation('uFlickerAmount'),
      uNoiseAmp: getUniformLocation('uNoiseAmp'),
      uChromaticAberration: getUniformLocation('uChromaticAberration'),
      uDither: getUniformLocation('uDither'),
      uCurvature: getUniformLocation('uCurvature'),
      uTint: getUniformLocation('uTint'),
      uMouse: getUniformLocation('uMouse'),
      uMouseStrength: getUniformLocation('uMouseStrength'),
      uUseMouse: getUniformLocation('uUseMouse'),
      uPageLoadProgress: getUniformLocation('uPageLoadProgress'),
      uUsePageLoadAnimation: getUniformLocation('uUsePageLoadAnimation'),
      uBrightness: getUniformLocation('uBrightness')
    };

    const state: WebGLState = {
      gl,
      program,
      uniforms,
      buffers: {
        position: positionBuffer,
        uv: uvBuffer
      }
    };
    glStateRef.current = state;

    // Set up attributes for rendering
    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    const uvLoc = gl.getAttribLocation(program, 'aUv');

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    // Store attribute locations for cleanup
    const attributeLocations = { position: positionLoc, uv: uvLoc };

    // Set clear color
    gl.clearColor(0, 0, 0, 1);

    const setSize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      // Cap at 1.0 DPR for weak devices - prioritize frame rate over resolution
      const dprValue = Math.min(window.devicePixelRatio || 1, 1);
      canvas.width = w * dprValue;
      canvas.height = h * dprValue;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uniforms.iResolution) {
        gl.uniform3f(uniforms.iResolution, canvas.width, canvas.height, canvas.width / canvas.height);
      }
    };

    setSize();

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(setSize);
      ro.observe(container);
      resizeObserverRef.current = ro;
    } else {
      // Fallback: listen on window, not container (elements don't fire resize events)
      window.addEventListener('resize', setSize);
    }

    // Set initial uniforms
    const initialProps = propsRef.current;
    const [tintR, tintG, tintB] = tintRgb;

    if (uniforms.uScale) gl.uniform1f(uniforms.uScale, initialProps.scale);
    if (uniforms.uGridMul) gl.uniform2f(uniforms.uGridMul, initialProps.gridMul[0], initialProps.gridMul[1]);
    if (uniforms.uDigitSize) gl.uniform1f(uniforms.uDigitSize, initialProps.digitSize);
    if (uniforms.uScanlineIntensity) gl.uniform1f(uniforms.uScanlineIntensity, initialProps.scanlineIntensity);
    if (uniforms.uGlitchAmount) gl.uniform1f(uniforms.uGlitchAmount, initialProps.glitchAmount);
    if (uniforms.uFlickerAmount) gl.uniform1f(uniforms.uFlickerAmount, initialProps.flickerAmount);
    if (uniforms.uNoiseAmp) gl.uniform1f(uniforms.uNoiseAmp, initialProps.noiseAmp);
    if (uniforms.uChromaticAberration) gl.uniform1f(uniforms.uChromaticAberration, initialProps.chromaticAberration);
    if (uniforms.uDither) gl.uniform1f(uniforms.uDither, initialProps.dither);
    if (uniforms.uCurvature) gl.uniform1f(uniforms.uCurvature, initialProps.curvature);
    if (uniforms.uTint) gl.uniform3f(uniforms.uTint, tintR, tintG, tintB);
    if (uniforms.uMouse) gl.uniform2f(uniforms.uMouse, smoothMouseRef.current.x, smoothMouseRef.current.y);
    if (uniforms.uMouseStrength) gl.uniform1f(uniforms.uMouseStrength, initialProps.mouseStrength);
    if (uniforms.uUseMouse) gl.uniform1f(uniforms.uUseMouse, initialProps.mouseReact ? 1 : 0);
    if (uniforms.uPageLoadProgress) gl.uniform1f(uniforms.uPageLoadProgress, initialProps.pageLoadAnimation ? 0 : 1);
    if (uniforms.uUsePageLoadAnimation) gl.uniform1f(uniforms.uUsePageLoadAnimation, initialProps.pageLoadAnimation ? 1 : 0);
    if (uniforms.uBrightness) gl.uniform1f(uniforms.uBrightness, initialProps.brightness);

    startTimeRef.current = performance.now();
    loadAnimationStartRef.current = 0;

    // WebGL context loss/restore handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const handleContextRestored = () => {
      // Context restored - component would need full reinitialization
      console.log('WebGL context restored');
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Mouse interaction - only in preview mode (not in editor)
    if (!isEditorMode) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      mouseListenerAddedRef.current = true;
    }

    // Animation loop
    const animate = (currentTime: number) => {
      if (!glStateRef.current) return;

      const props = propsRef.current;

      let elapsed: number;

      // In editor mode, use static time but keep rendering for prop changes
      if (isEditorMode) {
        elapsed = 0.5; // Fixed time for consistent editor preview
        if (uniforms.uPageLoadProgress) gl.uniform1f(uniforms.uPageLoadProgress, 1);
      } else {
        // Normal animation in preview mode
        if (props.pageLoadAnimation && loadAnimationStartRef.current === 0) {
          loadAnimationStartRef.current = currentTime;
        }

        if (!props.pause) {
          elapsed = ((currentTime * 0.001) + timeOffsetRef.current) * props.timeScale;
          frozenTimeRef.current = elapsed;
        } else {
          elapsed = frozenTimeRef.current;
        }

        if (props.pageLoadAnimation && loadAnimationStartRef.current > 0) {
          const animationDuration = 2000;
          const animationElapsed = currentTime - loadAnimationStartRef.current;
          const progress = Math.min(animationElapsed / animationDuration, 1);
          if (uniforms.uPageLoadProgress) gl.uniform1f(uniforms.uPageLoadProgress, progress);
        }
      }

      if (uniforms.iTime) gl.uniform1f(uniforms.iTime, elapsed);

      // Skip mouse smoothing in editor mode for better performance
      if (props.mouseReact && !isEditorMode) {
        const dampingFactor = 0.08;
        const smoothMouse = smoothMouseRef.current;
        const mouse = mouseRef.current;
        smoothMouse.x += (mouse.x - smoothMouse.x) * dampingFactor;
        smoothMouse.y += (mouse.y - smoothMouse.y) * dampingFactor;
        if (uniforms.uMouse) gl.uniform2f(uniforms.uMouse, smoothMouse.x, smoothMouse.y);
      }

      // Batch uniform updates - only update when props actually change
      // This significantly reduces CPU overhead on weak devices
      const lastUpdate = lastUpdateRef.current;

      if (lastUpdate.scale !== props.scale) {
        if (uniforms.uScale) gl.uniform1f(uniforms.uScale, props.scale);
        lastUpdate.scale = props.scale;
      }
      if (lastUpdate.gridMul0 !== props.gridMul[0] || lastUpdate.gridMul1 !== props.gridMul[1]) {
        if (uniforms.uGridMul) gl.uniform2f(uniforms.uGridMul, props.gridMul[0], props.gridMul[1]);
        lastUpdate.gridMul0 = props.gridMul[0];
        lastUpdate.gridMul1 = props.gridMul[1];
      }
      if (lastUpdate.digitSize !== props.digitSize) {
        if (uniforms.uDigitSize) gl.uniform1f(uniforms.uDigitSize, props.digitSize);
        lastUpdate.digitSize = props.digitSize;
      }
      if (lastUpdate.scanlineIntensity !== props.scanlineIntensity) {
        if (uniforms.uScanlineIntensity) gl.uniform1f(uniforms.uScanlineIntensity, props.scanlineIntensity);
        lastUpdate.scanlineIntensity = props.scanlineIntensity;
      }
      if (lastUpdate.glitchAmount !== props.glitchAmount) {
        if (uniforms.uGlitchAmount) gl.uniform1f(uniforms.uGlitchAmount, props.glitchAmount);
        lastUpdate.glitchAmount = props.glitchAmount;
      }
      if (lastUpdate.flickerAmount !== props.flickerAmount) {
        if (uniforms.uFlickerAmount) gl.uniform1f(uniforms.uFlickerAmount, props.flickerAmount);
        lastUpdate.flickerAmount = props.flickerAmount;
      }
      if (lastUpdate.noiseAmp !== props.noiseAmp) {
        if (uniforms.uNoiseAmp) gl.uniform1f(uniforms.uNoiseAmp, props.noiseAmp);
        lastUpdate.noiseAmp = props.noiseAmp;
      }
      if (lastUpdate.chromaticAberration !== props.chromaticAberration) {
        if (uniforms.uChromaticAberration) gl.uniform1f(uniforms.uChromaticAberration, props.chromaticAberration);
        lastUpdate.chromaticAberration = props.chromaticAberration;
      }
      if (lastUpdate.dither !== props.dither) {
        if (uniforms.uDither) gl.uniform1f(uniforms.uDither, props.dither);
        lastUpdate.dither = props.dither;
      }
      if (lastUpdate.curvature !== props.curvature) {
        if (uniforms.uCurvature) gl.uniform1f(uniforms.uCurvature, props.curvature);
        lastUpdate.curvature = props.curvature;
      }
      if (lastUpdate.mouseStrength !== props.mouseStrength) {
        if (uniforms.uMouseStrength) gl.uniform1f(uniforms.uMouseStrength, props.mouseStrength);
        lastUpdate.mouseStrength = props.mouseStrength;
      }
      const mouseReactVal = props.mouseReact ? 1 : 0;
      if (lastUpdate.mouseReact !== mouseReactVal) {
        if (uniforms.uUseMouse) gl.uniform1f(uniforms.uUseMouse, mouseReactVal);
        lastUpdate.mouseReact = mouseReactVal;
      }
      if (lastUpdate.brightness !== props.brightness) {
        if (uniforms.uBrightness) gl.uniform1f(uniforms.uBrightness, props.brightness);
        lastUpdate.brightness = props.brightness;
      }
      if (lastUpdate.tint !== props.tint) {
        const [tintR, tintG, tintB] = hexToRgb(props.tint);
        if (uniforms.uTint) gl.uniform3f(uniforms.uTint, tintR, tintG, tintB);
        lastUpdate.tint = props.tint;
      }

      // Render - vertex attributes and buffers are already set up
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      } else {
        // Fallback cleanup: remove from window, not container
        window.removeEventListener('resize', setSize);
      }

      // Remove WebGL context loss handlers
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      // Remove mouse listener if it was added (tracked by ref, not prop)
      if (mouseListenerAddedRef.current) {
        window.removeEventListener('mousemove', handleMouseMove);
        mouseListenerAddedRef.current = false;
      }

      // Clean up WebGL resources
      // If using cached resources, just mark as available - don't delete
      if (isReused) {
        // Just mark cache as available for next mount
        globalCache.inUse = false;
      } else {
        // Delete resources if not cached
        if (attributeLocations) {
          gl.disableVertexAttribArray(attributeLocations.position);
          gl.disableVertexAttribArray(attributeLocations.uv);
        }

        // Validate resources before deletion to handle context loss gracefully
        if (state.buffers.position && gl.isBuffer(state.buffers.position)) {
          gl.deleteBuffer(state.buffers.position);
        }
        if (state.buffers.uv && gl.isBuffer(state.buffers.uv)) {
          gl.deleteBuffer(state.buffers.uv);
        }
        if (program && gl.isProgram(program)) {
          gl.deleteProgram(program);
        }
      }

      // Remove canvas from DOM
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }

      loadAnimationStartRef.current = 0;
      timeOffsetRef.current = Math.random() * 100;
      glStateRef.current = null;
    };
  }, [tintRgb, handleMouseMove, isEditorMode]);

  return <div ref={containerRef} style={style} className={`${styles.wrapper}  ${className}`} />;
}


registerVevComponent(FaultyTerminal, {
  name: "FaultyTerminal",
  props: [
    { name: "scale", type: "number", initialValue: 1, options: { display: "slider", min: 1, max: 3 } },
    { name: "digitSize", title: "Digit Size", type: "number", initialValue: 1.5, options: { display: "slider", min: 0.5, max: 2 } },
    { name: "timeScale", title: "Speed", type: "number", initialValue: 0.3, options: { display: "slider", min: 0, max: 3 } },
    { name: "noiseAmp", title: "Noise Amplitude", type: "number", initialValue: 0, options: { display: "slider", min: 0.5, max: 1 } },
    { name: "brightness", title: "Brightness", type: "number", initialValue: 0.6, options: { display: "slider", min: 0.1, max: 1 } },
    { name: "scanlineIntensity", title: "Scanline Intensity", type: "number", initialValue: 0.5, options: { display: "slider", min: 0, max: 2 } },
    { name: "curvature", title: "Curvature", type: "number", initialValue: 0.1, options: { display: "slider", min: 0, max: 0.5 } },
    { name: "mouseStrength", title: "Mouse Strength", type: "number", initialValue: 0.5, options: { display: "slider", min: 0, max: 2 } },
    { name: "mouseReact", title: "Mouse interaction", type: "boolean", initialValue: true },
    { name: "tint", title: "Tint color", type: "string", initialValue: "#ffffff", component: SilkeColorPickerButton },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default FaultyTerminal;

import React, { useRef, useEffect, useState } from "react";
import styles from './lightrays.module.css';
import { registerVevComponent } from "@vev/react";
import { SilkeColorPickerButton } from "@vev/silke";

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

interface LightRaysProps {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  className?: string;
}

const DEFAULT_COLOR = '#ffffff';

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (
  origin: RaysOrigin,
  w: number,
  h: number
): { anchor: [number, number]; dir: [number, number] } => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: // "top-center"
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

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

const LightRays: React.FC<LightRaysProps> = ({
  raysOrigin = 'top-center',
  raysColor = DEFAULT_COLOR,
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0.0,
  distortion = 0.0,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({
    raysOrigin,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    followMouse,
    mouseInfluence,
    noiseAmount,
    distortion
  });
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const glStateRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    canvas: HTMLCanvasElement;
    uniforms: {
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
    };
    positionBuffer: WebGLBuffer;
    animationFrame: number;
    currentRaysColor: [number, number, number];
    currentRaysSpeed: number;
    currentLightSpread: number;
    currentRayLength: number;
    currentPulsating: number;
    currentFadeDistance: number;
    currentSaturation: number;
    currentMouseInfluence: number;
    currentNoiseAmount: number;
    currentDistortion: number;
    currentRayPos: [number, number];
    currentRayDir: [number, number];
    lastTime: number;
    resizeObserver: ResizeObserver | null;
  } | null>(null);

  // Update props ref when props change
  useEffect(() => {
    propsRef.current = {
      raysOrigin,
      raysColor,
      raysSpeed,
      lightSpread,
      rayLength,
      pulsating,
      fadeDistance,
      saturation,
      followMouse,
      mouseInfluence,
      noiseAmount,
      distortion
    };
  }, [
    raysOrigin,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    followMouse,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Initialize WebGL once
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.warn('[LightRays] WebGL not supported');
      container.removeChild(canvas);
      return;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const createShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[LightRays] Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShaderObj = createShader(gl.VERTEX_SHADER, vertexShader);
    const fragmentShaderObj = createShader(gl.FRAGMENT_SHADER, fragmentShader);
    if (!vertexShaderObj || !fragmentShaderObj) {
      container.removeChild(canvas);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      container.removeChild(canvas);
      return;
    }

    gl.attachShader(program, vertexShaderObj);
    gl.attachShader(program, fragmentShaderObj);
    gl.linkProgram(program);
    gl.deleteShader(vertexShaderObj);
    gl.deleteShader(fragmentShaderObj);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[LightRays] Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    const positions = new Float32Array([
      -1, -1,
       3, -1,
      -1,  3,
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
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

    const initialColor = hexToRgb(raysColor);
    const { anchor, dir } = getAnchorAndDir(raysOrigin, 1, 1);

    const state = {
      gl,
      program,
      canvas,
      uniforms,
      positionBuffer,
      animationFrame: 0,
      currentRaysColor: initialColor,
      currentRaysSpeed: raysSpeed,
      currentLightSpread: lightSpread,
      currentRayLength: rayLength,
      currentPulsating: pulsating ? 1.0 : 0.0,
      currentFadeDistance: fadeDistance,
      currentSaturation: saturation,
      currentMouseInfluence: mouseInfluence,
      currentNoiseAmount: noiseAmount,
      currentDistortion: distortion,
      currentRayPos: anchor,
      currentRayDir: dir,
      lastTime: performance.now(),
      resizeObserver: null,
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        gl.viewport(0, 0, width, height);
        
        if (uniforms.iResolution) {
          gl.uniform2f(uniforms.iResolution, width, height);
        }

        const props = propsRef.current;
        const { anchor, dir } = getAnchorAndDir(props.raysOrigin, width, height);
        state.currentRayPos = anchor;
        state.currentRayDir = dir;
        if (uniforms.rayPos) gl.uniform2f(uniforms.rayPos, anchor[0], anchor[1]);
        if (uniforms.rayDir) gl.uniform2f(uniforms.rayDir, dir[0], dir[1]);
      }
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    state.resizeObserver = resizeObserver;
    window.addEventListener('resize', resize, { passive: true });
    resize();

    const handlePointerMove = (e: PointerEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseRef.current = { x, y };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const propLerpSpeed = 0.15;
    const mouseSmoothing = 0.88;

    const render = (now: number) => {
      state.animationFrame = requestAnimationFrame(render);
      
      const time = now * 0.001;
      const props = propsRef.current;

      if (uniforms.iTime) gl.uniform1f(uniforms.iTime, time);

      // Smoothly interpolate color
      const targetColor = hexToRgb(props.raysColor);
      state.currentRaysColor[0] += (targetColor[0] - state.currentRaysColor[0]) * propLerpSpeed;
      state.currentRaysColor[1] += (targetColor[1] - state.currentRaysColor[1]) * propLerpSpeed;
      state.currentRaysColor[2] += (targetColor[2] - state.currentRaysColor[2]) * propLerpSpeed;
      if (uniforms.raysColor) gl.uniform3f(uniforms.raysColor, state.currentRaysColor[0], state.currentRaysColor[1], state.currentRaysColor[2]);

      // Smoothly interpolate numeric props
      state.currentRaysSpeed += (props.raysSpeed - state.currentRaysSpeed) * propLerpSpeed;
      if (uniforms.raysSpeed) gl.uniform1f(uniforms.raysSpeed, state.currentRaysSpeed);

      state.currentLightSpread += (props.lightSpread - state.currentLightSpread) * propLerpSpeed;
      if (uniforms.lightSpread) gl.uniform1f(uniforms.lightSpread, state.currentLightSpread);

      state.currentRayLength += (props.rayLength - state.currentRayLength) * propLerpSpeed;
      if (uniforms.rayLength) gl.uniform1f(uniforms.rayLength, state.currentRayLength);

      const targetPulsating = props.pulsating ? 1.0 : 0.0;
      state.currentPulsating += (targetPulsating - state.currentPulsating) * propLerpSpeed;
      if (uniforms.pulsating) gl.uniform1f(uniforms.pulsating, state.currentPulsating);

      state.currentFadeDistance += (props.fadeDistance - state.currentFadeDistance) * propLerpSpeed;
      if (uniforms.fadeDistance) gl.uniform1f(uniforms.fadeDistance, state.currentFadeDistance);

      state.currentSaturation += (props.saturation - state.currentSaturation) * propLerpSpeed;
      if (uniforms.saturation) gl.uniform1f(uniforms.saturation, state.currentSaturation);

      state.currentMouseInfluence += (props.mouseInfluence - state.currentMouseInfluence) * propLerpSpeed;
      if (uniforms.mouseInfluence) gl.uniform1f(uniforms.mouseInfluence, state.currentMouseInfluence);

      state.currentNoiseAmount += (props.noiseAmount - state.currentNoiseAmount) * propLerpSpeed;
      if (uniforms.noiseAmount) gl.uniform1f(uniforms.noiseAmount, state.currentNoiseAmount);

      state.currentDistortion += (props.distortion - state.currentDistortion) * propLerpSpeed;
      if (uniforms.distortion) gl.uniform1f(uniforms.distortion, state.currentDistortion);

      // Update ray position/direction smoothly
      const { anchor, dir } = getAnchorAndDir(props.raysOrigin, canvas.width, canvas.height);
      state.currentRayPos[0] += (anchor[0] - state.currentRayPos[0]) * propLerpSpeed;
      state.currentRayPos[1] += (anchor[1] - state.currentRayPos[1]) * propLerpSpeed;
      state.currentRayDir[0] += (dir[0] - state.currentRayDir[0]) * propLerpSpeed;
      state.currentRayDir[1] += (dir[1] - state.currentRayDir[1]) * propLerpSpeed;
      if (uniforms.rayPos) gl.uniform2f(uniforms.rayPos, state.currentRayPos[0], state.currentRayPos[1]);
      if (uniforms.rayDir) gl.uniform2f(uniforms.rayDir, state.currentRayDir[0], state.currentRayDir[1]);

      // Smooth mouse tracking
      if (props.followMouse && props.mouseInfluence > 0.0) {
        smoothMouseRef.current.x = smoothMouseRef.current.x * mouseSmoothing + mouseRef.current.x * (1 - mouseSmoothing);
        smoothMouseRef.current.y = smoothMouseRef.current.y * mouseSmoothing + mouseRef.current.y * (1 - mouseSmoothing);
        if (uniforms.mousePos) gl.uniform2f(uniforms.mousePos, smoothMouseRef.current.x, smoothMouseRef.current.y);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    state.animationFrame = requestAnimationFrame(render);
    glStateRef.current = state;

    return () => {
      cancelAnimationFrame(state.animationFrame);
      state.resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      glStateRef.current = null;
    };
  }, [isVisible]); // Only re-initialize when visibility changes

  return <div ref={containerRef} className={[styles.wrapper, className].join(' ')} />;
};


const colorSelect = (props: any) => {
  return <SilkeColorPickerButton label="Rays Color" value={props.value} size="s" onChange={(v) => props.onChange?.(v)} />;
}


registerVevComponent(LightRays, {
  name: "LightRays",
  props: [
    { name: "raysColor", type: "string", initialValue: "#ffffff", component: colorSelect, },
    { name: "raysOrigin", type: "select", initialValue: "top-center", options:{
      display: "dropdown",
      items: [
        { label: "Top Center", value: "top-center" },
        { label: "Top Left", value: "top-left" },
        { label: "Top Right", value: "top-right" },
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
        { label: "Bottom Center", value: "bottom-center" },
        { label: "Bottom Left", value: "bottom-left" },
        { label: "Bottom Right", value: "bottom-right" },
      ],
    } },
    { name: "raysSpeed", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 3,
    } },
    { name: "lightSpread", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "rayLength", type: "number", initialValue: 3, options:{
      display: "slider",
      min: 0,
      max: 3,
    } },
    { name: "fadeDistance", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "saturation", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "mouseInfluence", type: "number", initialValue: 0.1, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "noiseAmount", type: "number", initialValue: 0.0, options:{
      display: "slider",
      min: 0,
      max: 0.5,
    } },
    { name: "distortion", type: "number", initialValue: 0.0, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "pulsating", type: "boolean", initialValue: false },
    { name: "followMouse", type: "boolean", initialValue: true },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default LightRays;

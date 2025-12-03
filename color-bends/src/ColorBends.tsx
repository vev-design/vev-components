import React, { useEffect, useRef, useState } from 'react';
import styles from './ColorBends.module.css';
import { registerVevComponent } from "@vev/react";
import { SilkeBox, SilkeButton, SilkeColorPickerButton } from '@vev/silke';

const MAX_COLORS = 8;

const frag = `
#define MAX_COLORS ${MAX_COLORS}
precision highp float;
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

    vec3 col = vec3(0.0);
    float a = 1.0;

    if (uColorCount > 0) {
      vec2 s = q;
      vec3 sumCol = vec3(0.0);
      float cover = 0.0;
      for (int i = 0; i < MAX_COLORS; ++i) {
            if (i >= uColorCount) break;
            s -= 0.01;
            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
            float kBelow = clamp(uWarpStrength, 0.0, 1.0);
            float kMix = pow(kBelow, 0.3);
            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
            vec2 disp = (r - s) * kBelow;
            vec2 warped = s + disp * gain;
            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
            float m = mix(m0, m1, kMix);
            float w = 1.0 - exp(-6.0 / exp(6.0 * m));
            sumCol += uColors[i] * w;
            cover = max(cover, w);
      }
      col = clamp(sumCol, 0.0, 1.0);
      a = uTransparent > 0 ? cover : 1.0;
    } else {
        vec2 s = q;
        for (int k = 0; k < 3; ++k) {
            s -= 0.01;
            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
            float kBelow = clamp(uWarpStrength, 0.0, 1.0);
            float kMix = pow(kBelow, 0.3);
            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
            vec2 disp = (r - s) * kBelow;
            vec2 warped = s + disp * gain;
            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
            float m = mix(m0, m1, kMix);
            col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
        }
        a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
    }

    if (uNoise > 0.0001) {
      float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
      col += (n - 0.5) * uNoise;
      col = clamp(col, 0.0, 1.0);
    }

    vec3 rgb = (uTransparent > 0) ? col * a : col;
    gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
attribute vec2 aPosition;
attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

interface WebGLState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: {
    uCanvas: WebGLUniformLocation | null;
    uTime: WebGLUniformLocation | null;
    uSpeed: WebGLUniformLocation | null;
    uRot: WebGLUniformLocation | null;
    uColorCount: WebGLUniformLocation | null;
    uColors: WebGLUniformLocation | null;
    uTransparent: WebGLUniformLocation | null;
    uScale: WebGLUniformLocation | null;
    uFrequency: WebGLUniformLocation | null;
    uWarpStrength: WebGLUniformLocation | null;
    uPointer: WebGLUniformLocation | null;
    uMouseInfluence: WebGLUniformLocation | null;
    uParallax: WebGLUniformLocation | null;
    uNoise: WebGLUniformLocation | null;
  };
  buffers: {
    position: WebGLBuffer | null;
    uv: WebGLBuffer | null;
  };
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
  const vertShader = compileShader(gl, vertSource, gl.VERTEX_SHADER);
  const fragShader = compileShader(gl, fragSource, gl.FRAGMENT_SHADER);
  
  if (!vertShader || !fragShader) return null;
  
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}

function ColorBends({
  className,
  style,
  rotation = 45,
  speed = 0.2,
  colors = [],
  transparent = true,
  autoRotate = 0,
  scale = 1,
  frequency = 1,
  warpStrength = 1,
  mouseInfluence = 1,
  parallax = 0.5,
  noise = 0.1
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glStateRef = useRef<WebGLState | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rotationRef = useRef(rotation);
  const autoRotateRef = useRef(autoRotate);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });
  const pointerSmoothRef = useRef(8);
  const startTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  
  // Props refs for smooth updates
  const propsRef = useRef({
    speed,
    scale,
    frequency,
    warpStrength,
    mouseInfluence,
    parallax,
    noise,
    transparent,
    colors: [] as string[],
    rotation,
    autoRotate
  });

  useEffect(() => {
    propsRef.current = {
      speed,
      scale,
      frequency,
      warpStrength,
      mouseInfluence,
      parallax,
      noise,
      transparent,
      colors: colors || [],
      rotation,
      autoRotate
    };
    rotationRef.current = rotation;
    autoRotateRef.current = autoRotate;
  }, [speed, scale, frequency, warpStrength, mouseInfluence, parallax, noise, transparent, colors, rotation, autoRotate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvasRef.current = canvas;
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: true
    });

    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const program = createProgram(gl, vert, frag);
    if (!program) return;

    gl.useProgram(program);

    // Get uniform locations
    const uniforms = {
      uCanvas: gl.getUniformLocation(program, 'uCanvas'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uRot: gl.getUniformLocation(program, 'uRot'),
      uColorCount: gl.getUniformLocation(program, 'uColorCount'),
      uColors: gl.getUniformLocation(program, 'uColors[0]'),
      uTransparent: gl.getUniformLocation(program, 'uTransparent'),
      uScale: gl.getUniformLocation(program, 'uScale'),
      uFrequency: gl.getUniformLocation(program, 'uFrequency'),
      uWarpStrength: gl.getUniformLocation(program, 'uWarpStrength'),
      uPointer: gl.getUniformLocation(program, 'uPointer'),
      uMouseInfluence: gl.getUniformLocation(program, 'uMouseInfluence'),
      uParallax: gl.getUniformLocation(program, 'uParallax'),
      uNoise: gl.getUniformLocation(program, 'uNoise')
    };

    // Create buffers for fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]), gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]), gl.STATIC_DRAW);

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

    // Set up attributes
    const positionLoc = gl.getAttribLocation(program, 'aPosition');
    const uvLoc = gl.getAttribLocation(program, 'aUv');

    const handleResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uniforms.uCanvas) {
        gl.uniform2f(uniforms.uCanvas, w, h);
      }
    };

    handleResize();

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(handleResize);
      ro.observe(container);
      resizeObserverRef.current = ro;
    } else {
      const win = window as Window;
      win.addEventListener('resize', handleResize);
    }

    // Set initial uniforms
    if (uniforms.uSpeed) gl.uniform1f(uniforms.uSpeed, propsRef.current.speed);
    if (uniforms.uScale) gl.uniform1f(uniforms.uScale, propsRef.current.scale);
    if (uniforms.uFrequency) gl.uniform1f(uniforms.uFrequency, propsRef.current.frequency);
    if (uniforms.uWarpStrength) gl.uniform1f(uniforms.uWarpStrength, propsRef.current.warpStrength);
    if (uniforms.uMouseInfluence) gl.uniform1f(uniforms.uMouseInfluence, propsRef.current.mouseInfluence);
    if (uniforms.uParallax) gl.uniform1f(uniforms.uParallax, propsRef.current.parallax);
    if (uniforms.uNoise) gl.uniform1f(uniforms.uNoise, propsRef.current.noise);
    if (uniforms.uTransparent) gl.uniform1i(uniforms.uTransparent, propsRef.current.transparent ? 1 : 0);

    // Set clear color
    gl.clearColor(0, 0, 0, propsRef.current.transparent ? 0 : 1);

    startTimeRef.current = performance.now() / 1000;
    lastTimeRef.current = startTimeRef.current;

    const loop = (currentTime: number) => {
      const elapsed = (currentTime / 1000) - startTimeRef.current;
      const dt = elapsed - lastTimeRef.current;
      lastTimeRef.current = elapsed;

      const props = propsRef.current;

      // Update uniforms from props (smooth updates)
      if (uniforms.uTime) gl.uniform1f(uniforms.uTime, elapsed);
      if (uniforms.uSpeed) gl.uniform1f(uniforms.uSpeed, props.speed);
      if (uniforms.uScale) gl.uniform1f(uniforms.uScale, props.scale);
      if (uniforms.uFrequency) gl.uniform1f(uniforms.uFrequency, props.frequency);
      if (uniforms.uWarpStrength) gl.uniform1f(uniforms.uWarpStrength, props.warpStrength);
      if (uniforms.uMouseInfluence) gl.uniform1f(uniforms.uMouseInfluence, props.mouseInfluence);
      if (uniforms.uParallax) gl.uniform1f(uniforms.uParallax, props.parallax);
      if (uniforms.uNoise) gl.uniform1f(uniforms.uNoise, props.noise);
      if (uniforms.uTransparent) gl.uniform1i(uniforms.uTransparent, props.transparent ? 1 : 0);

      // Update rotation
      const deg = (rotationRef.current % 360) + autoRotateRef.current * elapsed;
      const rad = (deg * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      if (uniforms.uRot) gl.uniform2f(uniforms.uRot, c, s);

      // Smooth pointer interpolation
      const cur = pointerCurrentRef.current;
      const tgt = pointerTargetRef.current;
      const amt = Math.min(1, dt * pointerSmoothRef.current);
      cur.x += (tgt.x - cur.x) * amt;
      cur.y += (tgt.y - cur.y) * amt;
      if (uniforms.uPointer) gl.uniform2f(uniforms.uPointer, cur.x, cur.y);

      // Update colors
      const colorArray = props.colors.filter(Boolean).slice(0, MAX_COLORS);
      const colorVecs: number[] = [];
      for (let i = 0; i < MAX_COLORS; i++) {
        if (i < colorArray.length) {
          const hex = colorArray[i].replace('#', '').trim();
          const v = hex.length === 3
            ? [
                parseInt(hex[0] + hex[0], 16),
                parseInt(hex[1] + hex[1], 16),
                parseInt(hex[2] + hex[2], 16)
              ]
            : [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16)
              ];
          colorVecs.push(v[0] / 255, v[1] / 255, v[2] / 255);
        } else {
          colorVecs.push(0, 0, 0);
        }
      }
      if (uniforms.uColors) {
        gl.uniform3fv(uniforms.uColors, colorVecs);
      }
      if (uniforms.uColorCount) {
        gl.uniform1i(uniforms.uColorCount, colorArray.length);
      }

      // Render
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      else window.removeEventListener('resize', handleResize);
      
      if (state.buffers.position) gl.deleteBuffer(state.buffers.position);
      if (state.buffers.uv) gl.deleteBuffer(state.buffers.uv);
      if (program) gl.deleteProgram(program);
      
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const y = -(((e.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
      pointerTargetRef.current = { x, y };
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return <div ref={containerRef} className={styles.wrapper} />;
}

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || ['']);


  const handleChange = (color: string) => {
    setValue([color]);
    props.onChange?.([color]);
  };

  const handleClear = () => {
    setValue([]);
    props.onChange?.([]);
  };



  return (
    <SilkeBox gap="s" align="center" vPad="s" style={{ width: '100%', overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>

        <SilkeColorPickerButton
          title="Single Color"
          value={value[0] || ''}
          size="s"
          onChange={handleChange}
        />
      <SilkeButton size="s" kind='secondary' icon="close" onClick={handleClear}/>
    </SilkeBox>
  );
};


registerVevComponent(ColorBends, {
  name: "ColorBends",
  props: [
    { name: "colors", title: "Single Color", type: "array", initialValue: [], component: multipleColorSelect, of: "string" },
    {name: "rotation", title: "Rotation (deg)", type: "number", initialValue: 45, options:{
      display: "slider",
      min: -180,
      max: 180,
    } },
    { name: "autoRotate", title: "Auto Rotate (deg/s)", type: "number", initialValue: 0, options:{
      display: "slider",
      min: -5,
      max: 5,
    } },
    { name: "speed", type: "number", initialValue: 0.2, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "scale", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0.2,
      max: 5,
    } },
    { name: "frequency", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "warpStrength", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "mouseInfluence", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "parallax", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "noise", type: "number", initialValue: 0.1, options:{
      display: "slider",
      min: 0,
      max: 1,
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

export default ColorBends;

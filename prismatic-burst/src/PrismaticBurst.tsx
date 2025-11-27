import React, { useEffect, useRef, useState } from 'react';
import styles from './PrismaticBurst.module.css';
import { registerVevComponent } from "@vev/react";
import { SilkeBox, SilkeColorPickerButton, SilkeText } from '@vev/silke';

type Offset = { x?: number | string; y?: number | string };
type AnimationType = 'rotate' | 'rotate3d' | 'hover';

export type PrismaticBurstProps = {
  intensity?: number;
  speed?: number;
  animationType?: AnimationType;
  colors?: string[];
  distort?: number;
  paused?: boolean;
  offset?: Offset;
  hoverDampness?: number;
  rayCount?: number;
  mixBlendMode?: React.CSSProperties['mixBlendMode'] | 'none';
};

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
    const r = h[0],
      g = h[1],
      b = h[2];
    h = r + r + g + g + b + b;
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

const TRIANGLE_VERTICES = new Float32Array([
  -1, -1, 0, 0,
  3, -1, 2, 0,
  -1, 3, 0, 2,
]);

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[PrismaticBurst] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
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
    console.warn('[PrismaticBurst] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

type UniformLocations = {
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
};

type GLState = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  canvas: HTMLCanvasElement;
  uniforms: UniformLocations;
  gradientTexture: WebGLTexture;
  resizeObserver: ResizeObserver | null;
  animationFrame: number;
  pointerTarget: [number, number];
  pointerSmooth: [number, number];
  accumTime: number;
  lastTime: number;
};

const PrismaticBurst = ({
  intensity = 2,
  speed = 0.5,
  animationType = 'rotate3d',
  colors,
  distort = 0,
  paused = false,
  offset = { x: 0, y: 0 },
  hoverDampness = 0,
  rayCount,
  mixBlendMode = 'lighten'
}: PrismaticBurstProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glStateRef = useRef<GLState | null>(null);
  const pausedRef = useRef(paused);
  const hoverDampRef = useRef(hoverDampness);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    hoverDampRef.current = hoverDampness;
  }, [hoverDampness]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    canvas.style.mixBlendMode = mixBlendMode && mixBlendMode !== 'none' ? mixBlendMode : '';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      console.warn('[PrismaticBurst] WebGL2 not supported');
      container.removeChild(canvas);
      return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      container.removeChild(canvas);
      return;
    }

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    if (!buffer || !vao) {
      console.warn('[PrismaticBurst] Failed to create buffer/VAO');
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    const uvLocation = gl.getAttribLocation(program, 'uv');
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.bindVertexArray(null);

    const uniforms: UniformLocations = {
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

    const gradientTexture = gl.createTexture();
    if (!gradientTexture) {
      console.warn('[PrismaticBurst] Failed to create texture');
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gradientTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    if (uniforms.uGradient) gl.uniform1i(uniforms.uGradient, 0);
    if (uniforms.uNoiseAmount) gl.uniform1f(uniforms.uNoiseAmount, 0.8);

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
      }
      gl.viewport(0, 0, width, height);
      if (uniforms.uResolution) gl.uniform2f(uniforms.uResolution, width, height);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', resize);
    resize();

    const pointerTarget: [number, number] = [0.5, 0.5];
    const pointerSmooth: [number, number] = [0.5, 0.5];
    let isVisible = true;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
      pointerTarget[0] = Math.min(Math.max(x, 0), 1);
      pointerTarget[1] = Math.min(Math.max(y, 0), 1);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    let intersectionObserver: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0]) {
            isVisible = entries[0].isIntersecting;
          }
        },
        { root: null, threshold: 0.01 }
      );
      intersectionObserver.observe(container);
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
      } else {
        isVisible = true;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let lastTime = performance.now();
    let accumTime = 0;
    let state: GLState;

    const render = (now: number) => {
      const dt = Math.max(0, now - lastTime) * 0.001;
      lastTime = now;
      if (!pausedRef.current) {
        accumTime += dt;
      }

      if (isVisible) {
        const tau = 0.02 + Math.max(0, Math.min(1, hoverDampRef.current)) * 0.5;
        const alpha = 1 - Math.exp(-dt / tau);
        pointerSmooth[0] += (pointerTarget[0] - pointerSmooth[0]) * alpha;
        pointerSmooth[1] += (pointerTarget[1] - pointerSmooth[1]) * alpha;

        gl.useProgram(program);
        gl.bindVertexArray(vao);
        if (uniforms.uMouse) gl.uniform2f(uniforms.uMouse, pointerSmooth[0], pointerSmooth[1]);
        if (uniforms.uTime) gl.uniform1f(uniforms.uTime, accumTime);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
      }

      state.animationFrame = requestAnimationFrame(render);
    };

    state = {
      gl,
      program,
      vao,
      buffer,
      canvas,
      uniforms,
      gradientTexture,
      resizeObserver,
      animationFrame: 0,
      pointerTarget,
      pointerSmooth,
      accumTime,
      lastTime,
    };

    state.animationFrame = requestAnimationFrame(render);
    glStateRef.current = state;

    return () => {
      cancelAnimationFrame(state.animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      intersectionObserver?.disconnect();
      state.resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      gl.deleteTexture(state.gradientTexture);
      gl.deleteBuffer(state.buffer);
      gl.deleteVertexArray(state.vao);
      gl.deleteProgram(state.program);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      glStateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = glStateRef.current?.canvas;
    if (canvas) {
      canvas.style.mixBlendMode = mixBlendMode && mixBlendMode !== 'none' ? mixBlendMode : '';
    }
  }, [mixBlendMode]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    const { gl, uniforms, gradientTexture, program } = state;
    gl.useProgram(program);

    if (uniforms.uIntensity) gl.uniform1f(uniforms.uIntensity, intensity ?? 1);
    if (uniforms.uSpeed) gl.uniform1f(uniforms.uSpeed, speed ?? 1);

    const animTypeMap: Record<AnimationType, number> = {
      rotate: 0,
      rotate3d: 1,
      hover: 2,
    };
    if (uniforms.uAnimType) gl.uniform1i(uniforms.uAnimType, animTypeMap[animationType ?? 'rotate']);
    if (uniforms.uDistort) gl.uniform1f(uniforms.uDistort, typeof distort === 'number' ? distort : 0);

    const ox = toPx(offset?.x);
    const oy = toPx(offset?.y);
    if (uniforms.uOffset) gl.uniform2f(uniforms.uOffset, ox, oy);
    if (uniforms.uRayCount) gl.uniform1i(uniforms.uRayCount, Math.max(0, Math.floor(rayCount ?? 0)));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gradientTexture);

    let count = 0;
    if (Array.isArray(colors) && colors.length > 0) {
      const capped = colors.slice(0, 64);
      count = capped.length;
      const data = new Uint8Array(count * 4);
      for (let i = 0; i < count; i++) {
        const [r, g, b] = hexToRgb01(capped[i]);
        data[i * 4 + 0] = Math.round(r * 255);
        data[i * 4 + 1] = Math.round(g * 255);
        data[i * 4 + 2] = Math.round(b * 255);
        data[i * 4 + 3] = 255;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, count, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }

    if (uniforms.uColorCount) gl.uniform1i(uniforms.uColorCount, count);
  }, [intensity, speed, animationType, colors, distort, offset, rayCount]);

  return <div className={styles.wrapper} ref={containerRef} />;
};

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState(props.value || ['#ff007a', '#4d3dff', '#ffffff']);
  const handleChange = (color: string, index: number) => {
    setValue(value.map((c: string, i: number) => i === index ? color : c));
    props.onChange?.(value);
  }

  return <SilkeBox gap="s" vAlign="center" hAlign="start" vPad="s">
    <SilkeText>Colors</SilkeText>
    <SilkeBox gap="s" align="center" vPad="s">
    {value.map((color: string, index: number) => (
      <SilkeColorPickerButton  value={color} size="s" onChange={(v) => handleChange(v, index)} key={index} /> 
    ))}
  </SilkeBox>
  </SilkeBox>
}


registerVevComponent(PrismaticBurst, {
  name: "PrismaticBurst",
  props: [
    { name: "colors", type: "array", initialValue: ['#ff007a', '#4d3dff', '#ffffff'] , component: multipleColorSelect, of: "string"},
    { name: "animationType", title: "Animation Type", type: "select", initialValue: "rotate3d", options:{
      display: "dropdown",
      items: [
        { label: "Rotate", value: "rotate" },
        { label: "Hover", value: "hover" },
        { label: "3D Rotate", value: "rotate3d" },
      ],
    } },
    { name: "intensity", type: "number", initialValue: 2, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "speed", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "distort", type: "number", initialValue: 0, options:{
      display: "slider",
      min: 0,
      max: 10,
    } },
    { name: "rayCount", title: "Ray Count", type: "number", initialValue: 0, options:{
      display: "slider",
      min: 0,
      max: 64,
    } },
    { name: "hoverDampness", title: "Hover Dampness", type: "number", initialValue: 0, options:{
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

export default PrismaticBurst;

import React, { useEffect, useRef } from "react";
import { registerVevComponent } from "@vev/react";
import styles from './orb.module.css';

interface OrbProps {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
}

const vertexShader = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 vUv;

void main() {
  vUv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform float hue;
uniform float hover;
uniform float rot;
uniform float hoverIntensity;
varying vec2 vUv;

const vec3 BASE_COLOR1 = vec3(0.611765, 0.262745, 0.996078);
const vec3 BASE_COLOR2 = vec3(0.298039, 0.760784, 0.913725);
const vec3 BASE_COLOR3 = vec3(0.062745, 0.078431, 0.600000);
const float INNER_RADIUS = 0.6;
const float NOISE_SCALE = 0.65;
const float PI = 3.14159265;
const float INV_180 = 0.005555556;

vec3 rgb2yiq(vec3 c) {
  return vec3(
    dot(c, vec3(0.299, 0.587, 0.114)),
    dot(c, vec3(0.596, -0.274, -0.322)),
    dot(c, vec3(0.211, -0.523, 0.312))
  );
}

vec3 yiq2rgb(vec3 c) {
  return vec3(
    c.x + 0.956 * c.y + 0.621 * c.z,
    c.x - 0.272 * c.y - 0.647 * c.z,
    c.x - 1.106 * c.y + 1.703 * c.z
  );
}

vec3 adjustHue(vec3 color, float hueDeg) {
  float hueRad = hueDeg * INV_180 * PI;
  vec3 yiq = rgb2yiq(color);
  float cosA = cos(hueRad);
  float sinA = sin(hueRad);
  float i = yiq.y * cosA - yiq.z * sinA;
  float q = yiq.y * sinA + yiq.z * cosA;
  return yiq2rgb(vec3(yiq.x, i, q));
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract((p3.xxy + p3.yxx + p3.xyx) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(
    dot(d0, d0),
    dot(d1, d1),
    dot(d2, d2),
    dot(d3, d3)
  ), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

vec4 extractAlpha(vec3 colorIn) {
  float a = max(max(colorIn.r, colorIn.g), colorIn.b);
  return vec4(colorIn.rgb / (a + 1e-5), a);
}

vec4 draw(vec2 uv) {
  vec3 color1 = adjustHue(BASE_COLOR1, hue);
  vec3 color2 = adjustHue(BASE_COLOR2, hue);
  vec3 color3 = adjustHue(BASE_COLOR3, hue);
  
  float ang = atan(uv.y, uv.x);
  float len = length(uv);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;
  
  float n0 = snoise3(vec3(uv * NOISE_SCALE, iTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(mix(INNER_RADIUS, 1.0, 0.4), mix(INNER_RADIUS, 1.0, 0.6), n0);
  vec2 radialPos = uv * (r0 * invLen);
  float d0 = length(uv - radialPos);
  float v0 = 1.0 / (1.0 + d0 * 10.0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
  
  float a = -iTime;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = length(uv - pos);
  float v1 = 1.5 / (1.0 + d * d * 5.0);
  v1 *= 1.0 / (1.0 + d0 * 50.0);
  
  float v2 = smoothstep(1.0, mix(INNER_RADIUS, 1.0, n0 * 0.5), len);
  float v3 = smoothstep(INNER_RADIUS, mix(INNER_RADIUS, 1.0, 0.5), len);
  
  vec3 col = mix(color1, color2, cl);
  col = mix(color3, col, v0);
  col = (col + v1) * v2 * v3;
  col = clamp(col, 0.0, 1.0);
  
  return extractAlpha(col);
}

void main() {
  vec2 center = iResolution.xy * 0.5;
  float size = min(iResolution.x, iResolution.y);
  vec2 uv = (vUv * iResolution.xy - center) / size * 2.0;
  
  float s = sin(rot);
  float c = cos(rot);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
  
  float hoverEffect = hover * hoverIntensity * 0.1;
  uv.x += hoverEffect * sin(uv.y * 10.0 + iTime);
  uv.y += hoverEffect * sin(uv.x * 10.0 + iTime);
  
  vec4 col = draw(uv);
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}
`;

function Orb({
  hue = 0,
  hoverIntensity = 0.2,
  rotateOnHover = true,
  forceHoverState = false
}: OrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ hue, hoverIntensity, rotateOnHover, forceHoverState });
  const glStateRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    canvas: HTMLCanvasElement;
    uniforms: {
      iTime: WebGLUniformLocation | null;
      iResolution: WebGLUniformLocation | null;
      hue: WebGLUniformLocation | null;
      hover: WebGLUniformLocation | null;
      rot: WebGLUniformLocation | null;
      hoverIntensity: WebGLUniformLocation | null;
    };
    positionBuffer: WebGLBuffer;
    uvBuffer: WebGLBuffer;
    animationFrame: number;
    targetHover: number;
    currentHover: number;
    currentRot: number;
    currentHue: number;
    currentHoverIntensity: number;
    lastTime: number;
    resizeObserver: ResizeObserver | null;
  } | null>(null);

 
  useEffect(() => {
    propsRef.current = { hue, hoverIntensity, rotateOnHover, forceHoverState };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState]);

  // Initialize WebGL once
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
      premultipliedAlpha: false,
    });

    if (!gl) {
      console.warn('[Orb] WebGL not supported');
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
        console.warn('[Orb] Shader compile error:', gl.getShaderInfoLog(shader));
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
      console.warn('[Orb] Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const uvLocation = gl.getAttribLocation(program, 'a_uv');

    const positionBuffer = gl.createBuffer();
    const uvBuffer = gl.createBuffer();
    if (!positionBuffer || !uvBuffer) {
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return;
    }

    const positions = new Float32Array([
      -1, -1,
       3, -1,
      -1,  3,
    ]);
    const uvs = new Float32Array([
      0, 0,
      2, 0,
      0, 2,
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      iTime: gl.getUniformLocation(program, 'iTime'),
      iResolution: gl.getUniformLocation(program, 'iResolution'),
      hue: gl.getUniformLocation(program, 'hue'),
      hover: gl.getUniformLocation(program, 'hover'),
      rot: gl.getUniformLocation(program, 'rot'),
      hoverIntensity: gl.getUniformLocation(program, 'hoverIntensity'),
    };

    const state = {
      gl,
      program,
      canvas,
      uniforms,
      positionBuffer,
      uvBuffer,
      animationFrame: 0,
      targetHover: 0,
      currentHover: 0,
      currentRot: 0,
      currentHue: hue,
      currentHoverIntensity: hoverIntensity,
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
          gl.uniform3f(uniforms.iResolution, width, height, width / height);
        }
      }
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    state.resizeObserver = resizeObserver;
    window.addEventListener('resize', resize, { passive: true });
    resize();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.min(rect.width, rect.height);
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dx = (x - centerX) / size * 2.0;
      const dy = (y - centerY) / size * 2.0;
      
      state.targetHover = (dx * dx + dy * dy < 0.64) ? 1 : 0;
    };

    const handlePointerLeave = () => {
      state.targetHover = 0;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    const rotationSpeed = 0.3;
    const hoverLerpSpeed = 0.25; // Increased for faster response
    const propLerpSpeed = 0.15; // Smooth prop interpolation

    const render = (now: number) => {
      state.animationFrame = requestAnimationFrame(render);
      
      const time = now * 0.001;
      const dt = (now - state.lastTime) * 0.001;
      state.lastTime = now;

      const props = propsRef.current;

      // Smoothly interpolate hue changes
      state.currentHue += (props.hue - state.currentHue) * propLerpSpeed;
      if (uniforms.hue) gl.uniform1f(uniforms.hue, state.currentHue);

      // Smoothly interpolate hoverIntensity changes
      state.currentHoverIntensity += (props.hoverIntensity - state.currentHoverIntensity) * propLerpSpeed;
      if (uniforms.hoverIntensity) gl.uniform1f(uniforms.hoverIntensity, state.currentHoverIntensity);

      if (uniforms.iTime) gl.uniform1f(uniforms.iTime, time);

      const effectiveHover = props.forceHoverState ? 1 : state.targetHover;
      state.currentHover += (effectiveHover - state.currentHover) * hoverLerpSpeed;
      if (uniforms.hover) gl.uniform1f(uniforms.hover, state.currentHover);

      if (props.rotateOnHover && effectiveHover > 0.5) {
        state.currentRot += dt * rotationSpeed;
      }
      if (uniforms.rot) gl.uniform1f(uniforms.rot, state.currentRot);

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
      window.removeEventListener('pointerleave', handlePointerLeave);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      glStateRef.current = null;
    };
  }, []); // Empty deps - only initialize once

  return <div ref={containerRef} className={styles.wrapper} />;
}


registerVevComponent(Orb, {
  name: "orb",
  props: [ { name: "hue", type: "number", initialValue: 0 , options:{
    display: "slider",
    min: 0,
    max: 360,
  } },
    { name: "hoverIntensity", type: "number",  initialValue: 0.2, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "rotateOnHover", type: "boolean", initialValue: true },
    { name: "forceHoverState", type: "boolean", initialValue: false } ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Orb;

import React, { useEffect, useMemo, useRef } from 'react';
import styles from './Threads.module.css';
import { registerVevComponent } from "@vev/react";


interface ThreadsProps {
  color?: [number, number, number];
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
}

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

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[Threads] Shader compile error:', gl.getShaderInfoLog(shader));
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
    console.warn('[Threads] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

type GLState = {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  buffer: WebGLBuffer;
  program: WebGLProgram;
  uniforms: {
    iTime: WebGLUniformLocation | null;
    iResolution: WebGLUniformLocation | null;
    uColor: WebGLUniformLocation | null;
    uAmplitude: WebGLUniformLocation | null;
    uDistance: WebGLUniformLocation | null;
    uMouse: WebGLUniformLocation | null;
  };
  resizeObserver?: ResizeObserver | null;
  animationFrame: number;
  currentMouse: { x: number; y: number };
  targetMouse: { x: number; y: number };
  mouseEnabled: boolean;
  enableMouse: () => void;
  disableMouse: () => void;
  setColor: (value: [number, number, number]) => void;
  setAmplitude: (value: number) => void;
  setDistance: (value: number) => void;
};

const Threads: React.FC<ThreadsProps> = ({
  color = [1, 1, 1],
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const colorVector = useMemo<[number, number, number]>(() => [...color] as [number, number, number], [color]);
  const glStateRef = useRef<GLState | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

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
      console.warn('[Threads] WebGL not supported');
      container.removeChild(canvas);
      return undefined;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      container.removeChild(canvas);
      return undefined;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      console.warn('[Threads] Failed to create buffer');
      gl.deleteProgram(program);
      container.removeChild(canvas);
      return undefined;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE_VERTICES, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    const uvLocation = gl.getAttribLocation(program, 'uv');
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    const uniforms = {
      iTime: gl.getUniformLocation(program, 'iTime'),
      iResolution: gl.getUniformLocation(program, 'iResolution'),
      uColor: gl.getUniformLocation(program, 'uColor'),
      uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
      uDistance: gl.getUniformLocation(program, 'uDistance'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
    };

    const state: GLState = {
      gl,
      canvas,
      buffer,
      program,
      uniforms,
      resizeObserver: null,
      animationFrame: 0,
      currentMouse: { x: 0.5, y: 0.5 },
      targetMouse: { x: 0.5, y: 0.5 },
      mouseEnabled: false,
      enableMouse: () => {},
      disableMouse: () => {},
      setColor: (value) => {
        if (uniforms.uColor) {
          gl.uniform3f(uniforms.uColor, value[0], value[1], value[2]);
        }
      },
      setAmplitude: (value) => {
        if (uniforms.uAmplitude) {
          gl.uniform1f(uniforms.uAmplitude, value);
        }
      },
      setDistance: (value) => {
        if (uniforms.uDistance) {
          gl.uniform1f(uniforms.uDistance, value);
        }
      },
    };

    state.setColor(colorVector);
    state.setAmplitude(amplitude);
    state.setDistance(distance);
    if (uniforms.uMouse) {
      gl.uniform2f(uniforms.uMouse, 0.5, 0.5);
    }

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        gl.viewport(0, 0, width, height);
      }
      if (uniforms.iResolution) {
        gl.uniform3f(uniforms.iResolution, width, height, width / height);
      }
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', resize);
    resize();
    state.resizeObserver = resizeObserver;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      state.targetMouse = { x, y };
    };

    const handleMouseLeave = () => {
      state.targetMouse = { x: 0.5, y: 0.5 };
    };

    state.enableMouse = () => {
      if (state.mouseEnabled) return;
      window.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      state.mouseEnabled = true;
    };

    state.disableMouse = () => {
      if (!state.mouseEnabled) return;
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      state.mouseEnabled = false;
      state.targetMouse = { x: 0.5, y: 0.5 };
    };

    const render = (time: number) => {
      state.animationFrame = requestAnimationFrame(render);
      const smoothing = state.mouseEnabled ? 0.05 : 1.0;
      state.currentMouse.x += smoothing * (state.targetMouse.x - state.currentMouse.x);
      state.currentMouse.y += smoothing * (state.targetMouse.y - state.currentMouse.y);

      if (uniforms.uMouse) {
        gl.uniform2f(uniforms.uMouse, state.currentMouse.x, state.currentMouse.y);
      }
      if (uniforms.iTime) {
        gl.uniform1f(uniforms.iTime, time * 0.001);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    state.animationFrame = requestAnimationFrame(render);
    glStateRef.current = state;
    if (enableMouseInteraction) {
      state.enableMouse();
    }

    return () => {
      state.disableMouse();
      cancelAnimationFrame(state.animationFrame);
      state.resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(state.buffer);
      gl.deleteProgram(state.program);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      glStateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    state.setColor(colorVector);
  }, [colorVector]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    state.setAmplitude(amplitude);
  }, [amplitude]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    state.setDistance(distance);
  }, [distance]);

  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    if (enableMouseInteraction) {
      state.enableMouse();
    } else {
      state.disableMouse();
    }
  }, [enableMouseInteraction]);

  return <div ref={containerRef}  {...rest} className={styles.wrapper} />;
};


registerVevComponent(Threads, {
  name: "Threads",
  props: [
    { name: "amplitude", title: "Amplitude", type: "number", initialValue: 1, options:{
      display: "slider",
      min: 0,
      max: 5,
    } },
    { name: "distance", title: "Distance", type: "number", initialValue: 0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "enableMouseInteraction", title: "Mouse Interaction", type: "boolean", initialValue: false },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Threads;

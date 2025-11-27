import React,{ useEffect, useMemo, useRef } from 'react';
import styles from '../css/iridescence.css';
import { registerVevComponent } from '@vev/react';


const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

const TRIANGLE_VERTICES = new Float32Array([
  -1, -1, 0, 0,
  3, -1, 2, 0,
  -1, 3, 0, 2,
]);

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[Iridescence] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[Iridescence] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function Iridescence({ red = 1, green = 1, blue = 1, speed = 1.0, amplitude = 0.1, mouseReact = true, ...rest }) {
  const ctnDom = useRef(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const color = useMemo(() => [red, green, blue], [red, green, blue]);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const canvas = document.createElement('canvas');
    canvas.className = styles.canvas;
    ctn.appendChild(canvas);

    const gl = canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      console.warn('[Iridescence] WebGL not supported');
      return () => {
        ctn.removeChild(canvas);
      };
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      ctn.removeChild(canvas);
      return undefined;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      console.warn('[Iridescence] Failed to create buffer');
      gl.deleteProgram(program);
      ctn.removeChild(canvas);
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
      uTime: gl.getUniformLocation(program, 'uTime'),
      uColor: gl.getUniformLocation(program, 'uColor'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    };

    const setColor = () => {
      if (uniforms.uColor) {
        gl.uniform3f(uniforms.uColor, color[0], color[1], color[2]);
      }
    };
    setColor();

    if (uniforms.uAmplitude) {
      gl.uniform1f(uniforms.uAmplitude, amplitude);
    }
    if (uniforms.uSpeed) {
      gl.uniform1f(uniforms.uSpeed, speed);
    }
    if (uniforms.uMouse) {
      gl.uniform2f(uniforms.uMouse, mousePos.current.x, mousePos.current.y);
    }

    let rafId = 0;

    const resize = () => {
      const rect = ctn.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        gl.viewport(0, 0, width, height);
        if (uniforms.uResolution) {
          gl.uniform3f(uniforms.uResolution, width, height, width / height);
        }
      }
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(ctn);
    ctn.addEventListener('resize', resize);
    resize();

    const render = (time) => {
      rafId = requestAnimationFrame(render);
      if (uniforms.uTime) {
        gl.uniform1f(uniforms.uTime, time * 0.001);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    rafId = requestAnimationFrame(render);

    const handleMouseMove = (e) => {
      const rect = ctn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      mousePos.current = { x, y };
      if (uniforms.uMouse) {
        gl.uniform2f(uniforms.uMouse, x, y);
      }
    };

    if (mouseReact) {
        window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      ctn.removeEventListener('resize', resize);
      if (mouseReact) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (buffer) {
        gl.deleteBuffer(buffer);
      }
      gl.deleteProgram(program);
      ctn.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, speed, amplitude, mouseReact]);

  return <div ref={ctnDom} {...rest} data-component="Iridescence" className={styles.iridescenceContainer}  />;
}


registerVevComponent(Iridescence, {
  name: "Iridescence",
  props: [
    { name: "red", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "green", type: "number", initialValue: 0.4, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "blue", type: "number", initialValue: 0.7, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "amplitude", type: "number", initialValue: 0.1, options:{
      display: "slider",
      min: 0,
      max: 0.5,
    } },
    { name: "speed", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "mouseReact", title: "Enable Mouse Interaction", type: "boolean", initialValue: true },
  ],
  editableCSS: [
    {
      selector: styles.iridescenceContainer,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default Iridescence;

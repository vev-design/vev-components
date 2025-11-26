import React, { useCallback, useEffect, useRef, useState } from 'react';
import { registerVevComponent } from '@vev/react';
import styles from '../css/aurora.css';
import { SilkeBox, SilkeColorPickerButton } from '@vev/silke';

const VERT = `#version 300 es
in vec2 position;
out vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform vec2 uPointer;

in vec2 vUv;
out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 pointerNdc = uPointer / max(uResolution, vec2(1.0));
  vec2 parallax = (pointerNdc - 0.5) * vec2(0.08, 0.05);
  vec2 uv = vUv + parallax;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, fract(uv.x + 10.0), rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
}

const DEFAULT_COLORS = ['#5227FF', '#7cff67', '#5227FF'];

const hexToRGB = (hex: string): [number, number, number] => {
  const c = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const UNIFORM_META: Record<string, 'float' | 'vec2' | 'vec3array'> = {
  uTime: 'float',
  uAmplitude: 'float',
  uBlend: 'float',
  uResolution: 'vec2',
  uPointer: 'vec2',
  uColorStops: 'vec3array'
};

const flattenColorStops = (stops: string[] = DEFAULT_COLORS) => {
  const normalized = stops.slice(0, 3);
  while (normalized.length < 3) normalized.push(normalized[normalized.length - 1] || DEFAULT_COLORS[0]);
  return new Float32Array(normalized.flatMap((color) => hexToRGB(color)));
};

const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
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

const createProgram = (gl: WebGL2RenderingContext, vertex: string, fragment: string) => {
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

function Aurora({
  colorStops = DEFAULT_COLORS,
  amplitude = 1.0,
  blend = 0.5,
  time,
  speed = 1.0
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformLocationsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const uniformValuesRef = useRef<Record<string, number | Float32Array | [number, number]>>({});
  const uniformTargetsRef = useRef<Record<string, number>>({});
  const colorBufferRef = useRef<Float32Array>(flattenColorStops(colorStops));
  const animationRef = useRef<number | null>(null);
  const mouseTargetRef = useRef<[number, number]>([0, 0]);
  const mouseDampeningRef = useRef<number>(0.2);
  const lastTimeRef = useRef<number>(0);
  const logicalTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(speed);
  const timeRef = useRef<number | undefined>(time);

  const updateFloatTarget = useCallback((name: string, value: number) => {
    uniformTargetsRef.current[name] = value;
  }, []);

  const applyUniform = useCallback((name: string, value: number | Float32Array | [number, number]) => {
    const gl = glRef.current;
    const location = uniformLocationsRef.current[name];
    if (!gl || !location) return;

    const type = UNIFORM_META[name];
    if (value instanceof Float32Array) {
      if (type === 'vec3array') {
        gl.uniform3fv(location, value);
      } else if (type === 'vec2') {
        gl.uniform2fv(location, value);
      } else {
        gl.uniform1fv(location, value);
      }
    } else if (Array.isArray(value)) {
      gl.uniform2f(location, value[0], value[1]);
    } else {
      gl.uniform1f(location, value);
    }
    uniformValuesRef.current[name] = value;
  }, []);

  useEffect(() => {
    colorBufferRef.current = flattenColorStops(colorStops);
  }, [colorStops]);

  useEffect(() => {
    updateFloatTarget('uAmplitude', amplitude);
  }, [amplitude, updateFloatTarget]);

  useEffect(() => {
    updateFloatTarget('uBlend', blend);
  }, [blend, updateFloatTarget]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) {
      console.error('WebGL2 not supported');
      return () => {};
    }
    glRef.current = gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const program = createProgram(gl, VERT, FRAG);
    gl.useProgram(program);
    programRef.current = program;

    const positionLocation = gl.getAttribLocation(program, 'position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms = ['uTime', 'uAmplitude', 'uBlend', 'uResolution', 'uPointer', 'uColorStops'];
    uniforms.forEach((name) => {
      const locationName = name === 'uColorStops' ? `${name}[0]` : name;
      uniformLocationsRef.current[name] = gl.getUniformLocation(program, locationName);
    });

    applyUniform('uAmplitude', amplitude);
    applyUniform('uBlend', blend);
    applyUniform('uPointer', [0, 0]);
    applyUniform('uColorStops', colorBufferRef.current);

    const drawScene = () => {
      if (!glRef.current || !programRef.current) return;
      glRef.current.useProgram(programRef.current);
      glRef.current.drawArrays(glRef.current.TRIANGLES, 0, 3);
    };

    const resize = () => {
      if (!canvasRef.current || !glRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * ratio));
      const height = Math.max(1, Math.floor(rect.height * ratio));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      applyUniform('uResolution', new Float32Array([width, height]));
      if (!uniformValuesRef.current.uPointer) {
        const cx = width / 2;
        const cy = height / 2;
        mouseTargetRef.current = [cx, cy];
        applyUniform('uPointer', [cx, cy]);
      }
      drawScene();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const handlePointerMove = (event: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = canvasRef.current.width / rect.width || 1;
      const x = (event.clientX - rect.left) * scale;
      const y = (rect.height - (event.clientY - rect.top)) * scale;
      mouseTargetRef.current = [x, y];
      if (mouseDampeningRef.current <= 0) {
        applyUniform('uPointer', [x, y]);
        drawScene();
      }
    };

    const handlePointerLeave = () => {
      if (!canvasRef.current) return;
      const cx = canvasRef.current.width / 2;
      const cy = canvasRef.current.height / 2;
      mouseTargetRef.current = [cx, cy];
      if (mouseDampeningRef.current <= 0) {
        applyUniform('uPointer', [cx, cy]);
        drawScene();
      }
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    const loop = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(loop);
      let delta = 0;
      if (lastTimeRef.current) {
        delta = (timestamp - lastTimeRef.current) / 1000;
      }
      lastTimeRef.current = timestamp;

      const externalTime = timeRef.current;
      if (typeof externalTime === 'number') {
        applyUniform('uTime', externalTime * speedRef.current * 0.1);
      } else {
        logicalTimeRef.current += delta;
        applyUniform('uTime', logicalTimeRef.current * speedRef.current);
      }

      const damp = mouseDampeningRef.current;
      if (damp > 0 && delta > 0) {
        const tau = Math.max(1e-3, damp);
        const factor = 1 - Math.exp(-delta / tau);
        const target = mouseTargetRef.current;
        const current = (uniformValuesRef.current.uPointer as [number, number]) || [target[0], target[1]];
        const next: [number, number] = [
          current[0] + (target[0] - current[0]) * factor,
          current[1] + (target[1] - current[1]) * factor
        ];
        applyUniform('uPointer', next);
      }

      ['uAmplitude', 'uBlend'].forEach((name) => {
        const target = uniformTargetsRef.current[name];
        if (target === undefined) return;
        const current = (uniformValuesRef.current[name] as number) ?? target;
        if (Math.abs(target - current) < 1e-4) return;
        const blendFactor = Math.min(1, (delta || 0) * 6);
        const value = current + (target - current) * blendFactor;
        applyUniform(name, value);
      });

      if (colorBufferRef.current !== uniformValuesRef.current.uColorStops) {
        applyUniform('uColorStops', colorBufferRef.current);
      }

      drawScene();
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      observer.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      if (programRef.current && glRef.current) {
        glRef.current.deleteProgram(programRef.current);
      }
      programRef.current = null;
      glRef.current = null;
      canvasRef.current = null;
      uniformLocationsRef.current = {};
      uniformValuesRef.current = {};
      uniformTargetsRef.current = {};
    };
  }, []);

  return <div ref={containerRef} className={styles.wrapper} />;
}

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || DEFAULT_COLORS);

  useEffect(() => {
    if (Array.isArray(props.value)) {
      setValue(props.value);
    }
  }, [props.value]);

  const handleChange = (color: string, index: number) => {
    setValue((prev) => {
      const next = prev.map((c, i) => (i === index ? color : c));
      props.onChange?.(next);
      return next;
    });
  };

  return (
    <SilkeBox gap="s" align="center" vPad="s">
      {value.map((color: string, index: number) => (
        <SilkeColorPickerButton
          value={color}
          size="s"
          onChange={(v) => handleChange(v, index)}
          key={index}
        />
      ))}
    </SilkeBox>
  );
};

registerVevComponent(Aurora, {
  name: "Aurora",
  props: [
    { name: "colorStops", type: "array", initialValue: ["#5227FF", "#7cff67", "#5227FF"], component: multipleColorSelect, of: "string" },
   
    { name: "blend", type: "number", initialValue: 0.5, options:{
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "speed", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
    { name: "amplitude", type: "number", initialValue: 1.0, options:{
      display: "slider",
      min: 0,
      max: 2,
    } },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'section',
});

export default Aurora;

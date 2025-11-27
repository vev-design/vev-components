import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './GradientBlinds.module.css';
import { registerVevComponent } from '@vev/react';
import { SilkeBox, SilkeColorPickerButton, SilkeText } from '@vev/silke';

export interface GradientBlindsProps {
  className?: string;
  dpr?: number;
  paused?: boolean;
  gradientColors?: string[];
  angle?: number;
  noise?: number;
  blindCount?: number;
  blindMinWidth?: number;
  mouseDampening?: number;
  mirrorGradient?: boolean;
  spotlightRadius?: number;
  spotlightSoftness?: number;
  spotlightOpacity?: number;
  distortAmount?: number;
  shineDirection?: 'left' | 'right';
  mixBlendMode?: string;
}

const MAX_COLORS = 8;

const hexToRGB = (hex: string): [number, number, number] => {
  const c = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const prepStops = (stops?: string[]) => {
  const base = (stops && stops.length ? stops : ['#FF9FFC', '#5227FF']).slice(0, MAX_COLORS);
  if (base.length === 1) base.push(base[0]);
  while (base.length < MAX_COLORS) base.push(base[base.length - 1]);
  const arr: [number, number, number][] = [];
  for (let i = 0; i < MAX_COLORS; i++) arr.push(hexToRGB(base[i]));
  const count = Math.max(2, Math.min(MAX_COLORS, stops?.length ?? 2));
  return { arr, count };
};

const vertexShaderSource = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform float uAngle;
uniform float uNoise;
uniform float uBlindCount;
uniform float uSpotlightRadius;
uniform float uSpotlightSoftness;
uniform float uSpotlightOpacity;
uniform float uMirror;
uniform float uDistort;
uniform float uShineFlip;
uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

varying vec2 vUv;

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rotate2D(vec2 p, float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

vec3 getGradientColor(float t){
  float tt = clamp(t, 0.0, 1.0);
  int count = uColorCount;
  if (count < 2) count = 2;
  float scaled = tt * float(count - 1);
  float seg = floor(scaled);
  float f = fract(scaled);

  if (seg < 1.0) return mix(uColor0, uColor1, f);
  if (seg < 2.0 && count > 2) return mix(uColor1, uColor2, f);
  if (seg < 3.0 && count > 3) return mix(uColor2, uColor3, f);
  if (seg < 4.0 && count > 4) return mix(uColor3, uColor4, f);
  if (seg < 5.0 && count > 5) return mix(uColor4, uColor5, f);
  if (seg < 6.0 && count > 6) return mix(uColor5, uColor6, f);
  if (seg < 7.0 && count > 7) return mix(uColor6, uColor7, f);
  if (count > 7) return uColor7;
  if (count > 6) return uColor6;
  if (count > 5) return uColor5;
  if (count > 4) return uColor4;
  if (count > 3) return uColor3;
  if (count > 2) return uColor2;
  return uColor1;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv0 = fragCoord.xy / iResolution.xy;

    float aspect = iResolution.x / iResolution.y;
    vec2 p = uv0 * 2.0 - 1.0;
    p.x *= aspect;
    vec2 pr = rotate2D(p, uAngle);
    pr.x /= aspect;
    vec2 uv = pr * 0.5 + 0.5;

    vec2 uvMod = uv;
    if (uDistort > 0.0) {
      float a = uvMod.y * 6.0;
      float b = uvMod.x * 6.0;
      float w = 0.01 * uDistort;
      uvMod.x += sin(a) * w;
      uvMod.y += cos(b) * w;
    }
    float t = uvMod.x;
    if (uMirror > 0.5) {
      t = 1.0 - abs(1.0 - 2.0 * fract(t));
    }
    vec3 base = getGradientColor(t);

    vec2 offset = vec2(iMouse.x/iResolution.x, iMouse.y/iResolution.y);
    float d = length(uv0 - offset);
    float r = max(uSpotlightRadius, 1e-4);
    float dn = d / r;
    float spot = (1.0 - 2.0 * pow(dn, uSpotlightSoftness)) * uSpotlightOpacity;
    vec3 cir = vec3(spot);
    float stripe = fract(uvMod.x * max(uBlindCount, 1.0));
    if (uShineFlip > 0.5) stripe = 1.0 - stripe;
    vec3 ran = vec3(stripe);

    vec3 col = cir + base - ran;
    col += (rand(gl_FragCoord.xy + iTime) - 0.5) * uNoise;

    fragColor = vec4(col, 1.0);
}

void main() {
    vec4 color;
    mainImage(color, vUv * iResolution.xy);
    gl_FragColor = color;
}
`;

type UniformName =
  | 'iResolution'
  | 'iMouse'
  | 'iTime'
  | 'uAngle'
  | 'uNoise'
  | 'uBlindCount'
  | 'uSpotlightRadius'
  | 'uSpotlightSoftness'
  | 'uSpotlightOpacity'
  | 'uMirror'
  | 'uDistort'
  | 'uShineFlip'
  | 'uColor0'
  | 'uColor1'
  | 'uColor2'
  | 'uColor3'
  | 'uColor4'
  | 'uColor5'
  | 'uColor6'
  | 'uColor7'
  | 'uColorCount';

type UniformValue =
  | number
  | [number, number]
  | [number, number, number];

const FLOAT_UNIFORMS: UniformName[] = [
  'uAngle',
  'uNoise',
  'uBlindCount',
  'uSpotlightRadius',
  'uSpotlightSoftness',
  'uSpotlightOpacity',
  'uDistort'
];

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader');
  }
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
  if (!program) {
    throw new Error('Failed to create program');
  }
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

const IMMEDIATE_UNIFORMS: UniformName[] = ['uMirror', 'uShineFlip'];

const GradientBlinds: React.FC<GradientBlindsProps> = ({
  className,
  dpr,
  paused = false,
  gradientColors,
  angle = 0,
  noise = 0.3,
  blindCount = 16,
  blindMinWidth = 60,
  mouseDampening = 0.15,
  mirrorGradient = false,
  spotlightRadius = 0.5,
  spotlightSoftness = 1,
  spotlightOpacity = 1,
  distortAmount = 0,
  shineDirection = 'left',
  mixBlendMode = 'lighten'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastLoopTimeRef = useRef<number>(0);
  const logicalTimeRef = useRef<number>(0);
  const mouseTargetRef = useRef<[number, number]>([0, 0]);
  const mouseDampeningRef = useRef<number>(Math.max(0, mouseDampening));
  const pointerInsideRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(paused);
  const blindParamsRef = useRef<{ blindCount: number; blindMinWidth: number }>({
    blindCount,
    blindMinWidth
  });
  const uniformLocationsRef = useRef<Record<UniformName, WebGLUniformLocation | null>>(
    {} as Record<UniformName, WebGLUniformLocation | null>
  );
  const uniformValuesRef = useRef<Record<UniformName, UniformValue>>({} as Record<
    UniformName,
    UniformValue
  >);
  const uniformTargetsRef = useRef<Record<UniformName, UniformValue>>({} as Record<
    UniformName,
    UniformValue
  >);
  const colorDataRef = useRef<{ arr: [number, number, number][]; count: number }>(
    prepStops(gradientColors)
  );
  const colorsDirtyRef = useRef<boolean>(true);
  const resizeRef = useRef<(() => void) | null>(null);

  const applyUniform = useCallback((name: UniformName, value: UniformValue) => {
    const gl = glRef.current;
    const location = uniformLocationsRef.current[name];
    if (!gl || !location) return;
    switch (name) {
      case 'iResolution':
      case 'uColor0':
      case 'uColor1':
      case 'uColor2':
      case 'uColor3':
      case 'uColor4':
      case 'uColor5':
      case 'uColor6':
      case 'uColor7': {
        const [x, y, z] = value as [number, number, number];
        gl.uniform3f(location, x, y, z ?? 0);
        break;
      }
      case 'iMouse': {
        const [x, y] = value as [number, number];
        gl.uniform2f(location, x, y);
        break;
      }
      case 'uColorCount': {
        gl.uniform1i(location, value as number);
        break;
      }
      default: {
        gl.uniform1f(location, value as number);
      }
    }
    uniformValuesRef.current[name] = value;
  }, []);

  const updateUniformTarget = useCallback((name: UniformName, value: UniformValue) => {
    uniformTargetsRef.current[name] = value;
    if (typeof value !== 'number') {
      uniformValuesRef.current[name] = value;
    }
    if (IMMEDIATE_UNIFORMS.includes(name)) {
      applyUniform(name, value);
    }
  }, [applyUniform]);

  const applyColorUniforms = useCallback(() => {
    const { arr, count } = colorDataRef.current;
    const colorUniforms: UniformName[] = [
      'uColor0',
      'uColor1',
      'uColor2',
      'uColor3',
      'uColor4',
      'uColor5',
      'uColor6',
      'uColor7'
    ];
    arr.forEach((color, idx) => applyUniform(colorUniforms[idx], color));
    applyUniform('uColorCount', count);
  }, [applyUniform]);

  useEffect(() => {
    mouseDampeningRef.current = Math.max(0, mouseDampening);
  }, [mouseDampening]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    blindParamsRef.current = { blindCount, blindMinWidth };
    resizeRef.current?.();
  }, [blindCount, blindMinWidth]);

  useEffect(() => {
    const { arr, count } = prepStops(gradientColors);
    colorDataRef.current = { arr, count };
    colorsDirtyRef.current = true;
  }, [gradientColors]);

  useEffect(() => {
    updateUniformTarget('uAngle', (angle * Math.PI) / 180);
  }, [angle, updateUniformTarget]);

  useEffect(() => {
    updateUniformTarget('uNoise', noise);
  }, [noise, updateUniformTarget]);

  useEffect(() => {
    updateUniformTarget('uSpotlightRadius', spotlightRadius);
    updateUniformTarget('uSpotlightSoftness', spotlightSoftness);
    updateUniformTarget('uSpotlightOpacity', spotlightOpacity);
  }, [spotlightRadius, spotlightSoftness, spotlightOpacity, updateUniformTarget]);

  useEffect(() => {
    updateUniformTarget('uDistort', distortAmount);
  }, [distortAmount, updateUniformTarget]);

  useEffect(() => {
    updateUniformTarget('uMirror', mirrorGradient ? 1 : 0);
  }, [mirrorGradient, updateUniformTarget]);

  useEffect(() => {
    updateUniformTarget('uShineFlip', shineDirection === 'right' ? 1 : 0);
  }, [shineDirection, updateUniformTarget]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) {
      console.error('WebGL not supported');
      return () => {};
    }
    glRef.current = gl;

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);
    programRef.current = program;

    const positionLocation = gl.getAttribLocation(program, 'position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms: UniformName[] = [
      'iResolution',
      'iMouse',
      'iTime',
      'uAngle',
      'uNoise',
      'uBlindCount',
      'uSpotlightRadius',
      'uSpotlightSoftness',
      'uSpotlightOpacity',
      'uMirror',
      'uDistort',
      'uShineFlip',
      'uColor0',
      'uColor1',
      'uColor2',
      'uColor3',
      'uColor4',
      'uColor5',
      'uColor6',
      'uColor7',
      'uColorCount'
    ];
    uniforms.forEach((name) => {
      uniformLocationsRef.current[name] = gl.getUniformLocation(program, name);
    });

    const initialColors = prepStops(gradientColors);
    colorDataRef.current = initialColors;
    colorsDirtyRef.current = true;

    uniformTargetsRef.current = {
      iResolution: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1],
      iMouse: [0, 0],
      iTime: 0,
      uAngle: (angle * Math.PI) / 180,
      uNoise: noise,
      uBlindCount: Math.max(1, blindCount),
      uSpotlightRadius: spotlightRadius,
      uSpotlightSoftness: spotlightSoftness,
      uSpotlightOpacity: spotlightOpacity,
      uMirror: mirrorGradient ? 1 : 0,
      uDistort: distortAmount,
      uShineFlip: shineDirection === 'right' ? 1 : 0,
      uColor0: initialColors.arr[0],
      uColor1: initialColors.arr[1],
      uColor2: initialColors.arr[2],
      uColor3: initialColors.arr[3],
      uColor4: initialColors.arr[4],
      uColor5: initialColors.arr[5],
      uColor6: initialColors.arr[6],
      uColor7: initialColors.arr[7],
      uColorCount: initialColors.count
    } as Record<UniformName, UniformValue>;

    Object.entries(uniformTargetsRef.current).forEach(([key, value]) => {
      applyUniform(key as UniformName, value as UniformValue);
    });

    const resize = () => {
      if (!canvasRef.current || !glRef.current) return;
      const rect = container.getBoundingClientRect();
      const devicePixelRatio =
        dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
      const width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
      const height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      applyUniform('iResolution', [width, height, 1]);

      const { blindCount: bc, blindMinWidth: bmw } = blindParamsRef.current;
      let effectiveCount = Math.max(1, bc);
      if (bmw > 0 && rect.width > 0) {
        const maxByWidth = Math.max(1, Math.floor(rect.width / bmw));
        effectiveCount = bc ? Math.min(bc, maxByWidth) : maxByWidth;
      }
      updateUniformTarget('uBlindCount', Math.max(1, effectiveCount));

      if (uniformValuesRef.current.iMouse) return;
      const cx = width / 2;
      const cy = height / 2;
      mouseTargetRef.current = [cx, cy];
      applyUniform('iMouse', [cx, cy]);
    };

    resizeRef.current = resize;
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const resetPointer = () => {
      if (!canvasRef.current) return;
      const cx = canvasRef.current.width / 2;
      const cy = canvasRef.current.height / 2;
      mouseTargetRef.current = [cx, cy];
      if (mouseDampeningRef.current <= 0) {
        applyUniform('iMouse', [cx, cy]);
      }
    };

    const handlePointerMove = (event: PointerEvent | MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) {
        if (pointerInsideRef.current) {
          pointerInsideRef.current = false;
          resetPointer();
        }
        return;
      }
      pointerInsideRef.current = true;
      const scaleX = canvasRef.current.width / Math.max(rect.width, 1);
      const scaleY = canvasRef.current.height / Math.max(rect.height, 1);
      const x = (event.clientX - rect.left) * scaleX;
      const y = (rect.height - (event.clientY - rect.top)) * scaleY;
      mouseTargetRef.current = [x, y];
      if (mouseDampeningRef.current <= 0) {
        applyUniform('iMouse', [x, y]);
      }
    };

    const handlePointerLeave = () => {
      if (!pointerInsideRef.current) return;
      pointerInsideRef.current = false;
      resetPointer();
    };

    container.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('pointermove', handlePointerMove);

    const loop = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const glCtx = glRef.current;
      const programCtx = programRef.current;
      if (!glCtx || !programCtx) return;

      let delta = 0;
      if (lastLoopTimeRef.current) {
        delta = (timestamp - lastLoopTimeRef.current) / 1000;
      }
      lastLoopTimeRef.current = timestamp;

      if (!pausedRef.current) {
        logicalTimeRef.current += delta;
      }
      applyUniform('iTime', logicalTimeRef.current);

      const damp = mouseDampeningRef.current;
      if (damp > 0 && delta > 0) {
        const tau = Math.max(1e-3, damp);
        const factor = 1 - Math.exp(-delta / tau);
        const target = mouseTargetRef.current;
        const current = uniformValuesRef.current.iMouse as [number, number];
        const next: [number, number] = [
          current[0] + (target[0] - current[0]) * factor,
          current[1] + (target[1] - current[1]) * factor
        ];
        applyUniform('iMouse', next);
      }

      FLOAT_UNIFORMS.forEach((name) => {
        const target = uniformTargetsRef.current[name] as number;
        const current = (uniformValuesRef.current[name] as number) ?? target;
        if (Math.abs(target - current) < 1e-4) {
          return;
        }
        const blend = Math.min(1, (delta || 0) * 6);
        const value = current + (target - current) * blend;
        applyUniform(name, value);
      });

      if (colorsDirtyRef.current) {
        applyColorUniforms();
        colorsDirtyRef.current = false;
      }

      if (!pausedRef.current) {
        glCtx.drawArrays(glCtx.TRIANGLES, 0, 3);
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointermove', handlePointerMove);
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      if (programRef.current && glRef.current) {
        glRef.current.deleteProgram(programRef.current);
      }
      programRef.current = null;
      glRef.current = null;
      canvasRef.current = null;
      uniformLocationsRef.current = {} as Record<UniformName, WebGLUniformLocation | null>;
      uniformValuesRef.current = {} as Record<UniformName, UniformValue>;
      uniformTargetsRef.current = {} as Record<UniformName, UniformValue>;
    };
    // We only want to recreate the WebGL context when DPR changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpr]);

  return (
    <div
      ref={containerRef}
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={{
        ...(mixBlendMode && {
          mixBlendMode: mixBlendMode as React.CSSProperties['mixBlendMode']
        })
      }}
    />
  );
};

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || ['#FF9FFC', '#5227FF']);

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
    <SilkeBox gap="s" vAlign="center" hAlign="start" vPad="s">
      <SilkeText>Gradient Colors</SilkeText>
      <SilkeBox gap="s" align="center" vPad="s">
        {value.map((color: string, index: number) => (
          <SilkeColorPickerButton
            key={index}
            value={color}
            size="s"
            onChange={(v) => handleChange(v, index)}
          />
        ))}
      </SilkeBox>
    </SilkeBox>
  );
};


registerVevComponent(GradientBlinds, {
  name: "GradientBlinds",
  props: [ { name: "gradientColors", type: "array", initialValue: ["#FF9FFC", "#5227FF"], component: multipleColorSelect, of: "string" },
  { name: "shineDirection",title: "Light Direction", type: "select", initialValue: "left", options:{
    display: "dropdown",
    items: [
      { label: "Left", value: "left" },
      { label: "Right", value: "right" },
    ],
  } },
  { name: "angle",title: "Blinds Angle", type: "number", initialValue: 0, options:{
    display: "slider",
    min: 0,
    max: 360,
  } },
  { name: "noise",title: "Noise Amount", type: "number", initialValue: 0.3, options:{
    display: "slider",
    min: 0,
    max: 1,
  } },
  { name: "blindCount",title: "Blinds Count", type: "number", initialValue: 16, options:{
    display: "slider",
    min: 0,
    max: 64,
  } },
  { name: "blindMinWidth",title: "Blinds Minimum Width", type: "number", initialValue: 60, options:{
    display: "slider",
    min: 0,
    max: 200,
  } },
  { name: "spotlightRadius",title: "Spotlight Radius", type: "number", initialValue: 0.5, options:{
    display: "slider",
    min: 0,
    max: 1,
  } },
  { name: "distortAmount",title: "Distort Amount", type: "number", initialValue: 0, options:{
    display: "slider",
    min: 0,
    max: 100,
  } },
  { name: "mouseDampening", title: "Mouse Dampening", type: "number", initialValue: 0.15, options:{
    display: "slider",
    min: 0,
    max: 1,
  } },


  { name: "mirrorGradient", type: "boolean", initialValue: false },
 
  { name: "spotlightSoftness", type: "number", initialValue: 1, options:{
    display: "slider",
    min: 0,
    max: 10,
  } },
  { name: "spotlightOpacity", type: "number", initialValue: 1, options:{
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

export default GradientBlinds;

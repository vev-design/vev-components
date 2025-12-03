import React, { useState, useEffect, useRef } from "react";
import styles from "./FloatingLines.module.css";
import { registerVevComponent } from "@vev/react";
import { SilkeBox, SilkeColorPickerButton } from "@vev/silke";

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
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;
  
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int maxIdx = lineGradientCount - 1;
    int idx2 = (idx + 1 > maxIdx) ? maxIdx : (idx + 1);

    vec3 c1, c2;
    // Use if/else chain for constant array indexing
    if (idx == 0) c1 = lineGradient[0];
    else if (idx == 1) c1 = lineGradient[1];
    else if (idx == 2) c1 = lineGradient[2];
    else if (idx == 3) c1 = lineGradient[3];
    else if (idx == 4) c1 = lineGradient[4];
    else if (idx == 5) c1 = lineGradient[5];
    else if (idx == 6) c1 = lineGradient[6];
    else c1 = lineGradient[7];
    
    if (idx2 == 0) c2 = lineGradient[0];
    else if (idx2 == 1) c2 = lineGradient[1];
    else if (idx2 == 2) c2 = lineGradient[2];
    else if (idx2 == 3) c2 = lineGradient[3];
    else if (idx2 == 4) c2 = lineGradient[4];
    else if (idx2 == 5) c2 = lineGradient[5];
    else if (idx2 == 6) c2 = lineGradient[6];
    else c2 = lineGradient[7];
    
    gradientColor = mix(c1, c2, f);
  }
  
  return gradientColor * 0.5;
}

  float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  
  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);

  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }
  
  if (enableBottom) {
    // Unroll loop with constant bound, check count inside
    for (int i = 0; i < 10; ++i) {
      if (i < bottomLineCount) {
        float fi = float(i);
        float t = fi / max(float(bottomLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);
        
        float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        col += lineCol * wave(
          ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
          1.5 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        ) * 0.2;
      }
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < 10; ++i) {
      if (i < middleLineCount) {
        float fi = float(i);
        float t = fi / max(float(middleLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);
        
        float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        col += lineCol * wave(
          ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
          2.0 + 0.15 * fi,
          baseUv,
          mouseUv,
          interactive
        );
      }
    }
  }

  if (enableTop) {
    for (int i = 0; i < 10; ++i) {
      if (i < topLineCount) {
        float fi = float(i);
        float t = fi / max(float(topLineCount - 1), 1.0);
        vec3 lineCol = getLineColor(t, b);
        
        float angle = topWavePosition.z * log(length(baseUv) + 1.0);
        vec2 ruv = baseUv * rotate(angle);
        ruv.x *= -1.0;
        col += lineCol * wave(
          ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
          1.0 + 0.2 * fi,
          baseUv,
          mouseUv,
          interactive
        ) * 0.1;
      }
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const MAX_GRADIENT_STOPS = 8;

function hexToVec3(hex: string): [number, number, number] {
  let value = hex.trim();

  if (value.startsWith('#')) {
    value = value.slice(1);
  }

  let r = 255;
  let g = 255;
  let b = 255;

  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }

  return [r / 255, g / 255, b / 255];
}

interface WebGLState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: {
    [key: string]: WebGLUniformLocation | null;
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

function FloatingLines({
  linesGradient,
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = 6,
  lineDistance = 5,
  topWavePosition,
  middleWavePosition,
  bottomWavePosition = { x: 2.0, y: -0.7, rotate: -1 },
  animationSpeed = 1,
  interactive = true,
  bendRadius = 5.0,
  bendStrength = -0.5,
  mouseDamping = 0.05,
  parallax = true,
  parallaxStrength = 0.2,
  mixBlendMode = 'screen'
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glStateRef = useRef<WebGLState | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const startTimeRef = useRef(0);
  
  const targetMouseRef = useRef({ x: -1000, y: -1000 });
  const currentMouseRef = useRef({ x: -1000, y: -1000 });
  const targetInfluenceRef = useRef(0);
  const currentInfluenceRef = useRef(0);
  const targetParallaxRef = useRef({ x: 0, y: 0 });
  const currentParallaxRef = useRef({ x: 0, y: 0 });
  
  // Props refs for smooth updates
  const propsRef = useRef({
    linesGradient: linesGradient || [],
    enabledWaves,
    lineCount,
    lineDistance,
    topWavePosition,
    middleWavePosition,
    bottomWavePosition,
    animationSpeed,
    interactive,
    bendRadius,
    bendStrength,
    mouseDamping,
    parallax,
    parallaxStrength
  });

  useEffect(() => {
    propsRef.current = {
      linesGradient: linesGradient || [],
      enabledWaves,
      lineCount,
      lineDistance,
      topWavePosition,
      middleWavePosition,
      bottomWavePosition,
      animationSpeed,
      interactive,
      bendRadius,
      bendStrength,
      mouseDamping,
      parallax,
      parallaxStrength
    };
  }, [linesGradient, enabledWaves, lineCount, lineDistance, topWavePosition, middleWavePosition, bottomWavePosition, animationSpeed, interactive, bendRadius, bendStrength, mouseDamping, parallax, parallaxStrength]);

  const getLineCount = (waveType: string) => {
    const props = propsRef.current;
    if (typeof props.lineCount === 'number') return props.lineCount;
    if (!props.enabledWaves.includes(waveType)) return 0;
    const index = props.enabledWaves.indexOf(waveType);
    return Array.isArray(props.lineCount) ? (props.lineCount[index] ?? 6) : 6;
  };

  const getLineDistance = (waveType: string) => {
    const props = propsRef.current;
    if (typeof props.lineDistance === 'number') return props.lineDistance;
    if (!props.enabledWaves.includes(waveType)) return 0.1;
    const index = props.enabledWaves.indexOf(waveType);
    return Array.isArray(props.lineDistance) ? (props.lineDistance[index] ?? 0.1) : 0.1;
  };

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
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    gl.useProgram(program);

    // Get uniform locations
    const getUniformLocation = (name: string) => gl.getUniformLocation(program, name);
    const uniforms: { [key: string]: WebGLUniformLocation | null } = {
      iTime: getUniformLocation('iTime'),
      iResolution: getUniformLocation('iResolution'),
      animationSpeed: getUniformLocation('animationSpeed'),
      enableTop: getUniformLocation('enableTop'),
      enableMiddle: getUniformLocation('enableMiddle'),
      enableBottom: getUniformLocation('enableBottom'),
      topLineCount: getUniformLocation('topLineCount'),
      middleLineCount: getUniformLocation('middleLineCount'),
      bottomLineCount: getUniformLocation('bottomLineCount'),
      topLineDistance: getUniformLocation('topLineDistance'),
      middleLineDistance: getUniformLocation('middleLineDistance'),
      bottomLineDistance: getUniformLocation('bottomLineDistance'),
      topWavePosition: getUniformLocation('topWavePosition'),
      middleWavePosition: getUniformLocation('middleWavePosition'),
      bottomWavePosition: getUniformLocation('bottomWavePosition'),
      iMouse: getUniformLocation('iMouse'),
      interactive: getUniformLocation('interactive'),
      bendRadius: getUniformLocation('bendRadius'),
      bendStrength: getUniformLocation('bendStrength'),
      bendInfluence: getUniformLocation('bendInfluence'),
      parallax: getUniformLocation('parallax'),
      parallaxStrength: getUniformLocation('parallaxStrength'),
      parallaxOffset: getUniformLocation('parallaxOffset'),
      lineGradient: getUniformLocation('lineGradient[0]'),
      lineGradientCount: getUniformLocation('lineGradientCount')
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

    const setSize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uniforms.iResolution) {
        gl.uniform3f(uniforms.iResolution, canvas.width, canvas.height, 1);
      }
    };

    setSize();

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setSize) : null;
    if (ro && container) {
      ro.observe(container);
      resizeObserverRef.current = ro;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      targetMouseRef.current = { x: x * dpr, y: (rect.height - y) * dpr };
      targetInfluenceRef.current = 1.0;

      const props = propsRef.current;
      if (props.parallax) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = (x - centerX) / rect.width;
        const offsetY = -(y - centerY) / rect.height;
        targetParallaxRef.current = {
          x: offsetX * props.parallaxStrength,
          y: offsetY * props.parallaxStrength
        };
      }
    };

    const handlePointerLeave = () => {
      targetInfluenceRef.current = 0.0;
    };

    if (interactive) {
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerleave', handlePointerLeave);
    }

    startTimeRef.current = performance.now() / 1000;

    // Set initial uniforms
    gl.useProgram(program);
    const initialProps = propsRef.current;
    
    // Set initial gradient
    const initialGradient = initialProps.linesGradient || [];
    if (initialGradient.length > 0) {
      const stops = initialGradient.slice(0, MAX_GRADIENT_STOPS);
      const colorArray: number[] = [];
      for (let i = 0; i < MAX_GRADIENT_STOPS; i++) {
        if (i < stops.length) {
          const [r, g, b] = hexToVec3(stops[i]);
          colorArray.push(r, g, b);
        } else {
          colorArray.push(1, 1, 1);
        }
      }
      if (uniforms.lineGradient) {
        gl.uniform3fv(uniforms.lineGradient, colorArray);
      }
      if (uniforms.lineGradientCount) {
        gl.uniform1i(uniforms.lineGradientCount, stops.length);
      }
    } else {
      if (uniforms.lineGradientCount) {
        gl.uniform1i(uniforms.lineGradientCount, 0);
      }
    }
    
    // Set other initial uniforms
    if (uniforms.animationSpeed) gl.uniform1f(uniforms.animationSpeed, initialProps.animationSpeed);
    if (uniforms.enableTop) gl.uniform1i(uniforms.enableTop, initialProps.enabledWaves.includes('top') ? 1 : 0);
    if (uniforms.enableMiddle) gl.uniform1i(uniforms.enableMiddle, initialProps.enabledWaves.includes('middle') ? 1 : 0);
    if (uniforms.enableBottom) gl.uniform1i(uniforms.enableBottom, initialProps.enabledWaves.includes('bottom') ? 1 : 0);
    if (uniforms.interactive) gl.uniform1i(uniforms.interactive, initialProps.interactive ? 1 : 0);
    if (uniforms.bendRadius) gl.uniform1f(uniforms.bendRadius, initialProps.bendRadius);
    if (uniforms.bendStrength) gl.uniform1f(uniforms.bendStrength, initialProps.bendStrength);
    if (uniforms.parallax) gl.uniform1i(uniforms.parallax, initialProps.parallax ? 1 : 0);
    if (uniforms.parallaxStrength) gl.uniform1f(uniforms.parallaxStrength, initialProps.parallaxStrength);
    if (uniforms.iMouse) gl.uniform2f(uniforms.iMouse, -1000, -1000);
    if (uniforms.bendInfluence) gl.uniform1f(uniforms.bendInfluence, 0);
    if (uniforms.parallaxOffset) gl.uniform2f(uniforms.parallaxOffset, 0, 0);
    
    // Set initial line counts and distances
    const initialTopLineCount = initialProps.enabledWaves.includes('top') ? getLineCount('top') : 0;
    const initialMiddleLineCount = initialProps.enabledWaves.includes('middle') ? getLineCount('middle') : 0;
    const initialBottomLineCount = initialProps.enabledWaves.includes('bottom') ? getLineCount('bottom') : 0;
    const initialTopLineDistance = initialProps.enabledWaves.includes('top') ? getLineDistance('top') * 0.01 : 0.01;
    const initialMiddleLineDistance = initialProps.enabledWaves.includes('middle') ? getLineDistance('middle') * 0.01 : 0.01;
    const initialBottomLineDistance = initialProps.enabledWaves.includes('bottom') ? getLineDistance('bottom') * 0.01 : 0.01;
    
    if (uniforms.topLineCount) gl.uniform1i(uniforms.topLineCount, initialTopLineCount);
    if (uniforms.middleLineCount) gl.uniform1i(uniforms.middleLineCount, initialMiddleLineCount);
    if (uniforms.bottomLineCount) gl.uniform1i(uniforms.bottomLineCount, initialBottomLineCount);
    if (uniforms.topLineDistance) gl.uniform1f(uniforms.topLineDistance, initialTopLineDistance);
    if (uniforms.middleLineDistance) gl.uniform1f(uniforms.middleLineDistance, initialMiddleLineDistance);
    if (uniforms.bottomLineDistance) gl.uniform1f(uniforms.bottomLineDistance, initialBottomLineDistance);
    
    // Set initial wave positions
    if (uniforms.topWavePosition) {
      gl.uniform3f(
        uniforms.topWavePosition,
        initialProps.topWavePosition?.x ?? 10.0,
        initialProps.topWavePosition?.y ?? 0.5,
        initialProps.topWavePosition?.rotate ?? -0.4
      );
    }
    if (uniforms.middleWavePosition) {
      gl.uniform3f(
        uniforms.middleWavePosition,
        initialProps.middleWavePosition?.x ?? 5.0,
        initialProps.middleWavePosition?.y ?? 0.0,
        initialProps.middleWavePosition?.rotate ?? 0.2
      );
    }
    if (uniforms.bottomWavePosition) {
      gl.uniform3f(
        uniforms.bottomWavePosition,
        initialProps.bottomWavePosition?.x ?? 2.0,
        initialProps.bottomWavePosition?.y ?? -0.7,
        initialProps.bottomWavePosition?.rotate ?? 0.4
      );
    }

    const renderLoop = (currentTime: number) => {
      gl.useProgram(program);
      const elapsed = (currentTime / 1000) - startTimeRef.current;
      const props = propsRef.current;

      // Update time
      if (uniforms.iTime) gl.uniform1f(uniforms.iTime, elapsed);

      // Update props uniforms
      if (uniforms.animationSpeed) gl.uniform1f(uniforms.animationSpeed, props.animationSpeed);
      if (uniforms.enableTop) gl.uniform1i(uniforms.enableTop, props.enabledWaves.includes('top') ? 1 : 0);
      if (uniforms.enableMiddle) gl.uniform1i(uniforms.enableMiddle, props.enabledWaves.includes('middle') ? 1 : 0);
      if (uniforms.enableBottom) gl.uniform1i(uniforms.enableBottom, props.enabledWaves.includes('bottom') ? 1 : 0);

      const topLineCount = props.enabledWaves.includes('top') ? getLineCount('top') : 0;
      const middleLineCount = props.enabledWaves.includes('middle') ? getLineCount('middle') : 0;
      const bottomLineCount = props.enabledWaves.includes('bottom') ? getLineCount('bottom') : 0;

      const topLineDistance = props.enabledWaves.includes('top') ? getLineDistance('top') * 0.01 : 0.01;
      const middleLineDistance = props.enabledWaves.includes('middle') ? getLineDistance('middle') * 0.01 : 0.01;
      const bottomLineDistance = props.enabledWaves.includes('bottom') ? getLineDistance('bottom') * 0.01 : 0.01;

      if (uniforms.topLineCount) gl.uniform1i(uniforms.topLineCount, topLineCount);
      if (uniforms.middleLineCount) gl.uniform1i(uniforms.middleLineCount, middleLineCount);
      if (uniforms.bottomLineCount) gl.uniform1i(uniforms.bottomLineCount, bottomLineCount);
      if (uniforms.topLineDistance) gl.uniform1f(uniforms.topLineDistance, topLineDistance);
      if (uniforms.middleLineDistance) gl.uniform1f(uniforms.middleLineDistance, middleLineDistance);
      if (uniforms.bottomLineDistance) gl.uniform1f(uniforms.bottomLineDistance, bottomLineDistance);

      if (uniforms.topWavePosition) {
        gl.uniform3f(
          uniforms.topWavePosition,
          props.topWavePosition?.x ?? 10.0,
          props.topWavePosition?.y ?? 0.5,
          props.topWavePosition?.rotate ?? -0.4
        );
      }
      if (uniforms.middleWavePosition) {
        gl.uniform3f(
          uniforms.middleWavePosition,
          props.middleWavePosition?.x ?? 5.0,
          props.middleWavePosition?.y ?? 0.0,
          props.middleWavePosition?.rotate ?? 0.2
        );
      }
      if (uniforms.bottomWavePosition) {
        gl.uniform3f(
          uniforms.bottomWavePosition,
          props.bottomWavePosition?.x ?? 2.0,
          props.bottomWavePosition?.y ?? -0.7,
          props.bottomWavePosition?.rotate ?? 0.4
        );
      }

      if (uniforms.interactive) gl.uniform1i(uniforms.interactive, props.interactive ? 1 : 0);
      if (uniforms.bendRadius) gl.uniform1f(uniforms.bendRadius, props.bendRadius);
      if (uniforms.bendStrength) gl.uniform1f(uniforms.bendStrength, props.bendStrength);
      if (uniforms.parallax) gl.uniform1i(uniforms.parallax, props.parallax ? 1 : 0);
      if (uniforms.parallaxStrength) gl.uniform1f(uniforms.parallaxStrength, props.parallaxStrength);

      // Update mouse
      if (props.interactive) {
        const cur = currentMouseRef.current;
        const tgt = targetMouseRef.current;
        const amt = Math.min(1, props.mouseDamping);
        cur.x += (tgt.x - cur.x) * amt;
        cur.y += (tgt.y - cur.y) * amt;
        if (uniforms.iMouse) gl.uniform2f(uniforms.iMouse, cur.x, cur.y);

        currentInfluenceRef.current += (targetInfluenceRef.current - currentInfluenceRef.current) * props.mouseDamping;
        if (uniforms.bendInfluence) gl.uniform1f(uniforms.bendInfluence, currentInfluenceRef.current);
      }

      // Update parallax
      if (props.parallax) {
        const cur = currentParallaxRef.current;
        const tgt = targetParallaxRef.current;
        const amt = Math.min(1, props.mouseDamping);
        cur.x += (tgt.x - cur.x) * amt;
        cur.y += (tgt.y - cur.y) * amt;
        if (uniforms.parallaxOffset) gl.uniform2f(uniforms.parallaxOffset, cur.x, cur.y);
      }

      // Update gradient colors
      const gradient = props.linesGradient || [];
      if (gradient.length > 0) {
        const stops = gradient.slice(0, MAX_GRADIENT_STOPS);
        const colorArray: number[] = [];
        for (let i = 0; i < MAX_GRADIENT_STOPS; i++) {
          if (i < stops.length) {
            const [r, g, b] = hexToVec3(stops[i]);
            colorArray.push(r, g, b);
          } else {
            colorArray.push(1, 1, 1);
          }
        }
        if (uniforms.lineGradient) {
          gl.uniform3fv(uniforms.lineGradient, colorArray);
        }
        if (uniforms.lineGradientCount) {
          gl.uniform1i(uniforms.lineGradientCount, stops.length);
        }
      } else {
        if (uniforms.lineGradientCount) {
          gl.uniform1i(uniforms.lineGradientCount, 0);
        }
      }

      // Render
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      gl.useProgram(program);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(renderLoop);
    };
    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      
      if (interactive) {
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('pointerleave', handlePointerLeave);
      }

      if (state.buffers.position) gl.deleteBuffer(state.buffers.position);
      if (state.buffers.uv) gl.deleteBuffer(state.buffers.uv);
      if (program) gl.deleteProgram(program);
      
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      className={styles.wrapper}
      style={{
        mixBlendMode: mixBlendMode as any
      }}
    />
  );
}

const multipleColorSelect = (props: any) => {
  const [value, setValue] = useState<string[]>(props.value || ['#5227FF', '#7cff67', '#5227FF']);

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

registerVevComponent(FloatingLines, {
  name: "FloatingLines",
  props: [ 
  { name: "linesGradient", title: "Lines Gradient", type: "array", initialValue: ['#5227FF', '#7cff67', '#5227FF'], component: multipleColorSelect, of: "string" },

  { name: "lineCount", title: "Line Count", type: "number", initialValue: 6, options:{
    display: "slider",
    min: 1,
    max: 20,
  } },
  { name: "lineDistance", title: "Line Distance", type: "number", initialValue: 5, options:{
    display: "slider",
    min: 1,
    max: 100,
  } },
  { name: "bendRadius", title: "Bend Radius", type: "number", initialValue: 5.0, options:{
    display: "slider",
    min: 1,
    max: 30,
  } },
  { name: "bendStrength", title: "Bend Strength", type: "number", initialValue: -0.5, options:{
    display: "slider",
    min: -15,
    max: 15,
  } },
  { name: "animationSpeed", title: "Animation Speed", type: "number", initialValue: 1, options:{
    display: "slider",
    min: 0,
    max: 2,
  } },
  { name: "interactive", title: " Mouse interactive", type: "boolean", initialValue: true },

],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default FloatingLines;

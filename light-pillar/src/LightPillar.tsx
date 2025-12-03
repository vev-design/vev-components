import React from "react";
import styles from "./LightPillar.module.css";
import { registerVevComponent } from "@vev/react";
import { useRef, useEffect } from 'react';

const LightPillar = ({
  topColor = '#5227FF',
  bottomColor = '#FF9FFC',
  intensity = 1.0,
  rotationSpeed = 0.3,
  interactive = false,
  className = '',
  glowAmount = 0.005,
  pillarWidth = 3.0,
  pillarHeight = 0.4,
  noiseIntensity = 0.5,
  mixBlendMode = 'screen',
  pillarRotation = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glStateRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    uniforms: { [key: string]: WebGLUniformLocation | null };
    buffers: { position: WebGLBuffer | null; uv: WebGLBuffer | null };
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);
  const startTimeRef = useRef(0);
  
  // Props refs for smooth updates
  const propsRef = useRef({
    topColor,
    bottomColor,
    intensity,
    rotationSpeed,
    interactive,
    glowAmount,
    pillarWidth,
    pillarHeight,
    noiseIntensity,
    pillarRotation
  });

  // Update props ref
  useEffect(() => {
    propsRef.current = {
      topColor,
      bottomColor,
      intensity,
      rotationSpeed,
      interactive,
      glowAmount,
      pillarWidth,
      pillarHeight,
      noiseIntensity,
      pillarRotation
    };
  }, [topColor, bottomColor, intensity, rotationSpeed, interactive, glowAmount, pillarWidth, pillarHeight, noiseIntensity, pillarRotation]);

  // Convert hex colors to RGB
  const parseColor = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '').trim();
    const v = h.length === 3
      ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return [v[0] / 255, v[1] / 255, v[2] / 255];
  };

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
      depth: false,
      stencil: false
    });

    if (!gl) {
      console.warn('WebGL is not supported in this browser');
      return;
    }

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Shader material
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
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uIntensity;
      uniform bool uInteractive;
      uniform float uGlowAmount;
      uniform float uPillarWidth;
      uniform float uPillarHeight;
      uniform float uNoiseIntensity;
      uniform float uPillarRotation;
      varying vec2 vUv;

      const float PI = 3.141592653589793;
      const float EPSILON = 0.001;
      const float E = 2.71828182845904523536;
      const float HALF = 0.5;

      // Custom tanh implementation for GLSL ES
      float tanh(float x) {
        float exp2x = exp(2.0 * x);
        return (exp2x - 1.0) / (exp2x + 1.0);
      }

      mat2 rot(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
      }

      // Procedural noise function
      float noise(vec2 coord) {
        float G = E;
        vec2 r = (G * sin(G * coord));
        return fract(r.x * r.y * (1.0 + coord.x));
      }

      // Apply layered wave deformation to position
      vec3 applyWaveDeformation(vec3 pos, float timeOffset) {
        float frequency = 1.0;
        float amplitude = 1.0;
        vec3 deformed = pos;
        
        for(float i = 0.0; i < 4.0; i++) {
          deformed.xz *= rot(0.4);
          float phase = timeOffset * i * 2.0;
          vec3 oscillation = cos(deformed.zxy * frequency - phase);
          deformed += oscillation * amplitude;
          frequency *= 2.0;
          amplitude *= HALF;
        }
        return deformed;
      }

      // Polynomial smooth blending between two values
      float blendMin(float a, float b, float k) {
        float scaledK = k * 4.0;
        float h = max(scaledK - abs(a - b), 0.0);
        return min(a, b) - h * h * 0.25 / scaledK;
      }

      float blendMax(float a, float b, float k) {
        return -blendMin(-a, -b, k);
      }

      void main() {
        vec2 fragCoord = vUv * uResolution;
        vec2 uv = (fragCoord * 2.0 - uResolution) / uResolution.y;
        
        // Apply 2D rotation to UV coordinates
        float rotAngle = uPillarRotation * PI / 180.0;
        uv *= rot(rotAngle);

        vec3 origin = vec3(0.0, 0.0, -10.0);
        vec3 direction = normalize(vec3(uv, 1.0));

        float maxDepth = 50.0;
        float depth = 0.1;

        mat2 rotX = rot(uTime * 0.3);
        if(uInteractive && length(uMouse) > 0.0) {
          rotX = rot(uMouse.x * PI * 2.0);
        }

        vec3 color = vec3(0.0);
        
        for(float i = 0.0; i < 100.0; i++) {
          vec3 pos = origin + direction * depth;
          pos.xz *= rotX;

          // Apply vertical scaling and wave deformation
          vec3 deformed = pos;
          deformed.y *= uPillarHeight;
          deformed = applyWaveDeformation(deformed + vec3(0.0, uTime, 0.0), uTime);
          
          // Calculate distance field using cosine pattern
          vec2 cosinePair = cos(deformed.xz);
          float fieldDistance = length(cosinePair) - 0.2;
          
          // Radial boundary constraint
          float radialBound = length(pos.xz) - uPillarWidth;
          fieldDistance = blendMax(radialBound, fieldDistance, 1.0);
          fieldDistance = abs(fieldDistance) * 0.15 + 0.01;

          vec3 gradient = mix(uBottomColor, uTopColor, smoothstep(15.0, -15.0, pos.y));
          color += gradient * pow(1.0 / fieldDistance, 1.0);

          if(fieldDistance < EPSILON || depth > maxDepth) break;
          depth += fieldDistance;
        }

        // Normalize by pillar width to maintain consistent glow regardless of size
        float widthNormalization = uPillarWidth / 3.0;
        vec3 scaledColor = color * uGlowAmount / widthNormalization;
        color = vec3(tanh(scaledColor.r), tanh(scaledColor.g), tanh(scaledColor.b));
        
        // Add noise postprocessing
        float rnd = noise(gl_FragCoord.xy);
        color -= rnd / 15.0 * uNoiseIntensity;
        
        gl_FragColor = vec4(color * uIntensity, 1.0);
      }
    `;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      console.error('Failed to create WebGL program');
      return;
    }

    gl.useProgram(program);

    // Get uniform locations
    const getUniformLocation = (name: string) => gl.getUniformLocation(program, name);
    const uniforms: { [key: string]: WebGLUniformLocation | null } = {
      uTime: getUniformLocation('uTime'),
      uResolution: getUniformLocation('uResolution'),
      uMouse: getUniformLocation('uMouse'),
      uTopColor: getUniformLocation('uTopColor'),
      uBottomColor: getUniformLocation('uBottomColor'),
      uIntensity: getUniformLocation('uIntensity'),
      uInteractive: getUniformLocation('uInteractive'),
      uGlowAmount: getUniformLocation('uGlowAmount'),
      uPillarWidth: getUniformLocation('uPillarWidth'),
      uPillarHeight: getUniformLocation('uPillarHeight'),
      uNoiseIntensity: getUniformLocation('uNoiseIntensity'),
      uPillarRotation: getUniformLocation('uPillarRotation')
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

    const state = {
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

    // Set clear color and blending
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set initial uniforms
    if (uniforms.uResolution) gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    if (uniforms.uMouse) gl.uniform2f(uniforms.uMouse, 0, 0);
    
    const [topR, topG, topB] = parseColor(propsRef.current.topColor);
    const [bottomR, bottomG, bottomB] = parseColor(propsRef.current.bottomColor);
    if (uniforms.uTopColor) gl.uniform3f(uniforms.uTopColor, topR, topG, topB);
    if (uniforms.uBottomColor) gl.uniform3f(uniforms.uBottomColor, bottomR, bottomG, bottomB);
    
    if (uniforms.uIntensity) gl.uniform1f(uniforms.uIntensity, propsRef.current.intensity);
    if (uniforms.uInteractive) gl.uniform1i(uniforms.uInteractive, propsRef.current.interactive ? 1 : 0);
    if (uniforms.uGlowAmount) gl.uniform1f(uniforms.uGlowAmount, propsRef.current.glowAmount);
    if (uniforms.uPillarWidth) gl.uniform1f(uniforms.uPillarWidth, propsRef.current.pillarWidth);
    if (uniforms.uPillarHeight) gl.uniform1f(uniforms.uPillarHeight, propsRef.current.pillarHeight);
    if (uniforms.uNoiseIntensity) gl.uniform1f(uniforms.uNoiseIntensity, propsRef.current.noiseIntensity);
    if (uniforms.uPillarRotation) gl.uniform1f(uniforms.uPillarRotation, propsRef.current.pillarRotation);

    const setSize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uniforms.uResolution) {
        gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
      }
    };

    setSize();

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(setSize);
      ro.observe(container);
      resizeObserverRef.current = ro;
    } else {
      const win = window as Window;
      win.addEventListener('resize', setSize);
    }

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      const props = propsRef.current;
      if (!props.interactive) {
        mouseRef.current = { x: 0, y: 0 };
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current = { x, y };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: 0, y: 0 };
    };

    // Always add listeners, but check interactive state in handler
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    startTimeRef.current = performance.now() / 1000;

    // Animation loop
    const animate = (currentTime: number) => {
      if (!glStateRef.current) return;

      const elapsed = (currentTime / 1000) - startTimeRef.current;
      const props = propsRef.current;
      
      timeRef.current = elapsed * props.rotationSpeed;

      // Update uniforms
      if (uniforms.uTime) gl.uniform1f(uniforms.uTime, timeRef.current);
      if (uniforms.uMouse) gl.uniform2f(uniforms.uMouse, mouseRef.current.x, mouseRef.current.y);
      
      // Update props uniforms
      if (uniforms.uIntensity) gl.uniform1f(uniforms.uIntensity, props.intensity);
      if (uniforms.uInteractive) gl.uniform1i(uniforms.uInteractive, props.interactive ? 1 : 0);
      if (uniforms.uGlowAmount) gl.uniform1f(uniforms.uGlowAmount, props.glowAmount);
      if (uniforms.uPillarWidth) gl.uniform1f(uniforms.uPillarWidth, props.pillarWidth);
      if (uniforms.uPillarHeight) gl.uniform1f(uniforms.uPillarHeight, props.pillarHeight);
      if (uniforms.uNoiseIntensity) gl.uniform1f(uniforms.uNoiseIntensity, props.noiseIntensity);
      if (uniforms.uPillarRotation) gl.uniform1f(uniforms.uPillarRotation, props.pillarRotation);
      
      // Update colors
      const [topR, topG, topB] = parseColor(props.topColor);
      const [bottomR, bottomG, bottomB] = parseColor(props.bottomColor);
      if (uniforms.uTopColor) gl.uniform3f(uniforms.uTopColor, topR, topG, topB);
      if (uniforms.uBottomColor) gl.uniform3f(uniforms.uBottomColor, bottomR, bottomG, bottomB);

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

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      } else {
        const win = window as Window;
        win.removeEventListener('resize', setSize);
      }
      
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);

      if (state.buffers.position) gl.deleteBuffer(state.buffers.position);
      if (state.buffers.uv) gl.deleteBuffer(state.buffers.uv);
      if (program) gl.deleteProgram(program);
      
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return <div ref={containerRef} className={`${styles.wrapper} ${className}`} style={{ mixBlendMode: mixBlendMode as any }} />;
};



registerVevComponent(LightPillar, {
  name: "LightPillar",
  props: [
    { name: "topColor", title: "Top Color", type: "string", initialValue: "#5227FF", options: {  type: "color" } },
    { name: "bottomColor", title: "Bottom Color", type: "string", initialValue: "#FF9FFC", options: {  type: "color" } },
    { name: "intensity", title: "Intensity", type: "number", initialValue: 2.6, options: {  display: "slider", min: 0.1, max: 3 } },
    { name: "rotationSpeed",title: "Rotation Speed", type: "number", initialValue: 0.3, options: {  display: "slider", min: 0, max: 2 } }, 
    { name: "glowAmount",title: "Glow Amount", type: "number", initialValue: 0.005, options: {  display: "slider", min: 0.001, max: 0.02, scale: 0.001 } },
    { name: "pillarWidth", type: "number", initialValue: 3.0, options: {  display: "slider", min: 1, max: 10 } },
    { name: "pillarHeight", type: "number", initialValue: 0.4, options: {  display: "slider", min: 0.1, max: 2 } },
    { name: "noiseIntensity", type: "number", initialValue: 0.5, options: {  display: "slider", min: 0, max: 2 } },
    { name: "pillarRotation", type: "number", initialValue: 0, options: {  display: "slider", min: 0, max: 360 } },
    { name: "interactive", title: "Mouse interactive", type: "boolean", initialValue: false },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: 'both',
});

export default LightPillar;

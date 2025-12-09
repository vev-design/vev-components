import React, { useRef, useEffect } from 'react';
import styles from "./GridDistortion.module.css";
import { registerVevComponent } from "@vev/react";
import * as THREE from 'three';


const vertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec4 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 offset = texture2D(uDataTexture, vUv);
  gl_FragColor = texture2D(uTexture, uv - 0.02 * offset.rg);
}`;

const GridDistortion = ({ grid = 15, mouse = 0.1, strength = 0.15, relaxation = 0.9, image, className = '' }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const planeRef = useRef(null);
  const geometryRef = useRef(null);
  const materialRef = useRef(null);
  const dataTextureRef = useRef(null);
  const uniformsRef = useRef(null);
  const animationIdRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const resizeRafRef = useRef(null);
  const mouseStateRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0, vX: 0, vY: 0 });
  const sizeRef = useRef(grid);
  
  // Use refs for frequently changing props to avoid recreating the entire scene
  const propsRef = useRef({ mouse, strength, relaxation });
  
  // Update props ref when they change
  useEffect(() => {
    propsRef.current = { mouse, strength, relaxation };
  }, [mouse, strength, relaxation]);

  // Initialize Three.js scene (only once or when grid/image changes)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    sizeRef.current = grid;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    container.innerHTML = '';
    renderer.domElement.className = styles.canvas;
    container.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    camera.position.z = 2;
    cameraRef.current = camera;

    const uniforms = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector4() },
      uTexture: { value: null },
      uDataTexture: { value: null }
    };
    uniformsRef.current = uniforms;

    const textureLoader = new THREE.TextureLoader();
    const imageSrc = image?.url || '';
    
    if (imageSrc) {
      textureLoader.load(imageSrc, texture => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        uniforms.uTexture.value = texture;
        
        // Trigger resize after texture loads
        if (resizeRafRef.current) {
          cancelAnimationFrame(resizeRafRef.current);
        }
        resizeRafRef.current = requestAnimationFrame(() => {
          const handleResize = resizeHandlersRef.current;
          if (handleResize) handleResize();
        });
      });
    }

    const size = grid;
    const data = new Float32Array(4 * size * size);
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = Math.random() * 255 - 125;
      data[i * 4 + 1] = Math.random() * 255 - 125;
    }

    const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;
    uniforms.uDataTexture.value = dataTexture;
    dataTextureRef.current = dataTexture;

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1);
    geometryRef.current = geometry;
    const plane = new THREE.Mesh(geometry, material);
    planeRef.current = plane;
    scene.add(plane);

    // Start animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Get fresh refs each frame
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const dataTexture = dataTextureRef.current;
      const uniforms = uniformsRef.current;

      if (!renderer || !scene || !camera || !dataTexture || !uniforms) {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
        return;
      }

      const props = propsRef.current;
      const mouseState = mouseStateRef.current;
      const size = sizeRef.current;

      uniforms.time.value += 0.05;

      const data = dataTexture.image.data;
      const dataLength = size * size;
      
      // Optimize relaxation loop
      for (let i = 0; i < dataLength; i++) {
        const idx = i * 4;
        data[idx] *= props.relaxation;
        data[idx + 1] *= props.relaxation;
      }

      // Only process mouse interaction if mouse is moving
      if (mouseState.vX !== 0 || mouseState.vY !== 0 || mouseState.x !== 0 || mouseState.y !== 0) {
        const gridMouseX = size * mouseState.x;
        const gridMouseY = size * mouseState.y;
        const maxDist = size * props.mouse;
        const maxDistSq = maxDist * maxDist;
        const strengthValue = props.strength * 100;

        // Optimize mouse interaction loop
        for (let i = 0; i < size; i++) {
          const dx = gridMouseX - i;
          const dxSq = dx * dx;
          
          for (let j = 0; j < size; j++) {
            const dy = gridMouseY - j;
            const distSq = dxSq + dy * dy;
            
            if (distSq < maxDistSq && distSq > 0.0001) {
              const index = 4 * (i + size * j);
              const dist = Math.sqrt(distSq);
              const power = Math.min(maxDist / dist, 10);
              data[index] += strengthValue * mouseState.vX * power;
              data[index + 1] -= strengthValue * mouseState.vY * power;
            }
          }
        }
      }

      dataTexture.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }

      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }

      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (dataTexture) dataTexture.dispose();
      if (uniforms.uTexture.value) uniforms.uTexture.value.dispose();

      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      planeRef.current = null;
      geometryRef.current = null;
      materialRef.current = null;
      dataTextureRef.current = null;
      uniformsRef.current = null;
    };
  }, [grid, image?.url]);

  // Optimized resize handler with RAF throttling
  const resizeHandlersRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

    const container = containerRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const plane = planeRef.current;
    const uniforms = uniformsRef.current;

    const handleResize = () => {
      if (!container || !renderer || !camera) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) return;

      const containerAspect = width / height;

      renderer.setSize(width, height);

      if (plane) {
        plane.scale.set(containerAspect, 1, 1);
      }

      const frustumHeight = 1;
      const frustumWidth = frustumHeight * containerAspect;
      camera.left = -frustumWidth / 2;
      camera.right = frustumWidth / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
      camera.updateProjectionMatrix();

      if (uniforms) {
        uniforms.resolution.value.set(width, height, 1, 1);
      }
    };

    resizeHandlersRef.current = handleResize;

    // Throttled resize using requestAnimationFrame
    let rafId = null;
    const throttledResize = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleResize();
        rafId = null;
      });
    };

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(throttledResize);
      resizeObserver.observe(container);
      resizeObserverRef.current = resizeObserver;
    } else {
      window.addEventListener('resize', throttledResize);
    }

    // Initial resize
    handleResize();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      } else {
        window.removeEventListener('resize', throttledResize);
      }
      resizeHandlersRef.current = null;
    };
  }, []);

  // Mouse handlers (only set up once)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const mouseState = mouseStateRef.current;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      if (width === 0 || height === 0) return;
      
      const x = (e.clientX - rect.left) / width;
      const y = 1 - (e.clientY - rect.top) / height;
      mouseState.vX = x - mouseState.prevX;
      mouseState.vY = y - mouseState.prevY;
      mouseState.x = x;
      mouseState.y = y;
      mouseState.prevX = x;
      mouseState.prevY = y;
    };

    const handleMouseLeave = () => {
      const dataTexture = dataTextureRef.current;
      if (dataTexture) {
        dataTexture.needsUpdate = true;
      }
      mouseState.x = 0;
      mouseState.y = 0;
      mouseState.prevX = 0;
      mouseState.prevY = 0;
      mouseState.vX = 0;
      mouseState.vY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);


  return (
    <div
      ref={containerRef}
      className={`distortion-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minWidth: '0',
        minHeight: '0'
      }}
    />
  );
};

registerVevComponent(GridDistortion, {
  name: "GridDistortion",
  props: [
    { name: "image", title: "Image", type: "image" },
    { name: "grid", title: "Grid size", type: "number", initialValue: 15, options: {
      display: "slider",
      min: 0,
      max: 200,
    } },
    { name: "mouse", title: "Mouse size", type: "number", initialValue: 0.2, options: {
      display: "slider",
      min: 0,
      max: 0.5,
    } },
    { name: "strength", title: "Strength", type: "number", initialValue: 0.15, options: {
      display: "slider",
      min: 0,
      max: 1,
    } },
    { name: "relaxation", title: "Relaxation", type: "number", initialValue: 0.9, options: {
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

export default GridDistortion;

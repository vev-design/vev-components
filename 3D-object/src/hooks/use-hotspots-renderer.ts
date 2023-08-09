import React, { useContext, useEffect, useState } from 'react';
import {
  Camera,
  CanvasTexture,
  PerspectiveCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { Object3dContext } from '../context/object-3d-context';

export function useHotspotsRenderer(
  canvasRef: React.MutableRefObject<HTMLCanvasElement | undefined>,
  camera: React.MutableRefObject<PerspectiveCamera>,
) {
  const { hotspots } = useContext(Object3dContext);
  const [material, setMaterial] = useState<SpriteMaterial>();

  useEffect(() => {
    hotspots.forEach((hotspot, index) => {
      const vector = new Vector3();
      const canvas = canvasRef.current;

      vector.project(camera.current); // `camera` is a THREE.PerspectiveCamera

      vector.x = Math.round((0.5 + vector.x / 2) * (canvas.width / window.devicePixelRatio));
      vector.y = Math.round((0.5 - vector.y / 2) * (canvas.height / window.devicePixelRatio));

      const newHotspot = document.createElement('div');
      newHotspot.innerText = `${index}`;
      newHotspot.style.top = `${vector.y}px`;
      newHotspot.style.left = `${vector.x}px`;
    });
  }, [camera, canvasRef, hotspots]);
}

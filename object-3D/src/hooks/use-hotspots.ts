import { useContext, useEffect, useRef } from "react";
import {
  Camera,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
  Spherical,
  Vector3,
} from "three";
// @ts-expect-error - no types
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { Object3dContext } from "../context/object-3d-context";
import styles from "../object-3d.module.css";
import { InternalHotspot } from "../types";
import TWEEN from "@tweenjs/tween.js";

export interface CanvasHotspot {
  element: HTMLDivElement;
  sceneObject: CSS2DObject;
  intersectionSphere: Mesh;
  hotspot: InternalHotspot;
}

function zoomHotspot(
  camera: Camera,
  storageHotspot: InternalHotspot,
  controls: any
) {
  const from = camera.position.clone();
  const camDistance = camera.position.length();
  const to = new Vector3(
    storageHotspot.position.x,
    storageHotspot.position.y,
    storageHotspot.position.z
  );

  // Convert the 'from' and 'to' positions to spherical coordinates
  const fromSpherical = new Spherical().setFromVector3(from);
  const toSpherical = new Spherical().setFromVector3(to);

  new TWEEN.Tween({
    radius: fromSpherical.radius,
    phi: fromSpherical.phi,
    theta: fromSpherical.theta
  })
    .to({
      radius: fromSpherical.radius, // This should remain constant
      phi: toSpherical.phi,
      theta: toSpherical.theta
    }, 400)
    .onUpdate(({ radius, phi, theta }) => {
      const newPosition = new Vector3().setFromSpherical(new Spherical(radius, phi, theta));
      camera.position.copy(newPosition);
      controls.update();
    })
    .start();
}

export function useHotspots(
  scene: Scene | undefined,
  camera: Camera | undefined,
  controls: any
) {
  const { hotspots, editMode, hotspotClicked, setClickHotspotCallback } =
    useContext(Object3dContext);
  const hotspotMap = useRef<CanvasHotspot[]>([]);

  useEffect(() => {
    if (setClickHotspotCallback) {
      setClickHotspotCallback((index: number) => {
        const internalHotspot = hotspots.find((hotspot) => {
          return hotspot.index === index;
        });
        if (internalHotspot) {
          zoomHotspot(camera, internalHotspot, controls);
          hotspotClicked(index);
        }
      });
    }
  }, [setClickHotspotCallback]);

  useEffect(() => {
    if (scene) {
      hotspotMap.current.forEach((hotspot) => {
        scene.remove(hotspot.sceneObject);
        scene.remove(hotspot.intersectionSphere);
        hotspot.element.parentElement.remove();
      });
      hotspotMap.current = [];

      hotspots.forEach((storageHotspot) => {
        const outer = document.createElement("div");
        const innerElem = document.createElement("div");

        outer.appendChild(innerElem);
        innerElem.innerText = `${storageHotspot.index}`;
        innerElem.className = `${styles.hotspot} vev-object-3d-hotspot`;
        const sceneObject = new CSS2DObject(outer);
        sceneObject.position.set(
          storageHotspot.position.x,
          storageHotspot.position.y,
          storageHotspot.position.z
        );
        scene.add(sceneObject);
        sceneObject.layers.set(1);

        if (!editMode) {
          innerElem.addEventListener("pointerdown", () => {
            zoomHotspot(camera, storageHotspot, controls);
            if (hotspotClicked) hotspotClicked(storageHotspot.index);
          });
        }

        // Add a transparent sphere used for determining if the hotspot is visible or not
        const geometry = new SphereGeometry(0.1, 32, 16);
        const material = new MeshBasicMaterial({
          color: 0xffff00,
          opacity: 0,
          transparent: true,
        });
        const sphere = new Mesh(geometry, material);
        sphere.position.set(
          storageHotspot.position.x,
          storageHotspot.position.y,
          storageHotspot.position.z
        );
        sphere.name = "intersection_sphere";
        scene.add(sphere);

        hotspotMap.current.push({
          intersectionSphere: sphere,
          element: innerElem,
          sceneObject,
          hotspot: storageHotspot,
        });
      });
    }
  }, [hotspots, scene]);

  return hotspotMap;
}

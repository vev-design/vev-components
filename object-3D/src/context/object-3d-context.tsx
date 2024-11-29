import React from 'react';
import { Camera, Vector3 } from 'three';
import { InternalHotspot, SavedCameraPosition } from '../types';

export interface Object3DContextProps {
  modelUrl: string;
  posterUrl?: string;
  height: number;
  width: number;
  fov: number;
  aspect: number;
  near: number;
  far: number;
  hdri: string;
  rotate: boolean;
  controls: boolean;
  animation?: string;
  zoom: boolean;
  hotspots: InternalHotspot[];
  addHotSpot?: (spot: Vector3) => void;
  editMode: boolean;
  disabled?: boolean;
  schemaOpen?: boolean;
  camera?: Camera;
  control?: any;
  setContextCamera?: (camera: Camera) => void;
  setContextControls?: (camera: any) => void;
  savedCameraPosition?: SavedCameraPosition;
  hotspotClicked?: (index: number) => void;
  eventCallbacks?: {
    click_hotspot: (cb: (index: number) => void) => void;
    start_rotation: (cb: (speed: number) => void) => void;
    stop_rotation: (cb: () => void) => void;
    reset_camera: (cb: () => void) => void;
    play_animation: (cb: (animation: string, loop: boolean, repetitions: number) => void) => void;
  };
  rotationSpeed: number;
}

export const Object3dContext = React.createContext<Object3DContextProps>({
  modelUrl: '',
  aspect: 0,
  far: 0,
  fov: 0,
  near: 0,
  height: 0,
  width: 0,
  hdri: '',
  rotate: true,
  controls: false,
  animation: '',
  zoom: false,
  hotspots: [],
  editMode: false,
  disabled: true,
  rotationSpeed: 1,
});

interface Object3DContextProviderProps {
  children: React.ReactNode;
  values: Object3DContextProps;
}

export function Object3DContextProvider({ children, values }: Object3DContextProviderProps) {
  return <Object3dContext.Provider value={values}>{children}</Object3dContext.Provider>;
}

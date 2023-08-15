import React from 'react';
import { Vector3 } from 'three';
import { InternalHotspot } from '../object-3d';

export interface Object3DContextProps {
  modelUrl: string;
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
});

interface Object3DContextProviderProps {
  children: React.ReactNode;
  values: Object3DContextProps;
}

export function Object3DContextProvider({ children, values }: Object3DContextProviderProps) {
  return <Object3dContext.Provider value={values}>{children}</Object3dContext.Provider>;
}
import React from 'react';

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
}

export const Object3DContext = React.createContext<Object3DContextProps>({
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
});

interface Object3DContextProviderProps {
  children: React.ReactNode;
  values: Object3DContextProps;
}

export function Object3DContextProvider({ children, values }: Object3DContextProviderProps) {
  return <Object3DContext.Provider value={values}>{children}</Object3DContext.Provider>;
}

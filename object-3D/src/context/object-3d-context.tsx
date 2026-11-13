import React from 'react';
import { Camera, Vector3 } from 'three';
import { HotspotAnchor, InternalHotspot, SavedCameraPosition } from '../types';
import { ScrollTarget } from '../hooks/use-scroll-progress';

export type HotspotFocus = 'none' | 'turn' | 'zoom';

/** A Vev main component, from a `mainComponent` prop */
/** Numbered circles, one main component for all hotspots, or one per hotspot */
export type HotspotStyle = 'default' | 'one' | 'each';

/** Where a custom hotspot shows its number */
export type HotspotNumberPosition = 'none' | 'center' | 'corner';

export interface CustomHotspot {
  mainComponent: string;
  variant?: string;
}

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
  /** Drag turns the camera only around the vertical axis. The vertical angle stays at the home angle. */
  horizontalOnly?: boolean;
  /** With 'one': rendered at each hotspot instead of the numbered button. Not used in the editor modals. */
  customHotspot?: CustomHotspot;
  customHotspotNumber?: HotspotNumberPosition;
  /** With 'each', a hotspot shows its own `component`, else the numbered button */
  hotspotStyle?: HotspotStyle;
  hotspots: InternalHotspot[];
  addHotSpot?: (spot: Vector3, anchor?: HotspotAnchor) => void;
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
    play_animation: (
      cb: (
        animation: string,
        loop: boolean,
        repetitions: number,
        returnToOriginal: boolean,
      ) => void,
    ) => void;
    pause_animation: (cb: () => void) => void;
    resume_animation: (cb: () => void) => void;
  };
  rotationSpeed: number;
  scrollAnimation?: boolean;
  scrollTarget?: ScrollTarget;
  scrollStart?: number;
  scrollEnd?: number;
  scrollRotate?: boolean;
  scrollRotateAmount?: number;
  tilt?: boolean;
  exposure?: number;
  showBackground?: boolean;
  backgroundBlur?: number;
  groundShadow?: boolean;
  shadowOpacity?: number;
  /** What a hotspot click does to the camera. The Focus hotspot interaction always at least turns. */
  hotspotFocus?: HotspotFocus;
  onModelLoaded?: () => void;
  onAnimationFinished?: (animation: string) => void;
  hostRef?: React.RefObject<HTMLDivElement>;
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

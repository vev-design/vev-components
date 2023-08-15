import { Vector3 } from 'three';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface StorageHotspot {
  position: Position;
  index: number;
}

export interface InternalHotspot {
  position: Vector3;
  index: number;
}

export interface SavedCameraPosition {
  position: Position;
  rotation: Position;
  target: Position;
}

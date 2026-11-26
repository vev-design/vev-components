import { Vector3 } from 'three';
import type { CustomHotspot } from './context/object-3d-context';

export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * Ties a hotspot to the model part it was placed on, so it moves with that part's animation.
 * `path` is the child-index path from the model root to the node. For skinned meshes the node
 * is the bone that moves the surface most. `position` and `normal` are local to the node.
 */
export interface HotspotAnchor {
  path: number[];
  position: Position;
  normal: Position;
}

export interface StorageHotspot {
  position: Position;
  index: number;
  anchor?: HotspotAnchor;
  /** Shown at this hotspot when "Hotspot style" is "One component per hotspot" */
  component?: CustomHotspot;
}

export interface InternalHotspot {
  position: Vector3;
  index: number;
  anchor?: HotspotAnchor;
  component?: CustomHotspot;
}

export interface SavedCameraPosition {
  position: Position;
  rotation: Position;
  target: Position;
}

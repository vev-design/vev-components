import { useState } from 'react';
import { InternalHotspot, StorageHotspot } from '../types';
import { Vector3 } from 'three';

export function useConvertedHotspots(storageHotspots: StorageHotspot[] = []) {
  return useState<InternalHotspot[]>(() => {
    const convertedHotspots = storageHotspots.map((storageHotspot) => {
      return {
        index: storageHotspot.index,
        position: new Vector3(
          storageHotspot.position.x,
          storageHotspot.position.y,
          storageHotspot.position.z,
        ),
      };
    });

    return convertedHotspots || [];
  });
}

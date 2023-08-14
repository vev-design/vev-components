import React, { useEffect, useRef, useState } from 'react';
import { SilkeButton, SilkeModal, SilkeModalContent } from '@vev/silke';
import { Object3DContextProvider } from '../context/object-3d-context';
import {
  ASPECT,
  defaultModel,
  FAR,
  FOV,
  InternalHotspot,
  LIGHTING,
  NEAR,
  NO_ANIMATION,
  StorageHotspot,
} from '../object-3d';
import { Vector3 } from 'three';
import { Object3dViewer } from './object-3d-viewer';

export interface Context {
  value: StorageHotspot[];
  onChange: (hotspots: StorageHotspot[]) => void;
}

const EDITOR_WIDTH = 800;
const EDITOR_HEIGHT = 640;

export function HotSpotFormButton(context) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <SilkeModal
        style={{ width: EDITOR_WIDTH, minHeight: EDITOR_HEIGHT }}
        hide={!modalOpen}
        title="Edit hotspots"
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <HotSpotModal context={context} />
      </SilkeModal>
      <SilkeButton
        style={{ width: '100%' }}
        label="Edit hotspots"
        onClick={() => {
          setModalOpen(!modalOpen);
        }}
      />
    </>
  );
}

export function HotSpotModal({ context }: { context: Context }) {
  const hotspots = useRef<InternalHotspot[]>([]);

  // Convert positions from storage from x,y,z to Vector3
  useEffect(() => {
    if (context.value) {
      hotspots.current = context.value.map((storageHotspot) => {
        return {
          index: storageHotspot.index,
          position: new Vector3(
            storageHotspot.position.x,
            storageHotspot.position.y,
            storageHotspot.position.z,
          ),
        };
      });
    } else {
      hotspots.current = [];
    }
  }, [context.value]);

  return (
    <SilkeModalContent>
      <Object3DContextProvider
        values={{
          editMode: true,
          height: EDITOR_HEIGHT,
          width: EDITOR_WIDTH,
          modelUrl: defaultModel.url,
          far: FAR,
          fov: FOV,
          aspect: ASPECT,
          near: NEAR,
          hdri: LIGHTING.hdri1,
          rotate: false,
          controls: true,
          animation: NO_ANIMATION,
          zoom: true,
          hotspots: hotspots.current,
          addHotSpot: (spot) => {
            const newHotspot = { index: hotspots.current.length + 1, position: spot };
            context.onChange([newHotspot, ...hotspots.current]);
            hotspots.current = [newHotspot, ...hotspots.current];
          },
        }}
      >
        <Object3dViewer />
      </Object3DContextProvider>
    </SilkeModalContent>
  );
}

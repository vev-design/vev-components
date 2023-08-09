import React, { useState } from 'react';
import { SilkeButton, SilkeModal, SilkeModalContent } from '@vev/silke';
import { Object3DContextProvider } from '../context/object-3d-context';
import { ASPECT, defaultModel, FAR, FOV, LIGHTING, NEAR, NO_ANIMATION } from '../object-3d';
import { Object3dEditor } from './object-3d-editor';
import style from './hot-spot.module.css';
import { Vector3 } from 'three';

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
        <HotSpotModal />
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

export function HotSpotModal() {
  const [hotspots, setHotspots] = useState<Vector3[]>([]);

  return (
    <SilkeModalContent>
      <Object3DContextProvider
        values={{
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
          hotspots,
          addHotSpot: (spot) => {
            setHotspots([spot, ...hotspots]);
          },
        }}
      >
        <Object3dEditor />
      </Object3DContextProvider>
    </SilkeModalContent>
  );
}

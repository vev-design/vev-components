import React, { useEffect, useRef, useState } from 'react';
import { SilkeButton, SilkeModal, SilkeModalContent } from '@vev/silke';
import { Object3DContextProvider } from '../context/object-3d-context';
import { ASPECT, defaultModel, FAR, FOV, LIGHTING, NEAR, NO_ANIMATION } from '../object-3d';
import { Camera } from 'three';
import { Object3dViewer } from './object-3d-viewer';
import styles from '../object-3d.module.css';
import { CameraEditorForm } from './camera-editor-form';
import { SavedCameraPosition, StorageHotspot } from '../types';
import { useConvertedHotspots } from '../hooks/use-converted-hotspots';
import { ObjectField, SchemaFieldProps } from '@vev/react';

interface Props {
  context: SchemaFieldProps<ObjectField>;
  onChange: (cameraPosition: SavedCameraPosition) => void;
}

const EDITOR_WIDTH = 640;
const EDITOR_HEIGHT = 640;

export function CameraEditor({ context, onChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {modalOpen && (
        <SilkeModal
          hide={!modalOpen}
          title="Edit initial camera position"
          onClose={() => {
            setModalOpen(false);
          }}
        >
          <CameraEditModal context={context} onChange={onChange} />
        </SilkeModal>
      )}
      <SilkeButton
        kind="tertiary"
        size="s"
        style={{ width: '100%' }}
        label="Edit initial camera"
        onClick={() => {
          setModalOpen(!modalOpen);
        }}
      />
    </>
  );
}

export function CameraEditModal({
  context,
  onChange,
}: {
  context: SchemaFieldProps<ObjectField>;
  onChange: (cameraPosition: SavedCameraPosition) => void;
}) {
  const currentCamera = useRef<Camera>();
  const currentControl = useRef<any>();

  // Convert positions from storage from x,y,z to Vector3
  const [hotspots, _] = useConvertedHotspots(context?.value?.hotspots);
  const modelUrl = context.context.value?.modelUrl?.url;

  function saveCameraPosition(camera: Camera, controls: any) {
    if (!camera || !controls) {
      onChange(undefined);
    }
    onChange({
      position: camera.position,
      rotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z,
      },
      target: controls.target,
    });
  }

  return (
    <SilkeModalContent>
      <Object3DContextProvider
        values={{
          editMode: true,
          height: EDITOR_HEIGHT,
          width: EDITOR_WIDTH,
          modelUrl: modelUrl || defaultModel.url,
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
          camera: currentCamera.current,
          control: currentControl.current,
          rotationSpeed: 2,
          setContextCamera: (camera) => {
            currentCamera.current = camera;
          },
          setContextControls: (control) => {
            currentControl.current = control;
          },
        }}
      >
        <div className="trQ35DZLjAWC0nWJxVvB_Object3d">
          <div className={styles.hotspotEditor}>
            <Object3dViewer className={styles.editorViewer} />
            <CameraEditorForm saveCameraPosition={saveCameraPosition} context={context} />
          </div>
        </div>
      </Object3DContextProvider>
    </SilkeModalContent>
  );
}

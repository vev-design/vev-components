import React, { useRef, useState } from 'react';
import { SilkeBox, SilkeButton, SilkeModal, SilkeModalContent } from '@vev/silke';
import { Object3DContextProvider } from '../context/object-3d-context';
import { ASPECT, defaultModel, FAR, FOV, LIGHTING, NEAR, NO_ANIMATION } from '../object-3d';
import { Camera } from 'three';
import { Object3dViewer } from './object-3d-viewer';
import styles from '../object-3d.module.css';
import { CameraEditorForm } from './camera-editor-form';
import { SavedCameraPosition } from '../types';
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
          size="large"
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
        kind="secondary"
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
  const currentCamera = useRef<Camera>(new Camera());
  const currentControl = useRef<any>({});

  // Convert positions from storage from x,y,z to Vector3
  const [hotspots, _] = useConvertedHotspots(context?.value?.hotspots);
  const modelUrl = context.context.value?.modelUrl?.url;

  function saveCameraPosition() {
    onChange({
      position: currentCamera.current.position,
      rotation: {
        x: currentCamera.current.rotation.x,
        y: currentCamera.current.rotation.y,
        z: currentCamera.current.rotation.z,
      },
      target: currentControl.current.target,
    });
  }

  function resetCameraPosition() {
    onChange(undefined);
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
          <SilkeBox gap="s" vAlign="center">
            <Object3dViewer className={styles.editorViewer} />
            <CameraEditorForm
              saveCameraPosition={saveCameraPosition}
              resetCameraPosition={resetCameraPosition}
            />
          </SilkeBox>
        </div>
      </Object3DContextProvider>
    </SilkeModalContent>
  );
}

import { SilkeBox, SilkeText, SilkeIcon, SilkeButton, SilkeButtonSet } from '@vev/silke';
import React, { useContext } from 'react';
import { Object3dContext } from '../context/object-3d-context';
import { Camera } from 'three';
import style from './camera-editor.module.css';

interface Props {
  saveCameraPosition: (camera: Camera, control: any) => void;
}

export function CameraEditorForm({ saveCameraPosition }: Props) {
  const { camera, control } = useContext(Object3dContext);

  return (
    <div className={style.instructions}>
      <SilkeBox gap="m" column>
        <SilkeBox hPad="xs" vAlign="center" column>
          <SilkeIcon icon="rotate" style={{ fontSize: 16 }} />
          <SilkeText size="large">Rotate</SilkeText>
          <SilkeText color="neutral-60">Left click + drag or one finger drag</SilkeText>
        </SilkeBox>
        <SilkeBox hPad="xs" vAlign="center" column>
          <SilkeIcon icon="search" />
          <SilkeText size="large">Zoom</SilkeText>
          <SilkeText color="neutral-60">Scroll anywhere or pinch</SilkeText>
        </SilkeBox>
        <SilkeBox hPad="xs" vAlign="center" column>
          <SilkeIcon icon="arrows" />
          <SilkeText size="large">Pan</SilkeText>
          <SilkeText color="neutral-60">Right click + drag or two fingers drag</SilkeText>
        </SilkeBox>
        <SilkeBox gap="m" fill>
          <SilkeButtonSet>
            <SilkeButton
              label="Save"
              onClick={() => {
                saveCameraPosition(camera, control);
              }}
            />
            <SilkeButton
              label="Reset"
              kind="secondary"
              onClick={() => {
                saveCameraPosition(null, null);
              }}
            />
          </SilkeButtonSet>
        </SilkeBox>
      </SilkeBox>
    </div>
  );
}

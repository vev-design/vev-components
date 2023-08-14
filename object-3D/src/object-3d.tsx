import React, { useEffect, useRef } from 'react';
import styles from './object-3d.module.css';
import { registerVevComponent, useSize } from '@vev/react';
import { Object3DContextProvider } from './context/object-3d-context';
import { Object3dViewer } from './components/object-3d-viewer';
import { getAnimations } from './util/get-animations';
import { HotSpotFormButton } from './components/hot-spot-form';
import { Vector3 } from 'three';

export const defaultModel = {
  url: 'https://devcdn.vev.design/private/IZ8anjrpLbNsil9YD4NOn6pLTsc2/ZtaWckY6KR_Astronaut.glb.glb',
};

export const LIGHTING = {
  hdri1:
    'https://cdn.vev.design/private/Tr1z5E7fRfebmaI3Le2T8vQsHud2/c_W6ves3U_abandoned_factory_canteen_01_1k.hdr.hdr',
  hdri2:
    'https://cdn.vev.design/private/Tr1z5E7fRfebmaI3Le2T8vQsHud2/3s2njpyp9_studio_small_06_1k.hdr.hdr',
  hdri3:
    'https://cdn.vev.design/private/Tr1z5E7fRfebmaI3Le2T8vQsHud2/HDR_Free_City_Night_Lights_Env.hdr',
  hdri4: 'https://cdn.vev.design/private/Tr1z5E7fRfebmaI3Le2T8vQsHud2/HDR_041_Path_Env.hdr',
  hdri5: 'https://cdn.vev.design/private/Tr1z5E7fRfebmaI3Le2T8vQsHud2/sunset_jhbcentral_1k.hdr',
};

export const NO_ANIMATION = 'No animation';

export const FOV = 45;
export const ASPECT = 2; // the canvas default
export const NEAR = 0.1;
export const FAR = 100;

export interface StorageHotspot {
  position: { x: number; y: number; z: number };
  index: number;
}

export interface InternalHotspot {
  position: Vector3;
  index: number;
}

type Props = {
  hostRef: React.RefObject<HTMLDivElement>;
  modelUrl: { url: string };
  lighting: 'hdri1' | 'hdri2' | 'hdri3' | 'hdri4' | 'hdri5';
  rotate: boolean;
  controls: boolean;
  animation?: string;
  zoom: boolean;
  hotspots: StorageHotspot[];
};

const Object3d = ({
  hostRef,
  modelUrl = defaultModel,
  lighting = 'hdri1',
  rotate = true,
  controls = false,
  animation,
  zoom,
  hotspots,
}: Props) => {
  const { width, height } = useSize(hostRef);
  const internalHotspots = useRef<InternalHotspot[]>([]);

  // Convert positions from storage from x,y,z to Vector3
  useEffect(() => {
    if (hotspots) {
      internalHotspots.current = hotspots.map((storageHotspot) => {
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
      internalHotspots.current = [];
    }
  }, [hotspots]);

  return (
    <div className={styles.wrapper}>
      <Object3DContextProvider
        values={{
          editMode: false,
          height,
          width,
          modelUrl: (modelUrl && modelUrl.url) || defaultModel.url,
          far: FAR,
          fov: FOV,
          aspect: ASPECT,
          near: NEAR,
          hdri: LIGHTING[lighting],
          rotate,
          zoom,
          controls,
          animation,
          hotspots: internalHotspots.current,
        }}
      >
        <Object3dViewer />
      </Object3DContextProvider>
    </div>
  );
};

registerVevComponent(Object3d, {
  name: 'Object3D',
  props: [
    {
      name: 'modelUrl',
      title: 'Model',
      description:
        'This element only supports uploading a .glb file with a maximum file size of 75MB.',
      type: 'upload',
      accept: '.glb,.gltf',
    },
    {
      name: 'lighting',
      title: 'Lighting',
      description: 'Choose a lighting preset',
      type: 'select',
      options: {
        items: [
          { label: 'Indoor', value: 'hdri1' },
          { label: 'Studio lights', value: 'hdri2' },
          { label: 'Streetlights, dark', value: 'hdri3' },
          { label: 'Natural lights', value: 'hdri4' },
          { label: 'Dim', value: 'hdri5' },
        ],
        display: 'dropdown',
      },
      initialValue: 'hdri1',
    },
    {
      name: 'animation',
      title: 'Animation',
      type: 'select',
      options: {
        items: async (context) => {
          const animations = await getAnimations(context.value?.modelUrl?.url);
          return [NO_ANIMATION, ...animations].map((animation) => {
            return { label: animation, value: animation };
          });
        },
        display: 'dropdown',
      },
      initialValue: 'No animation',
    },
    {
      name: 'rotate',
      title: 'Rotate',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'controls',
      title: 'Enable controls',
      description: 'Allow user to interact with model',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'zoom',
      title: 'Enable zoom',
      description: 'Allow user to zoom model',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'hotspots',
      type: 'string',
      component: HotSpotFormButton,
    },
  ],
  editableCSS: [
    {
      selector: styles.hotspot,
      properties: ['background', 'color'],
      title: 'Hotspot',
    },
  ],
  type: 'both',
});

export default Object3d;

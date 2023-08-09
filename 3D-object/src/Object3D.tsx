import React from 'react';
import styles from './Object3D.module.css';
import { registerVevComponent, useSize } from '@vev/react';
import { Object3DContextProvider } from './context/Object3DContext';
import { Object3DViewer } from './components/Object3DViewer';
import { getAnimations } from './util/get-animations';

type Props = {
  hostRef: React.RefObject<HTMLDivElement>;
  modelUrl: { url: string };
  lighting: 'hdri1' | 'hdri2' | 'hdri3' | 'hdri4' | 'hdri5';
  rotate: boolean;
  controls: boolean;
  animation?: string;
};

const defaultModel = {
  url: 'https://devcdn.vev.design/private/IZ8anjrpLbNsil9YD4NOn6pLTsc2/ZtaWckY6KR_Astronaut.glb.glb',
};

const LIGHTING = {
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

const FOV = 45;
const ASPECT = 2; // the canvas default
const NEAR = 0.1;
const FAR = 100;

const Object3D = ({
  hostRef,
  modelUrl = defaultModel,
  lighting = 'hdri1',
  rotate = true,
  controls = false,
  animation,
}: Props) => {
  const { width, height } = useSize(hostRef);
  return (
    <div className={styles.wrapper}>
      <Object3DContextProvider
        values={{
          height,
          width,
          modelUrl: (modelUrl && modelUrl.url) || defaultModel.url,
          far: FAR,
          fov: FOV,
          aspect: ASPECT,
          near: NEAR,
          hdri: LIGHTING[lighting],
          rotate,
          controls,
          animation,
        }}
      >
        <Object3DViewer />
      </Object3DContextProvider>
    </div>
  );
};

const TestComp = (props) => {
  console.log('props', props);
  return (
    <div>
      <p>ASD</p>
    </div>
  );
};

registerVevComponent(Object3D, {
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
      name: 'title',
      type: 'string',
      component: TestComp,
    },
  ],
  type: 'both',
});

export default Object3D;

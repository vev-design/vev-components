import React, { useEffect, useRef, useState } from 'react';
import styles from './object-3d.module.css';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useEditorState,
  useSize,
  useVevEvent,
} from '@vev/react';
import { Object3DContextProps, Object3DContextProvider } from './context/object-3d-context';
import { Object3dViewer } from './components/object-3d-viewer';
import { getAnimations } from './util/get-animations';
import { HotspotEditorForm } from './components/hotspot-editor-form';
import { Vector3 } from 'three';
import { CameraEditor } from './components/camera-editor';
import { InternalHotspot, SavedCameraPosition, StorageHotspot } from './types';
import { EventTypes, InteractionTypes } from './event-types';
import { SilkeBox } from '@vev/silke';
import { VevManifest } from '@vev/utils';

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

type LightingOptions = 'hdri1' | 'hdri2' | 'hdri3' | 'hdri4' | 'hdri5';

function noop() {
  return;
}

export type Props = {
  hostRef: React.RefObject<HTMLDivElement>;
  modelUrl: { url: string };
  settings: { lighting: LightingOptions; controls: boolean; zoom: boolean };
  poster: { url: string };
  hotspots_camera?: {
    hotspots: StorageHotspot[];
    initialCamera?: SavedCameraPosition;
  };
  animationSettings: {
    animation?: string;
    rotate: boolean;
    rotationSpeed: number;
    reverseSpeed: boolean;
  };
};

const Object3d = ({
  hostRef,
  modelUrl = defaultModel,
  poster,
  settings,
  animationSettings,
  hotspots_camera,
}: Props) => {
  const { width, height } = useSize(hostRef);

  // Initial values
  const initialCamera = hotspots_camera?.initialCamera;
  const lighting = settings?.lighting || 'hdri1';
  const controls = settings?.controls || false;
  const zoom = settings?.zoom || false;
  const hotspots = hotspots_camera?.hotspots;
  const animation = animationSettings?.animation;
  const rotate = animationSettings?.rotate;
  const reverseSpeed = animationSettings?.reverseSpeed;
  const rotationSpeed =
    animationSettings?.rotationSpeed !== undefined ? animationSettings?.rotationSpeed : 2;
  const actualRotationSpeed = reverseSpeed ? rotationSpeed * -1 : rotationSpeed;

  const [internalHotspots, setInternalHotspots] = useState<InternalHotspot[]>([]);
  const eventCallbacks = useRef<{
    click_hotspot: (index: number) => void;
    start_rotation: (speed: number) => void;
    stop_rotation: () => void;
    reset_camera: () => void;
    play_animation: (animation: string) => void;
  }>({
    click_hotspot: noop,
    start_rotation: noop,
    stop_rotation: noop,
    reset_camera: noop,
    play_animation: noop,
  });

  const [initialCameraPosition, setInitialCameraPosition] =
    useState<SavedCameraPosition>(initialCamera);
  const { disabled, schemaOpen } = useEditorState();
  const dispatchVevEvent = useDispatchVevEvent();

  useEffect(() => {
    setInitialCameraPosition(initialCamera);
  }, [initialCamera]);

  // Convert positions from storage from x,y,z to Vector3
  useEffect(() => {
    if (hotspots) {
      setInternalHotspots(
        hotspots.map((storageHotspot) => {
          return {
            index: storageHotspot.index,
            position: new Vector3(
              storageHotspot.position.x,
              storageHotspot.position.y,
              storageHotspot.position.z,
            ),
          };
        }),
      );
    }
  }, [hotspots]);

  useVevEvent(InteractionTypes.SELECT_HOTSPOT, (args: any) => {
    eventCallbacks.current.click_hotspot(args.select_hotspot);
  });

  useVevEvent(InteractionTypes.START_ROTATION, (args: any) => {
    eventCallbacks.current.start_rotation(args.speed);
  });

  useVevEvent(InteractionTypes.STOP_ROTATION, () => {
    eventCallbacks.current.stop_rotation();
  });

  useVevEvent(InteractionTypes.RESET_CAMERA, () => {
    eventCallbacks.current.reset_camera();
  });

  useVevEvent(InteractionTypes.PLAY_ANIMATION, (args: any) => {
    eventCallbacks.current.play_animation(args.animation);
  });

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
          rotationSpeed: actualRotationSpeed,
          zoom,
          controls,
          animation,
          hotspots: internalHotspots,
          disabled,
          schemaOpen,
          posterUrl: poster ? poster.url : null,
          savedCameraPosition: initialCameraPosition,
          eventCallbacks: {
            click_hotspot: (cb) => {
              eventCallbacks.current.click_hotspot = cb;
            },
            start_rotation: (cb) => {
              eventCallbacks.current.start_rotation = cb;
            },
            stop_rotation: (cb) => {
              eventCallbacks.current.stop_rotation = cb;
            },
            reset_camera: (cb) => {
              eventCallbacks.current.reset_camera = cb;
            },
            play_animation: (cb) => {
              eventCallbacks.current.play_animation = cb;
            },
          },
          hotspotClicked: (index: number) => {
            dispatchVevEvent(EventTypes.HOTSPOT_CLICKED, {
              [EventTypes.HOTSPOT_CLICKED]: index,
            });
          },
        }}
      >
        <Object3dViewer />
      </Object3DContextProvider>
    </div>
  );
};

export const HotspotComponent = (context) => {
  const initialCamera = context.value?.initialCamera;
  const hotspots = context.value?.hotspots || [];

  return (
    <>
      <SilkeBox gap="s" flex style={{ padding: '18px 0 10px' }}>
        <HotspotEditorForm
          context={context}
          onChange={(hotspots) => {
            context.onChange({
              initialCamera,
              hotspots,
            });
          }}
        />
        <CameraEditor
          context={context}
          onChange={(camera) => {
            context.onChange({
              hotspots,
              initialCamera: camera,
            });
          }}
        />
      </SilkeBox>
    </>
  );
};

export const config: VevManifest = {
  name: 'Object3D',
  props: [
    {
      name: 'modelUrl',
      title: '3D File',
      description: 'Only .glb, max 75MB.',
      type: 'upload',
      accept: '.glb,.gltf',
      maxSize: 75000,
    },
    {
      name: 'poster',
      title: 'Poster image',
      type: 'upload',
      accept: 'image/*',
    },
    {
      name: 'hotspots_camera',
      type: 'object',
      fields: [
        {
          name: 'hotspots',
          type: 'string',
        },
        {
          name: 'initialCamera',
          type: 'string',
        },
      ],
      component: HotspotComponent,
    },
    {
      name: 'settings',
      title: 'Settings',
      type: 'object',
      fields: [
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
          name: 'controls',
          title: 'Drag',
          description: 'Allow user to interact with model',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'zoom',
          title: 'Zoom',
          description: 'Allow user to zoom model',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
    {
      name: 'animationSettings',
      title: 'Animation',
      type: 'object',
      fields: [
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
          name: 'rotationSpeed',
          title: 'Rotation speed',
          type: 'number',
          initialValue: 2,
          options: {
            display: 'slider',
            min: 0,
            max: 20,
          },
          hidden: (context) => context?.value?.animationSettings?.rotate !== true,
        },
        {
          name: 'reverseSpeed',
          title: 'Loop alternate direction',
          type: 'boolean',
          initialValue: false,
          hidden: (context) => context?.value?.animationSettings?.rotate !== true,
        },
      ],
    },
  ],
  events: [
    {
      type: EventTypes.HOTSPOT_CLICKED,
      description: 'On hotspot click',
      args: [
        {
          name: EventTypes.HOTSPOT_CLICKED,
          description: 'Hotspot number clicked',
          type: 'number',
        },
      ],
    },
  ],
  interactions: [
    {
      type: InteractionTypes.SELECT_HOTSPOT,
      description: 'Focus hotspot',
      args: [{ name: 'select_hotspot', title: 'Hotspot number', type: 'number' }],
    },
    {
      type: InteractionTypes.START_ROTATION,
      description: 'Start rotation',
      args: [{ name: 'speed', title: 'Speed', type: 'number' }],
    },
    {
      type: InteractionTypes.STOP_ROTATION,
      description: 'Stop rotation',
    },
    {
      type: InteractionTypes.RESET_CAMERA,
      description: 'Reset camera',
    },
    {
      type: InteractionTypes.PLAY_ANIMATION,
      description: 'Play animation',
      args: [
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
      ],
    },
  ],
  editableCSS: [
    {
      selector: styles.hotspot,
      properties: ['background', 'color', 'font', 'font-family', 'font-size'],
      title: 'Hotspot',
    },
  ],
  type: 'both',
};

registerVevComponent(Object3d, config);

export default Object3d;

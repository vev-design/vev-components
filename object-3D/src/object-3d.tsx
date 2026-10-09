import React, { useEffect, useRef, useState } from 'react';
import styles from './object-3d.module.css';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useEditorState,
  useSize,
  useVevEvent,
} from '@vev/react';
import {
  HotspotFocus,
  Object3DContextProps,
  Object3DContextProvider,
} from './context/object-3d-context';
import { Object3dViewer } from './components/object-3d-viewer';
import { getAnimations } from './util/get-animations';
import { HotspotEditorForm } from './components/hotspot-editor-form';
import { Vector3 } from 'three';
import { CameraEditor } from './components/camera-editor';
import { InternalHotspot, SavedCameraPosition, StorageHotspot } from './types';
import { EventTypes, InteractionTypes } from './event-types';
import { STANDARD_ENVIRONMENT } from './hooks/use-environment';
import { SilkeBox } from '@vev/silke';
import type { VevManifest } from '@vev/utils';

export const defaultModel = {
  url: 'https://devcdn.vev.design/private/IZ8anjrpLbNsil9YD4NOn6pLTsc2/ZtaWckY6KR_Astronaut.glb.glb',
};

export const LIGHTING = {
  standard: STANDARD_ENVIRONMENT,
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

// The editor modals render outside the widget, so they must add the CSS scope class themselves.
// The Vev CLI scopes all CSS under `.pkg-<key>`; older CLI versions used `<key>_<Component>`.
export const MODAL_SCOPE_CLASS = 'trQ35DZLjAWC0nWJxVvB_Object3d pkg-trQ35DZLjAWC0nWJxVvB';

export const FOV = 45;
export const ASPECT = 2; // the canvas default
export const NEAR = 0.1;
export const FAR = 100;

type LightingOptions = 'standard' | 'hdri1' | 'hdri2' | 'hdri3' | 'hdri4' | 'hdri5' | 'custom';

function noop() {
  return;
}

export type Props = {
  hostRef: React.RefObject<HTMLDivElement>;
  modelUrl: { url: string };
  settings: {
    lighting: LightingOptions;
    customHdri?: { url: string };
    exposure?: number;
    background?: boolean;
    backgroundBlur?: number;
    shadow?: boolean;
    shadowOpacity?: number;
    controls: boolean;
    zoom: boolean;
    hotspotFocus?: HotspotFocus;
    hotspotZoom?: boolean;
  };
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
    scrollAnimation?: boolean;
    scrollTarget?: 'page' | 'section' | 'element';
    scrollStart?: number;
    scrollEnd?: number;
    scrollRotate?: boolean;
    scrollRotateAmount?: number;
    tilt?: boolean;
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
  const hdri =
    lighting === 'custom'
      ? settings?.customHdri?.url || LIGHTING.hdri1
      : LIGHTING[lighting] || LIGHTING.hdri1;
  const controls = settings?.controls || false;
  const zoom = settings?.zoom || false;
  const hotspots = hotspots_camera?.hotspots;
  const animation = animationSettings?.animation;
  const rotate = animationSettings?.rotate;
  const reverseSpeed = animationSettings?.reverseSpeed;
  const scrollAnimation = animationSettings?.scrollAnimation || false;
  const scrollTarget = animationSettings?.scrollTarget || 'element';
  const scrollStart = animationSettings?.scrollStart ?? 0;
  const scrollEnd = animationSettings?.scrollEnd ?? 100;
  const scrollRotate = animationSettings?.scrollRotate || false;
  const scrollRotateAmount = animationSettings?.scrollRotateAmount ?? 360;
  const tilt = animationSettings?.tilt || false;
  const rotationSpeed =
    animationSettings?.rotationSpeed !== undefined ? animationSettings?.rotationSpeed : 2;
  const actualRotationSpeed = reverseSpeed ? rotationSpeed * -1 : rotationSpeed;

  const [internalHotspots, setInternalHotspots] = useState<InternalHotspot[]>([]);
  const eventCallbacks = useRef<{
    click_hotspot: (index: number) => void;
    start_rotation: (speed: number) => void;
    stop_rotation: () => void;
    reset_camera: () => void;
    play_animation: (
      animation: string,
      loop: boolean,
      repetitions: number,
      returnToOriginal: boolean,
    ) => void;
    pause_animation: () => void;
    resume_animation: () => void;
  }>({
    click_hotspot: noop,
    start_rotation: noop,
    stop_rotation: noop,
    reset_camera: noop,
    play_animation: noop,
    pause_animation: noop,
    resume_animation: noop,
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
            anchor: storageHotspot.anchor,
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
    eventCallbacks.current.play_animation(
      args.animation,
      args.loop,
      args.repetitions,
      args.returnToOriginal,
    );
  });

  useVevEvent(InteractionTypes.PAUSE_ANIMATION, () => {
    eventCallbacks.current.pause_animation();
  });

  useVevEvent(InteractionTypes.RESUME_ANIMATION, () => {
    eventCallbacks.current.resume_animation();
  });

  return (
    <div>
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
          hdri,
          exposure: (settings?.exposure ?? 100) / 100,
          showBackground: settings?.background || false,
          backgroundBlur: (settings?.backgroundBlur ?? 0) / 100,
          groundShadow: settings?.shadow || false,
          shadowOpacity: (settings?.shadowOpacity ?? 50) / 100,
          // `hotspotZoom` was a boolean in test builds before `hotspotFocus` replaced it
          hotspotFocus: settings?.hotspotFocus ?? (settings?.hotspotZoom ? 'zoom' : 'turn'),
          rotate,
          rotationSpeed: actualRotationSpeed,
          zoom,
          controls,
          animation,
          scrollAnimation,
          scrollTarget,
          scrollStart,
          scrollEnd,
          scrollRotate,
          scrollRotateAmount,
          tilt,
          hostRef,
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
            pause_animation: (cb) => {
              eventCallbacks.current.pause_animation = cb;
            },
            resume_animation: (cb) => {
              eventCallbacks.current.resume_animation = cb;
            },
          },
          hotspotClicked: (index: number) => {
            dispatchVevEvent(EventTypes.HOTSPOT_CLICKED, {
              [EventTypes.HOTSPOT_CLICKED]: index,
            });
          },
          onModelLoaded: () => {
            dispatchVevEvent(EventTypes.MODEL_LOADED);
          },
          onAnimationFinished: (name: string) => {
            dispatchVevEvent(EventTypes.ANIMATION_FINISHED, {
              [EventTypes.ANIMATION_FINISHED]: name,
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

const hasAnimation = (context) =>
  !!context?.value?.animationSettings?.animation &&
  context.value.animationSettings.animation !== NO_ANIMATION;

const usesScroll = (context) =>
  (context?.value?.animationSettings?.scrollAnimation === true && hasAnimation(context)) ||
  context?.value?.animationSettings?.scrollRotate === true;

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
              { label: 'Standard', value: 'standard' },
              { label: 'Indoor', value: 'hdri1' },
              { label: 'Studio lights', value: 'hdri2' },
              { label: 'Streetlights, dark', value: 'hdri3' },
              { label: 'Natural lights', value: 'hdri4' },
              { label: 'Dim', value: 'hdri5' },
              { label: 'Custom (upload .hdr)', value: 'custom' },
            ],
            display: 'dropdown',
          },
          initialValue: 'hdri1',
        },
        {
          name: 'customHdri',
          title: 'HDR file',
          description: 'Equirectangular .hdr image',
          type: 'upload',
          accept: '.hdr',
          hidden: (context) => context?.value?.settings?.lighting !== 'custom',
        },
        {
          name: 'exposure',
          title: 'Exposure (%)',
          type: 'number',
          initialValue: 100,
          options: {
            display: 'slider',
            min: 0,
            max: 300,
          },
        },
        {
          name: 'background',
          title: 'Show lighting as background',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'backgroundBlur',
          title: 'Background blur (%)',
          type: 'number',
          initialValue: 0,
          options: {
            display: 'slider',
            min: 0,
            max: 100,
          },
          hidden: (context) => context?.value?.settings?.background !== true,
        },
        {
          name: 'shadow',
          title: 'Ground shadow',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'shadowOpacity',
          title: 'Shadow opacity (%)',
          type: 'number',
          initialValue: 50,
          options: {
            display: 'slider',
            min: 0,
            max: 100,
          },
          hidden: (context) => context?.value?.settings?.shadow !== true,
        },
        {
          name: 'controls',
          title: 'Drag',
          description: 'Let users rotate and pan the model',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'zoom',
          title: 'Zoom',
          description: 'Let users zoom with the mouse wheel (pinch on touch screens needs Drag)',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'hotspotFocus',
          title: 'On hotspot click',
          type: 'select',
          options: {
            items: [
              { label: 'Turn to hotspot', value: 'turn' },
              { label: 'Turn and zoom in', value: 'zoom' },
              { label: 'Do not move the camera', value: 'none' },
            ],
            display: 'dropdown',
          },
          initialValue: 'turn',
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
              // The legacy widget stores the model as `modelURL`
              const animations = await getAnimations(
                context.value?.modelUrl?.url ?? context.value?.modelURL?.url,
              );
              return [NO_ANIMATION, ...animations].map((animation) => {
                return { label: animation, value: animation };
              });
            },
            display: 'dropdown',
          },
          initialValue: 'No animation',
        },
        {
          name: 'scrollAnimation',
          title: 'On scroll',
          description: 'Drive animation progress by scroll position',
          type: 'boolean',
          initialValue: false,
          hidden: (context) => !hasAnimation(context),
        },
        {
          name: 'scrollTarget',
          title: 'Run while',
          type: 'select',
          options: {
            items: [
              { label: 'Target itself is in view', value: 'element' },
              { label: 'Parent section is in view', value: 'section' },
              { label: 'Full page is in view', value: 'page' },
            ],
            display: 'dropdown',
          },
          initialValue: 'element',
          hidden: (context) => !usesScroll(context),
        },
        {
          name: 'scrollStart',
          title: 'Start (%)',
          description: 'Scroll percentage where animation begins',
          type: 'number',
          initialValue: 0,
          options: {
            display: 'slider',
            min: 0,
            max: 100,
          },
          hidden: (context) => !usesScroll(context),
        },
        {
          name: 'scrollEnd',
          title: 'End (%)',
          description: 'Scroll percentage where animation ends',
          type: 'number',
          initialValue: 100,
          options: {
            display: 'slider',
            min: 0,
            max: 100,
          },
          hidden: (context) => !usesScroll(context),
        },
        {
          name: 'scrollRotate',
          title: 'Rotate on scroll',
          description: 'Turn the model as the page scrolls',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'scrollRotateAmount',
          title: 'Scroll rotation',
          type: 'number',
          initialValue: 360,
          options: {
            display: 'slider',
            min: -720,
            max: 720,
            format: 'deg',
          },
          hidden: (context) => context?.value?.animationSettings?.scrollRotate !== true,
        },
        {
          name: 'tilt',
          title: 'Follow pointer',
          description: 'Tilt the model toward the mouse pointer',
          type: 'boolean',
          initialValue: false,
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
          hidden: (context) => context?.value?.animationSettings?.rotate === false,
        },
        {
          name: 'reverseSpeed',
          title: 'Reverse direction',
          type: 'boolean',
          initialValue: false,
          hidden: (context) => context?.value?.animationSettings?.rotate === false,
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
    {
      type: EventTypes.MODEL_LOADED,
      description: 'On model loaded',
    },
    {
      type: EventTypes.ANIMATION_FINISHED,
      description: 'On animation finished',
      args: [
        {
          name: EventTypes.ANIMATION_FINISHED,
          description: 'Name of the animation that finished',
          type: 'string',
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
              const form = context.value?.widgetForm;
              const animations = await getAnimations(form?.modelUrl?.url ?? form?.modelURL?.url);
              return [NO_ANIMATION, ...animations].map((animation) => {
                return { label: animation, value: animation };
              });
            },
            display: 'dropdown',
          },
          initialValue: 'No animation',
        },
        {
          name: 'loop',
          title: 'Loop',
          type: 'boolean',
          initialValue: true,
        },
        {
          name: 'repetitions',
          title: 'Repetitions',
          type: 'number',
          initialValue: 1,
        },
        {
          name: 'returnToOriginal',
          title: 'Play once, then return to original',
          type: 'boolean',
          initialValue: false,
        },
      ],
    },
    {
      type: InteractionTypes.PAUSE_ANIMATION,
      description: 'Pause animation',
    },
    {
      type: InteractionTypes.RESUME_ANIMATION,
      description: 'Resume animation',
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

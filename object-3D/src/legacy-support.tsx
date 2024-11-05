import React from 'react';
import { registerVevComponent } from '@vev/react';
import Object3D, { Props, config, HotspotComponent } from './object-3d';
import { VevManifest, VevProps } from '@vev/utils';

type OldProps = {
  hostRef: React.RefObject<HTMLDivElement>;
  modelURL: {
    name: string;
    size: number;
    type?: string;
    url: string;
  };
  hotspots: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    id: number;
  }[];
  posterURL: {
    type: string;
    url: string;
  };
  settings: Props['settings'];
  animationSettings: Props['animationSettings'];
};

const safeArray = (arr: any[] | undefined) => (Array.isArray(arr) ? arr : []);

const mapHotspots = (hotspots: OldProps['hotspots']): Props['hotspots_camera'] => {
  return {
    hotspots: safeArray(hotspots).map((hotspot) => ({
      position: {
        x: hotspot.position.x,
        y: hotspot.position.y,
        z: hotspot.position.z,
      },
      index: hotspot.id,
    })),
  };
};

const mapOldProps = (props: OldProps): Props => {
  return {
    ...props,
    modelUrl: {
      url: props.modelURL?.url,
    },
    poster: {
      url: props.posterURL?.url,
    },
    hotspots_camera: mapHotspots(props.hotspots),
  };
};

const LegacySupportObject3 = (props: OldProps) => {
  return <Object3D {...mapOldProps(props)} />;
};

const convertToLegacySchema = (props: VevManifest['props']): VevProps[] => {
  return props.map((prop) => {
    if (prop.name === 'modelUrl') {
      return {
        ...prop,
        name: 'modelURL',
      };
    }

    if (prop.name === 'posterUrl') {
      return {
        ...prop,
        name: 'posterURL',
      };
    }

    if (prop.name === 'hotspots_camera') {
      return {
        ...prop,
        name: 'hotspots',
        component: ({ context, value, ...rest }) => {
          const props = {
            ...rest,
            value: mapHotspots(value),
            context: {
              ...context,
              value: mapOldProps(context.value),
            },
          };
          return <HotspotComponent {...props} />;
        },
      };
    }
    return prop;
  });
};

registerVevComponent(LegacySupportObject3, {
  ...config,
  name: 'Object3D legacy',
  overrideKey: 'threeModel',
  props: convertToLegacySchema(config.props),
});

export default LegacySupportObject3;

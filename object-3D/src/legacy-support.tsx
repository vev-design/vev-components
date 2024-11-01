import React from "react";
import { registerVevComponent } from "@vev/react";
import { config } from "./object-3d";
import Object3D, { Props } from "./object-3d";
import { VevManifest, VevProps } from "@vev/utils";

type OldProps = {
  hostRef: React.RefObject<HTMLDivElement>;
  modelURL: {
    name: string;
    size: number;
    type?: string;
    url: string;
  }
  hotspots: {
    position: {
      x: number;
      y: number;
      z: number;
    }
    id: number;
  }[],
  posterURL: {
    type: string;
    url: string;
  }
  settings: Props["settings"];
  animationSettings: Props["animationSettings"];
};

const mapOldProps = (props: OldProps): Props => {
  return {
    ...props,
    modelUrl: {
      url: props.modelURL.url,
    },
    poster: {
      url: props.posterURL.url,
    },
    hotspots_camera: {
      hotspots: props.hotspots.map((hotspot) => ({
        position: {
          x: hotspot.position.x,
          y: hotspot.position.y,
          z: hotspot.position.z,
        },
        index: hotspot.id,
      })),
    }
  }
};

const LegacySupportObject3 = (props: OldProps) => {
  return <Object3D
    {...mapOldProps(props)}
  />;
};


const convertToLegacySchema = (props: VevManifest['props']): VevProps[] => {
  console.log('props', props)
  return props.map(prop => {
    if (prop.name === "modelUrl") {
      console.log('convert', prop);
      return {
        ...prop,
        name: "modelURL",
      }
    }

    if (prop.name === "posterUrl") {
      return {
        ...prop,
        name: "posterURL",
      }
    }

    if (prop.name === "hotspots_camera") {
      return {
        ...prop,
        name: "hotspots",
      }
    }
    return prop;
  });
};

console.log('COVERTED', convertToLegacySchema(config.props));

registerVevComponent(LegacySupportObject3, {
  ...config,
  name: "Object3D",
  overrideKey: "threeModel",
  props: convertToLegacySchema(config.props)
});

export default LegacySupportObject3;

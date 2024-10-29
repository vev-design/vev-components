import React from "react";
import { registerVevComponent } from "@vev/react";
import { config } from "./object-3d";
import Object3D, { Props } from "./object-3d";

const mapPropsToRegister = {
  modelUrl: "modelURL",
  hotspots: "hotspots_camera",
};

function reverseMap(obj) {
  return Object.keys(obj).reduce((ret, key) => {
    ret[obj[key]] = key;
    return ret;
  }, {});
}

const mapProps = (prop: any, Map: Record<string, string>) => {
  const keys = Object.keys(prop);

  for (const key of keys) {
    if (Map[key]) {
      prop[Map[key]] = prop[key];
    }
  }

  return prop;
};

const LegacySupportObject3 = (props: Props) => {
  return <Object3D {...mapProps(props, reverseMap(mapPropsToRegister))} />;
};

const mapConfigProps = (props: any[]) => {
  return props.map((prop) => mapProps(prop, mapPropsToRegister));
};

console.log("props", mapConfigProps(config.props));

registerVevComponent(LegacySupportObject3, {
  ...config,
  name: "Object3D",
  overrideKey: "threeModel",
  props: mapConfigProps(config.props),
});

export default LegacySupportObject3;

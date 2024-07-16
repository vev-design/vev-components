import { SilkeBox, SilkeSelectField } from "@vev/silke";
import React from "react";
import { KeyframeFieldProps } from "./utils";

type ClipPathFieldProps = {};

type ClipPathType = "circle" | "ellipse" | "inset" | "polygon";

export function ClipPathField({ value, onChange }: KeyframeFieldProps) {
  let type: ClipPathType | undefined;
  if (value) {
    if (value.startsWith("circle")) {
      type = "circle";
    } else if (value.startsWith("ellipse")) {
      type = "ellipse";
    } else if (value.startsWith("inset")) {
      type = "inset";
    } else if (value.startsWith("polygon")) {
      type = "polygon";
    }
  }
  return (
    <SilkeBox gap="s">
      <SilkeSelectField
        value={type}
        items={[
          { label: "Circle", value: "circle" },
          { label: "Ellipse", value: "ellipse" },
          { label: "Inset", value: "inset" },
          { label: "Polygon", value: "polygon" },
        ]}
        onChange={(type) => {
          onChange(type)
          console.log("TYPE", type);
        }}
      />
    </SilkeBox>
  );
}

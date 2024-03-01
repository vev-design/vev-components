import { SilkeBox, SilkeButton, SilkeCssNumberField } from "@vev/silke";
import React from "react";
import { KeyframeFieldProps } from "./utils";
import { FIELD_WIDTH } from "../animation-form";

function isMissingSuffix(value: string) {
  return /\d+$/.test(value);
}

export function TranslateField({ value, onChange }: KeyframeFieldProps) {
  let [translateX, translateY] = value?.split(" ") || [];
  if (!translateX) translateX = "0px";
  if (!translateY) translateY = translateX;
  if (isMissingSuffix(translateX)) translateX += "px";
  if (isMissingSuffix(translateY)) translateY += "px";

  return (
    <SilkeBox gap="s">
      <SilkeCssNumberField
        label=" Translate X"
        value={translateX}
        onChange={(translateX) => onChange(`${translateX} ${translateY}`)}
        width={FIELD_WIDTH}
      />
      <SilkeCssNumberField
        label="Translate Y"
        value={translateY}
        onChange={(translateY) => onChange(`${translateX} ${translateY}`)}
        width={FIELD_WIDTH}
      />
      <SilkeButton
        disabled={!value}
        icon="redo"
        size="s"
        kind="ghost"
        onClick={() => onChange(null)}
      />
    </SilkeBox>
  );
}

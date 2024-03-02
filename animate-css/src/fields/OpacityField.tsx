import React from "react";
import { FIELD_WIDTH } from "../form/AnimationForm";
import { KeyframeFieldProps, toPercentString } from "./utils";
import { SilkeBox, SilkeButton, SilkeCssNumberField } from "@vev/silke";

export function OpacityField({ value, onChange }: KeyframeFieldProps) {
  return (
    <SilkeBox gap="s">
      <SilkeCssNumberField
        label="Opacity"
        value={toPercentString(value || "1", 1)}
        width={FIELD_WIDTH}
        onChange={(opacity) => onChange(parseInt(opacity) / 100 + "")}
      />
      <SilkeButton
        icon="redo"
        size="s"
        kind="ghost"
        onClick={() => onChange(null)}
      />
    </SilkeBox>
  );
}

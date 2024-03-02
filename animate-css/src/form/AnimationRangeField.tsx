import { SilkeBox, SilkeCssNumberField, SilkeSelectField } from "@vev/silke";
import React from "react";
import { FIELD_WIDTH } from "./AnimationForm";

export function AnimationRangeField({
  value,
  valueOffset,
  label,
  onChange,
  onOffsetChange,
}: {
  value: string;
  valueOffset: number;
  label: string;
  onOffsetChange: (valueOffset: number) => void;
  onChange: (value: string) => void;
}) {
  return (
    <SilkeBox gap="s">
      <SilkeSelectField
        label={label}
        value={value}
        width={FIELD_WIDTH + 20}
        items={[
          { label: "Entering screen", value: "entry-crossing" },
          { label: "Exited screen", value: "exit-crossing" },
        ]}
        onChange={(value: string) => onChange(value)}
      />
      <SilkeCssNumberField
        label="Offset"
        width={FIELD_WIDTH - 20}
        value={valueOffset * 100 + "%"}
        onChange={(valueOffset) => onOffsetChange(parseInt(valueOffset) / 100)}
      />
    </SilkeBox>
  );
}

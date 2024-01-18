import React from "react";
import {
  SilkeBox,
  SilkeTextField,
  SilkeTextFieldItem,
  SilkeTextSmall,
  SilkeButton,
} from "@vev/silke";

interface Props {
  name: string;
  title: string;
  value: number;
  onChange: (value: string | number) => void;
  label: string;
}

const MIN_VAL = 0;
const MAX_VAL = 21;

export default function ZoomButton({ value, onChange, title, label }: Props) {
  const actualValue = parseInt(((value / MAX_VAL) * 100).toFixed(0));

  function updateValue(value: number) {
    const number = Math.min(100, value) / 100;
    const update = MAX_VAL * number;
    onChange(Math.min(Math.max(0, update), 100));
  }

  return (
    <SilkeBox column flex>
      <SilkeBox align="center">
        <SilkeBox vAlign="center" flex>
          <SilkeTextSmall>{title}</SilkeTextSmall>
        </SilkeBox>
      </SilkeBox>
      <SilkeBox vPad="xs">
        <SilkeTextField inline value={actualValue} onChange={updateValue} flex>
          <SilkeTextFieldItem hPad="s">
            <SilkeTextSmall color="neutral-60">{label}</SilkeTextSmall>
          </SilkeTextFieldItem>
        </SilkeTextField>
        <SilkeButton
          onClick={() => {
            updateValue(actualValue - 10);
          }}
          kind="ghost"
          icon="remove"
          size="s"
        />
        <SilkeButton
          onClick={() => {
            updateValue(actualValue + 10);
          }}
          kind="ghost"
          icon="add"
          size="s"
        />
      </SilkeBox>
    </SilkeBox>
  );
}

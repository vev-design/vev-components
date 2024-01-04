import React from 'react';
import { SilkeBox, SilkeCheckbox, SilkeIconTooltip, SilkeTextSmall } from '@vev/silke';

interface Props {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}

export default function BooleanFieldCheckbox({ value, onChange, title, description }: Props) {
  return (
    <SilkeBox row>
      <SilkeCheckbox
        label={title}
        value={value}
        onChange={onChange}
      />
      {description && <SilkeIconTooltip tooltip={description} icon="tooltip" />}
    </SilkeBox>
  );
}

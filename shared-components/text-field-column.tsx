import React from 'react';
import { SilkeBox, SilkeTextField, SilkeTextFieldItem, SilkeTextSmall } from '@vev/silke';

interface Props {
  name: string;
  title: string;
  value: string | number;
  type: 'text' | 'number';
  onChange: (value: string | number) => void;
  placeholder?: string;
}

export default function TextFieldColumn({ value, onChange, title, type, placeholder }: Props) {
  return (
    <SilkeBox column gap="s" fill>
      <SilkeBox>
        <SilkeTextSmall weight="strong">{title}</SilkeTextSmall>
      </SilkeBox>
      <SilkeBox>
        <SilkeTextField inline value={value} type={type} onChange={onChange} size="xs" placeholder={placeholder}/>
      </SilkeBox>
    </SilkeBox>
  );
}

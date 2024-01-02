import React from 'react';
import { SilkeBox, SilkeTextField, SilkeTextFieldItem, SilkeTextSmall } from '@vev/silke';

interface Props {
  name: string;
  title: string;
  value: string | number;
  type: 'text' | 'number';
  onChange: (value: string | number) => void;
  label: string;
}

export default function TextFieldInlineLabel({ value, onChange, title, type, label }: Props) {
  return (
    <SilkeBox column>
      <SilkeBox flex>
        <SilkeBox align="center" style={{ width: '80px' }}>
          <SilkeBox vAlign="center" flex>
            <SilkeTextSmall weight="strong">{title}</SilkeTextSmall>
          </SilkeBox>
        </SilkeBox>
        <SilkeBox flex pad="xs" style={{ width: '140px' }}>
          <SilkeTextField inline value={value} type={type} onChange={onChange} size="xs" flex>
            <SilkeTextFieldItem hPad="s">
              <SilkeTextSmall color="neutral-60">{label}</SilkeTextSmall>
            </SilkeTextFieldItem>
          </SilkeTextField>
        </SilkeBox>
      </SilkeBox>
    </SilkeBox>
  );
}

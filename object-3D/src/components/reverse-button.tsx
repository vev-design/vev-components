import React from 'react';
import { SchemaFieldProps, SchemaFieldTypes } from '@vev/react';
import { SilkeBox, SilkeIcon, SilkeTextSmall } from '@vev/silke';
import style from './reverse-button.module.css';

const ReverseButton = ({
  value = false,
  onChange,
}: SchemaFieldProps<SchemaFieldTypes['boolean']>) => {
  return (
    <SilkeBox row flex gap="xs">
      <SilkeBox align="center" style={{ width: '80px' }}>
        <SilkeBox vAlign="center" flex>
          <SilkeTextSmall weight="strong">Direction</SilkeTextSmall>
        </SilkeBox>
      </SilkeBox>
      <SilkeBox column flex gap="m">
        <div className={value ? style.iconActive : style.iconInactive}>
          <SilkeIcon
            title="Reverse"
            icon="exchange"
            style={{ fontSize: 16 }}
            onClick={() => {
              onChange(!value);
            }}
          />
        </div>
      </SilkeBox>
    </SilkeBox>
  );
};

export default ReverseButton;

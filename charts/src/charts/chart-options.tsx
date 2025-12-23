import { SilkeBox, SilkeToggle } from '@vev/silke';
import React from 'react';

interface Props {}

export function ChartOptions({}: Props) {
  return (
    <SilkeBox>
      <SilkeToggle label="Race datasets" onChange={() => {}} />
    </SilkeBox>
  );
}

import { SilkeBox, SilkeIcon, SilkeTextSmall } from '@vev/silke';
import React, { KeyboardEvent } from 'react';
import styles from './ScrollingSlideTypeField.module.css';
import { SlideType } from '../ScrollingSlide';

type ScrollingSlideTypeFieldProps = {
  value: SlideType;
  onChange: (type: SlideType) => void;
};
type SlideTypeItem = {
  label: string;
  value: SlideType;
};
const SLIDE_TYPES: SlideTypeItem[] = [
  {
    label: 'Scroll',
    value: 'scroll',
  },
  {
    label: 'Fade',
    value: 'fade',
  },
  {
    label: 'Reveal',
    value: 'reveal',
  },
  {
    label: 'Stack',
    value: 'stack',
  },
  {
    label: 'Mask',
    value: 'mask',
  },
  {
    label: 'Custom',
    value: 'custom',
  },
];

export function ScrollingSlideTypeField({ value, onChange }: ScrollingSlideTypeFieldProps) {
  return (
    <SilkeBox gap="s" wrap>
      {SLIDE_TYPES.map((item) => (
        <Tile
          label={item.label}
          type={item.value}
          key={item.value}
          selected={value === item.value}
          onSelect={onChange}
        />
      ))}
    </SilkeBox>
  );
}

type TileProps = {
  label: string;
  selected?: boolean;
  type: SlideType;
  onSelect: (type: SlideType) => void;
};

function Tile({ label, type, selected, onSelect }: TileProps) {
  let cl = styles.tile;
  cl += ' ' + styles[type];
  if (selected) cl += ' ' + styles.selected;

  return (
    <SilkeBox
      className={cl}
      tag="button"
      column
      align="center"
      gap="xs"
      size="xl"
      onClick={() => onSelect(type)}
      onKeyPress={(e: KeyboardEvent) => e.key === 'Enter' && onSelect(type)}
    >
      <div className={styles.preview}>
        <div className={styles.slide}>
          <SilkeIcon icon="image" />
        </div>
        <div className={styles.slide}>
          <SilkeIcon icon="shapes" />
        </div>
      </div>
      <SilkeTextSmall>{label}</SilkeTextSmall>
    </SilkeBox>
  );
}

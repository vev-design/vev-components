import React, { ForwardedRef } from 'react';

import styles from '../ScrollingSlide.module.css';
import { WidgetNode } from '@vev/react';

export type BaseSlideProps = {
  id: string;
  selected: boolean;
  index: number;
  slideCount: number;
  timeline?: ViewTimeline;
  settings?: { [key: string]: any };
  disabled?: boolean;
  transitionOut?: boolean;
  style?: React.CSSProperties;
  section?: boolean;
};
export const BaseSlide = React.forwardRef(
  (
    { selected, id, index, settings, slideCount, style, section, disabled }: BaseSlideProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    let cl = disabled ? styles.static : styles.content;
    if (selected) cl += ' ' + styles.selected;
    const contentClass = section ? '__sc' : null;
    
    return (
      <div
        className={cl}
        ref={ref}
        style={
          {
            ...style,
            zIndex: settings?.reverse ? slideCount - index : index,
          } as any
        }
      >
        <WidgetNode contentClassName={contentClass} id={id} />
      </div>
    );
  },
);

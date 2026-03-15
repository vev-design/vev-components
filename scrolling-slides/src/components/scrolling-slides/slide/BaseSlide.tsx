import React, { ForwardedRef } from 'react';

import styles from '../ScrollingSlide.module.css';
import { useModel, WidgetNode } from '@vev/react';

export type TransitionPhase = {
  type: string;
  settings: Record<string, any>;
  speed: string;
};

export type SlideTransitionModel = {
  transitionIn: TransitionPhase | null;
  transitionOut: TransitionPhase | null;
  ownsIn: boolean;
  ownsOut: boolean;
};

export type BaseSlideProps = {
  id: string;
  selected: boolean;
  index: number;
  slideCount: number;
  timeline?: ViewTimeline;
  disabled?: boolean;
  style?: React.CSSProperties;
  transition: SlideTransitionModel;
};
export const BaseSlide = React.forwardRef(
  (
    { selected, id, index, slideCount, style, transition }: BaseSlideProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    let cl = styles.content;
    if (selected) cl += ' ' + styles.selected;
    const phaseSettings = transition.transitionIn?.settings ?? transition.transitionOut?.settings;
    return (
      <div
        className={cl}
        ref={ref}
        style={
          {
            ...style,
            zIndex: phaseSettings?.reverse ? slideCount - index : index,
          } as any
        }
      >
        <WidgetNode id={id} />
      </div>
    );
  },
);

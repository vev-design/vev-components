import React, { useCallback } from 'react';
import { registerVevComponent, useGlobalState, useGlobalStore, WidgetNode } from '@vev/react';
import styles from './Slider.module.css';

interface CustomDot {
  mainComponent: string;
  variant?: string;
}

type Props = {
  target: string;
  dot: CustomDot;
  activeDot: CustomDot;
};

const SLIDESHOW_TYPE = ['4m4woXHPJqnEyfmHuuf1_Slideshow', '1QRRiAt1Js1nD0ApT2Ek_Slideshow'];

const SlideshowDots = (props: Props) => {
  const models = useGlobalStore((store) => store.models);
  const slideModel = models?.find((e) => e.key === props.target);
  const [state, setState] = useGlobalState(props.target, slideModel?.type);

  const handleClick = useCallback(
    (index: number) => setState({ ...state, index }),
    [setState, state],
  );

  if (!props.target) return <div className={styles.empty}>Select slideshow</div>;

  return (
    <div style={{ textAlign: 'center' }} className={styles.dots}>
      {[...Array(state?.length || 0).keys()].map((key, i) => {
        let isActive = i === (state.index || 0);

        if (props.dot && !isActive) {
          return (
            <span key={i} className={styles.customDot} onClick={() => handleClick(i)}>
              <WidgetNode id={props.dot.mainComponent} externalVariant={props.dot.variant} />
            </span>
          );
        }

        if (isActive && props.activeDot) {
          return (
            <span key={i} className={styles.customDot} onClick={() => handleClick(i)}>
              <WidgetNode
                id={props.activeDot.mainComponent}
                externalVariant={props.activeDot.variant}
              />
            </span>
          );
        }

        return (
          <span key={i} className={isActive ? styles.selected : ''} onClick={() => handleClick(i)}>
            •
          </span>
        );
      })}
    </div>
  );
};

registerVevComponent(SlideshowDots, {
  name: 'Slider Dots',
  size: {
    width: 'auto',
    height: 'auto',
  },
  editableCSS: [
    {
      selector: ':host',
      properties: ['background'],
    },
    {
      selector: styles.dots,
      title: 'Dots',
      properties: ['color', 'font-size'],
    },
    {
      selector: styles.selected,
      title: 'Selected',
      properties: ['color', 'font-size'],
    },
  ],
  props: [
    {
      name: 'target',
      description: 'Which slideshow should the dots target',
      type: 'select',
      options: {
        display: 'dropdown',
        async items(data) {
          console.log('data', data);
          return data.content
            ?.filter((e) => SLIDESHOW_TYPE.includes(e.type))
            .map((s) => ({ value: s.key, label: s.name }));
        },
      },
    },
    {
      name: 'dot',
      title: 'Dot',
      description: 'Main component to use for inactive dot',
      type: 'mainComponent',
    },
    {
      name: 'activeDot',
      title: 'Active dot',
      description: 'Main component to use for active dot',
      type: 'mainComponent',
    },
  ],
});

export default SlideshowDots;

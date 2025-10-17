import React, { useCallback } from 'react';
import { registerVevComponent, useGlobalState, useGlobalStore } from '@vev/react';
import styles from './Slider.module.css';

type Props = {
  target: string;
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
      {[...Array(state?.length || 0).keys()].map((key, i) => (
        <span
          key={i}
          className={i === (state.index || 0) ? styles.selected : ''}
          onClick={() => handleClick(i)}
        >
          •
        </span>
      ))}
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
          return data.content
            ?.filter((e) => SLIDESHOW_TYPE.includes(e.type))
            .map((s) => ({ value: s.key, label: s.name }));
        },
      },
    },
  ],
});

export default SlideshowDots;

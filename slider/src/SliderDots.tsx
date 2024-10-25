import React, { useCallback } from 'react';
import { registerVevComponent, useGlobalState } from '@vev/react';
import styles from './Slider.module.css';

type Props = {
  target: string;
};

const SLIDESHOW_TYPE = '1QRRiAt1Js1nD0ApT2Ek_Slideshow';

const SlideshowDots = (props: Props) => {
  const [state, setState] = useGlobalState(props.target, SLIDESHOW_TYPE);
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
        display: 'autocomplete',
        async items(data) {
          return data.content
            ?.filter((e) => e.type === SLIDESHOW_TYPE)
            .map((s) => ({ value: s.key, label: s.name }));
        },
      },
    },
  ],
});

export default SlideshowDots;

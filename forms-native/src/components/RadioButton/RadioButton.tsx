import React, { useCallback, useEffect, useRef } from 'react';
import { FieldProps, Event, Interaction } from '../../types';
import { registerVevComponent, useDispatchVevEvent, useVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import FieldWrapper from '../FieldWrapper';
import styles from './RadioButton.module.css';

type RadioButton = FieldProps & {
  name: string;
  label: string;
  value: string;
  initialValue: boolean;
};

const INITIAL_DISPATCH_DELAY_MS = 1000;

function RadioButton(props: RadioButton) {
  const dispatch = useDispatchVevEvent();
  const ref = useRef<HTMLInputElement>();

  useVevEvent(Interaction.setValue, (event: { value: string }) => {
    ref.current.checked = event?.value === props.value;
  });

  const handleChange = useCallback(
    (value: string) => {
      dispatch(Event.onChange, {
        name: props.name,
        value,
      });
    },
    [props.name],
  );

  useEffect(() => {
    if (props.initialValue) {
      ref.current.checked = true;
      // Delayed so interaction listeners registered after mount still receive
      // the initial value; the input itself is checked immediately above.
      const timer = setTimeout(() => handleChange(props.value), INITIAL_DISPATCH_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <FieldWrapper>
      <input
        ref={ref}
        type="radio"
        required={props.required}
        value={props.value}
        className={styles.radioButton}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
        name={props.name}
      />
    </FieldWrapper>
  );
}

registerVevComponent(RadioButton, {
  name: 'Radio button',
  categories: ['Form'],
  icon: formIcon,
  size: {
    height: 'auto',
    width: 300,
  },
  editableCSS: [
    {
      selector: styles.radioButton,
      title: 'Radio',
      properties: ['background', 'border', 'border-radius', 'box-shadow'],
    },
    {
      // `color` paints the dot (currentColor on the ::before)
      selector: styles.radioButton + ':checked',
      title: 'Checked',
      properties: ['background', 'border', 'color'],
    },
    {
      selector: styles.radioButton + ':invalid',
      title: 'Invalid',
      properties: ['background', 'border'],
    },
  ],
  events: [
    {
      type: Event.onChange,
      args: [
        {
          name: 'name',
          type: 'string',
          description: 'Field name',
        },
        {
          name: 'value',
          type: 'string',
          description: 'Field value',
        },
      ],
    },
  ],
  interactions: [
    {
      description: 'Set value',
      type: Interaction.setValue,
      args: [{ name: 'value', type: 'string' }],
    },
  ],
  props: [
    {
      name: 'name',
      type: 'string',
    },
    {
      type: 'string',
      name: 'value',
    },
    {
      type: 'boolean',
      name: 'initialValue',
      title: 'Initial value',
    },
  ],
});

export default RadioButton;

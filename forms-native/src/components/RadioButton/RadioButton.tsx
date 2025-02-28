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
      setTimeout(() => {
        handleChange(props.value);
      }, 1000);
      ref.current.checked = true;
    }
  }, []);

  return (
    <FieldWrapper>
      <input
        ref={ref}
        id={props.value}
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
  name: 'Radio button (native)',
  categories: ['Form'],
  icon: formIcon,
  size: {
    height: 'auto',
    width: 300,
  },
  editableCSS: [
    {
      selector: styles.radioButton,
      title: 'Radio Background',
      properties: ['background', 'border', 'border-radius'],
    },
    {
      selector: styles.radioButton + ':checked:before',
      title: 'Radio',
      properties: ['background'],
    },
    {
      selector: styles.radioButton + ':invalid',
      title: 'Invalid',
      properties: ['color', 'background', 'border'],
    },
    {
      selector: styles.radioButton + ':valid',
      title: 'Valid',
      properties: ['color', 'background', 'border'],
    },
  ],
  events: [
    {
      type: Event.onChange,
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FieldProps, Event } from '../../types';
import { registerVevComponent, useDispatchVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './RadioButton.module.css';
import cx from 'classnames';
import FieldWrapper from '../FieldWrapper';

type RadioButton = FieldProps & {
  name: string;
  label: string;
  value: string;
  initialValue: boolean;
};

function RadioButton(props: RadioButton) {
  const dispatch = useDispatchVevEvent();
  const ref = useRef<HTMLInputElement>();

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
  ],
  events: [
    {
      type: Event.onChange,
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

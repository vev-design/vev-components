import React, { useEffect, useRef } from 'react';
import { FieldProps } from '../../types';
import { registerVevComponent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './RadioButton.module.css';
import FieldWrapper from '../FieldWrapper';
import { useFormField } from '../../hooks/use-form';

type RadioButton = FieldProps & {
  name: string;
  label: string;
  value: string;
  initialValue: boolean;
};

function RadioButton(props: RadioButton) {
  const [value, onChange] = useFormField<string>(props.variable);

  const ref = useRef<HTMLInputElement>();

  const handleChange = (value: string) => {
    onChange(value);
  };

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
        id={value}
        type="radio"
        value={props.value}
        className={styles.radioButton}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        name={props.variable}
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
      title: 'Radio Background',
      properties: ['background', 'border', 'border-radius'],
    },
    {
      selector: styles.radioButton + ':checked:before',
      title: 'Radio',
      properties: ['background'],
    },
  ],
  props: [
    {
      name: 'variable',
      type: 'variable',
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

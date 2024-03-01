import React, { useState, useCallback, useEffect } from 'react';
import { FieldProps, Event } from '../../types';
import { registerVevComponent, VevProps, useDispatchVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './TextField.module.css';
import FieldWrapper from '../FieldWrapper';

type Props = FieldProps &
  Validation & {
    inputType?: 'text' | 'number';
    placeholder?: string;
    multiline?: boolean;
    type?: 'text' | 'date' | 'email' | 'url' | 'tel' | 'number' | 'time';
  };

type Validation = {
  min: number;
  max: number;
  minLength: number;
  maxLength: number;
  required: boolean;
};

const validate = (value: string, validate: Validation) => {
  if (!value && validate.required) {
    return false;
  }

  if (value.length < validate.minLength) {
    return false;
  }
  if (value.length > validate.maxLength) {
    return false;
  }

  if (validate.min > 0 && Number(value) < validate.min) {
    return false;
  }

  if (validate.max > 0 && Number(value) > validate.max) {
    return false;
  }

  return true;
};

function TextField(props: Props) {
  const [value, onChange] = useState('');
  const dispatch = useDispatchVevEvent();

  const { name, multiline, type, inputType, className, required, placeholder } = props;

  const handleChange = (value: string) => {
    onChange(value);
    dispatch(Event.onChange, {
      name,
      value,
    });
  };

  useEffect(() => {
    dispatch(Event.onValid);
  }, []);

  const handleValidate = useCallback(() => {
    const valid = validate(value, props);
    if (!valid) {
      dispatch(Event.onInvalid);
    } else {
      dispatch(Event.onValid);
    }
  }, [value, dispatch, props]);

  return (
    <FieldWrapper>
      <div
        className={className}
        ref={(Field) => {
          (window as any).Field = Field;
        }}
        style={{ height: '100%' }}
      >
        {multiline ? (
          <textarea
            id={name}
            className={styles.input}
            name={name}
            rows={5}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleValidate}
            onFocus={() => dispatch(Event.onValid)}
            required={required}
            placeholder={placeholder}
          />
        ) : (
          <input
            id={name}
            className={styles.input}
            type={inputType || type || 'text'}
            placeholder={placeholder}
            name={name}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleValidate}
            onFocus={() => dispatch(Event.onValid)}
            value={value || ''}
            required={required}
          />
        )}
      </div>
    </FieldWrapper>
  );
}

const props: VevProps[] = [
  {
    name: 'name',
    type: 'string',
    initialValue: 'field',
  },
  {
    name: 'required',
    title: 'Required',
    type: 'boolean',
  },
  {
    type: 'select',
    name: 'type',
    initialValue: 'text',
    options: {
      display: 'radio',
      items: [
        {
          value: 'text',
          label: 'Text',
        },
        {
          value: 'number',
          label: 'Number',
        },
        {
          value: 'date',
          label: 'Date',
        },
        {
          value: 'datetime-local',
          label: 'Date & time',
        },
        {
          value: 'tel',
          label: 'Phone',
        },
        {
          value: 'time',
          label: 'Time',
        },
        {
          value: 'email',
          label: 'Email',
        },
        {
          value: 'url',
          label: 'Url',
        },
      ],
    },
  },
  {
    name: 'placeholder',
    type: 'string',
    initialValue: 'Placeholder',
    hidden: (context) => context.value.type === 'date',
  },
  {
    type: 'number',
    name: 'minLength',
    hidden: (context) => !['text', 'email', 'tel', 'url'].includes(context.value.type),
  },
  {
    type: 'number',
    name: 'maxLength',
    hidden: (context) => !['text', 'email'].includes(context.value.type),
  },
  {
    type: 'select',
    name: 'display',
    hidden: (context) => context.value.type !== 'number',
    initialValue: 'input',
    options: {
      display: 'dropdown',
      items: [
        {
          value: 'input',
          label: 'input',
        },
        {
          value: 'slider',
          label: 'slider',
        },
      ],
    },
  },
  {
    type: 'number',
    name: 'min',
    hidden: (context) => context.value.type !== 'number',
  },
  {
    type: 'number',
    name: 'max',
    hidden: (context) => context.value.type !== 'number',
  },
  {
    type: 'boolean',
    name: 'multiline',
    hidden: (context) => context.value.type !== 'text',
  },
];

registerVevComponent(TextField, {
  name: 'Text Field',
  icon: formIcon,
  categories: ['Form'],
  editableCSS: [
    {
      selector: styles.input,
      title: 'Input',
      properties: [
        'border',
        'background',
        'box-shadow',
        'padding',
        'color',
        'border-radius',
        'font-family',
        'font-size',
      ],
    },
    {
      selector: styles.input + '::placeholder',
      title: 'Placeholder',
      properties: ['color', 'font-family', 'font-size'],
    },
  ],
  size: {
    height: 'auto',
    width: 300,
  },
  props,
  events: [
    {
      type: Event.onChange,
    },
    {
      type: Event.onInvalid,
    },
    {
      type: Event.onValid,
    },
  ],
});

export default TextField;

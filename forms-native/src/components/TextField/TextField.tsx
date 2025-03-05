import React, { useState, InputHTMLAttributes } from 'react';
import { FieldProps, Event, Interaction } from '../../types';
import { registerVevComponent, useDispatchVevEvent, useVevEvent } from '@vev/react';
import { VevProps } from '@vev/utils';
import formIcon from '../../assets/form-icon.svg';
import styles from './TextField.module.css';
import FieldWrapper from '../FieldWrapper';

type Props = FieldProps & {
  initialValue?: string;
  inputType?: 'text' | 'number';
  placeholder?: string;
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  type?: 'text' | 'date' | 'email' | 'url' | 'tel' | 'number' | 'time';
};

function TextField(props: Props) {
  const [value, setValue] = useState(props.initialValue || '');
  const dispatch = useDispatchVevEvent();

  const {
    name,
    multiline,
    type,
    inputType,
    className,
    required,
    placeholder,
    minLength,
    maxLength,
    min,
    max,
    pattern,
  } = props;

  const handleChange = (value: string) => {
    dispatch(Event.onChange, {
      name,
      value,
    });

    setValue(value);
  };

  useVevEvent(Interaction.setValue, (event: { value: string }) => {
    setValue(event?.value);
  });

  const validationAttributes: Partial<
    Pick<
      InputHTMLAttributes<HTMLInputElement>,
      'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern'
    >
  > = {};

  if (required !== undefined) validationAttributes.required = required;
  if (minLength !== undefined) validationAttributes.minLength = minLength;
  if (maxLength !== undefined) validationAttributes.maxLength = maxLength;
  if (min !== undefined) validationAttributes.min = min;
  if (max !== undefined) validationAttributes.max = max;
  if (!!pattern) validationAttributes.pattern = pattern;

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
            placeholder={placeholder}
            {...validationAttributes}
          />
        ) : (
          <input
            id={name}
            className={styles.input}
            type={inputType || type || 'text'}
            placeholder={placeholder}
            name={name}
            onChange={(e) => handleChange(e.target.value)}
            value={value || ''}
            {...validationAttributes}
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
    name: 'initialValue',
    type: 'string',
    initialValue: '',
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
  {
    type: 'string',
    name: 'pattern',
  },
];

registerVevComponent(TextField, {
  name: 'Text Field (native)',
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
    {
      selector: styles.input + ':invalid',
      title: 'Invalid',
      properties: ['color', 'background', 'border'],
    },
    {
      selector: styles.input + ':valid',
      title: 'Valid',
      properties: ['color', 'background', 'border'],
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
      type: Interaction.setValue,
      description: 'Set value',
      args: [{ name: 'value', type: 'string' }],
    },
  ],
});

export default TextField;

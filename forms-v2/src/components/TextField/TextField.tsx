import React, { useState, useCallback, useEffect } from 'react';
import { FieldProps, Event } from '../../types';
import { registerVevComponent, useDispatchVevEvent, useGlobalStateRef } from '@vev/react';
import { VevProps } from '@vev/utils';
import formIcon from '../../assets/form-icon.svg';
import styles from './TextField.module.css';
import FieldWrapper from '../FieldWrapper';
import { validate, Validation } from '../../utils/validate';

type Props = FieldProps &
  Validation & {
    inputType?: 'text' | 'number';
    placeholder?: string;
    multiline?: boolean;
    type?: 'text' | 'date' | 'email' | 'url' | 'tel' | 'number' | 'time';
  };

function TextField(props: Props) {
  const dispatch = useDispatchVevEvent();

  const [state, stateDispatch] = useGlobalStateRef();

  const { variables } = state.current;
  const value = variables.find((v) => v.key === props.value)?.value;

  const { name, multiline, type, inputType, className, required, placeholder } = props;

  const handleChange = (value: string) => {
    const valid = validate(value, { ...props, isNumber: type === 'number' });

    stateDispatch(
      'variables',
      variables.map((v) => (v.key === props.value ? { ...v, value } : v)),
    );

    if (valid) {
      dispatch(Event.onValid, {
        name,
        value,
      });
    } else {
      dispatch(Event.onInvalid);
    }
  };

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
    name: 'value',
    type: 'variable',
    variableType: 'text',
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
      type: Event.onInvalid,
    },
    {
      type: Event.onValid,
      args: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'value',
          type: 'string',
        },
      ],
    },
  ],
});

export default TextField;

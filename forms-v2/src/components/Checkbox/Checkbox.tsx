import React, { useEffect, useRef } from 'react';
import { FieldProps, Event } from '../../types';
import { registerVevComponent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Checkbox.module.css';
import { useFormField } from '../../hooks/use-form';

type Props = FieldProps & {
  name: string;
};

function Checkbox(props: Props) {
  const [_, onChange] = useFormField<string>(props.variable);

  const ref = useRef<HTMLInputElement>();

  useEffect(() => {
    if (props.initialValue) {
      if (ref?.current) ref.current.checked = true;
    }
  }, [props.initialValue]);

  return (
    <div className={styles.checkbox}>
      <input
        ref={ref}
        name={props.variable}
        id={props.variable}
        type="checkbox"
        onChange={(e) => {
          const { checked } = e.target;
          onChange(props.value, checked ? 'add' : 'remove');
        }}
      />
    </div>
  );
}

registerVevComponent(Checkbox, {
  name: 'Checkbox',
  categories: ['Form'],
  icon: formIcon,
  props: [
    {
      name: 'variable',
      type: 'variable',
    },
    {
      name: 'value',
      type: 'string',
    },
    {
      name: 'initialValue',
      type: 'boolean',
    },
    {
      name: 'required',
      type: 'boolean',
    },
  ],
  editableCSS: [
    {
      selector: styles.checkbox,
      title: 'Background',
      properties: ['background', 'border', 'border-radius'],
    },
    {
      selector: styles.checkbox + ' input:checked',
      title: 'Checked',
      properties: ['background'],
    },
  ],
  size: {
    width: 50,
    height: 50,
  },
  events: [
    {
      type: Event.onChange,
    },
  ],
});

export default Checkbox;

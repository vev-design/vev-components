import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FieldProps, Event } from '../../types';
import { registerVevComponent, useDispatchVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Checkbox.module.css';
import cx from 'classnames';
import FieldWrapper from '../FieldWrapper';

type Props = FieldProps & {
  name: string;
};

function Checkbox(props: Props) {
  const { name, value } = props;
  const ref = useRef<HTMLInputElement>();
  const dispatch = useDispatchVevEvent();

  const isChecked = false;

  useEffect(() => {
    if (props.initialValue) {
      ref?.current && (ref.current.checked = true);
    }
  }, []);

  return (
    <div className={styles.checkbox}>
      <input
        ref={ref}
        name={name}
        id={name}
        type="checkbox"
        onChange={(e) => {
          const { checked } = e.target;
          dispatch(Event.onChange, {
            name,
            value,
            type: checked ? 'add' : 'remove',
          });
        }}
      />
    </div>
  );
}

registerVevComponent(Checkbox, {
  name: 'Checkbox (native)',
  categories: ['Form'],
  icon: formIcon,
  props: [
    {
      name: 'name',
      type: 'string',
      initialValue: 'fruits',
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
    {
      selector: styles.checkbox + ':invalid',
      title: 'Invalid',
      properties: ['color', 'background', 'border'],
    },
    {
      selector: styles.checkbox + ':valid',
      title: 'Valid',
      properties: ['color', 'background', 'border'],
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

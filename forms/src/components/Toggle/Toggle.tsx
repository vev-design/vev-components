import React, { useCallback, useState } from 'react';
import { FieldProps, Event } from '../../types';
import cx from 'classnames';
import { registerVevComponent, useDispatchVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Toggle.module.css';
import FieldWrapper from '../FieldWrapper';

function Toggle(props: FieldProps) {
  const [value, setValue] = useState(false);
  const dispatch = useDispatchVevEvent();

  const { name, required } = props;

  const handleChange = useCallback(
    (value: boolean) => {
      dispatch(Event.onChange, {
        name,
        value,
      });
      setValue(value);
    },
    [name],
  );

  return (
    <FieldWrapper>
      <label htmlFor={name} className={styles.container}>
        <span
          className={cx(styles.field, {
            [styles.fieldActive]: !!value,
          })}
        >
          <input
            className={styles.checkbox}
            type="checkbox"
            value={value.toString() || ''}
            id={name}
            name={name}
            onChange={() => handleChange(!value)}
            checked={!!value}
          />
          <span
            className={cx(styles.switch, {
              [styles.switchActive]: !!value,
            })}
          />
        </span>
      </label>
    </FieldWrapper>
  );
}

registerVevComponent(Toggle, {
  name: 'Toggle',
  icon: formIcon,
  categories: ['Form'],
  editableCSS: [
    {
      selector: styles.field,
      title: 'Field',
      properties: ['background'],
    },
    {
      selector: styles.switch,
      title: 'Switch',
      properties: ['background'],
    },
    {
      selector: styles.switchActive,
      title: 'Switch',
      properties: ['background'],
    },
  ],
  size: {
    height: 'auto',
    width: 'auto',
  },
  events: [
    {
      type: Event.onChange,
    },
  ],
  props: [
    {
      name: 'name',
      type: 'string',
      initialValue: 'toggle',
    },
    {
      name: 'title',
      type: 'string',
      initialValue: 'Toggle',
    },
    {
      name: 'required',
      type: 'boolean',
    },
  ],
});

export default Toggle;

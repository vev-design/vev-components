import React, { useCallback, useEffect, useState } from 'react';
import { FieldProps, Event } from '../../types';
import cx from 'classnames';
import { registerVevComponent, useDispatchVevEvent, useVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Toggle.module.css';
import FieldWrapper from '../FieldWrapper';

function Toggle(props: FieldProps) {
  const [value, setValue] = useState(props.initialValue || false);
  const dispatch = useDispatchVevEvent();

  console.log('toggle', value);

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

  useVevEvent('SET', (e: any) => {
    setValue(e.value);
  });

  useEffect(() => {
    if (props.initialValue) {
      dispatch(Event.onChange, {
        name,
        value,
      });
      setValue(value);
    }
  }, []);

  return (
    <FieldWrapper>
      <label htmlFor={name} className={styles.container}>
        <span
          className={cx(styles.field, {
            [styles.fieldActive]: !!value,
            [styles.fieldInactive]: !value,
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
      selector: styles.fieldInactive,
      title: 'Background',
      properties: ['background'],
    },
    {
      selector: styles.field,
      title: 'Toggle',
      properties: ['border-radius', 'border'],
    },
    {
      selector: styles.switch,
      title: 'Switch',
      properties: ['background'],
    },
    {
      selector: styles.fieldActive,
      title: 'Background Active',
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
      args: [
        {
          name: 'value',
          type: 'boolean',
        },
      ],
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
    {
      name: 'initialValue',
      type: 'boolean',
      title: 'Initial value',
    },
  ],
  interactions: [
    {
      type: 'SET',
      description: 'Set value',
      args: [
        {
          name: 'value',
          type: 'boolean',
        },
      ],
    },
  ],
});

export default Toggle;

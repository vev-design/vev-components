import React, { useCallback, useEffect, useState } from 'react';
import { FieldProps, Event, Interaction } from '../../types';
import cx from 'classnames';
import { registerVevComponent, useDispatchVevEvent, useVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Toggle.module.css';
import FieldWrapper from '../FieldWrapper';

type ToggleProps = FieldProps & {
  initialValue?: boolean;
};

function Toggle(props: ToggleProps) {
  const [value, setValue] = useState(props.initialValue || false);
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

  useVevEvent(Interaction.setValue, (event: { value: boolean }) => {
    setValue(event?.value);
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
            required={required}
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
  name: 'Toggle (native)',
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
          name: 'name',
          type: 'string',
          description: 'Field name',
        },
        {
          name: 'value',
          type: 'boolean',
          description: 'Field value',
        },
      ],
    },
  ],
  interactions: [
    {
      description: 'Set checked',
      type: Interaction.setValue,
      args: [{ name: 'value', type: 'boolean' }],
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
});

export default Toggle;

import React, { useEffect, useRef } from 'react';
import { FieldProps, Event, Interaction } from '../../types';
import { registerVevComponent, useDispatchVevEvent, useVevEvent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Checkbox.module.css';

type Props = FieldProps & {
  name: string;
  initialValue?: boolean;
};

function Checkbox(props: Props) {
  const { name, value } = props;
  const ref = useRef<HTMLInputElement>();
  const dispatch = useDispatchVevEvent();

  useVevEvent(Interaction.setValue, (event: { value: boolean }) => {
    if (ref.current) {
      ref.current.checked = event?.value;
    }
  });

  useEffect(() => {
    if (props.initialValue && ref.current) {
      ref.current.checked = props.initialValue;
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
            value: checked,
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
});

export default Checkbox;

import React, { useEffect, useRef } from 'react';
import cx from 'classnames';
import { FieldProps, Event, Interaction } from '../../types';
import {
  registerVevComponent,
  useDispatchVevEvent,
  useVevEvent,
  useEditorState,
  WidgetNode,
} from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Checkbox.module.css';

type Props = FieldProps & {
  name: string;
  initialValue?: boolean;
  /** Content-children keys — an optional custom checkmark designed on the canvas */
  children?: string[];
};

function Checkbox(props: Props) {
  const { name, value, children } = props;
  const ref = useRef<HTMLInputElement>();
  const dispatch = useDispatchVevEvent();
  const editor = useEditorState();

  const customMark = children?.[0];
  // While the author is editing the mark child, show it regardless of checked
  // state — otherwise an unchecked box would hide what they're designing.
  const editingMark = !!customMark && editor?.activeContentChild === customMark;

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
        type="checkbox"
        className={cx({ [styles.customMark]: !!customMark })}
        onChange={(e) => {
          const { checked } = e.target;
          dispatch(Event.onChange, {
            name,
            value: checked,
          });
        }}
      />
      {customMark && (
        <div className={cx(styles.mark, { [styles.markVisible]: editingMark })} aria-hidden>
          <WidgetNode id={customMark} />
        </div>
      )}
    </div>
  );
}

registerVevComponent(Checkbox, {
  name: 'Checkbox',
  categories: ['Form'],
  icon: formIcon,
  children: {
    name: 'Checkmark',
    icon: formIcon,
    maxChildren: 1,
  },
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
      selector: styles.checkbox + ' input',
      title: 'Box',
      properties: ['background', 'border', 'border-radius', 'box-shadow'],
    },
    {
      // `color` paints the checkmark (currentColor on the ::after)
      selector: styles.checkbox + ' input:checked',
      title: 'Checked',
      properties: ['background', 'border', 'color'],
    },
    {
      // :invalid/:valid only match the input — the old selectors targeted the
      // wrapper div and never applied
      selector: styles.checkbox + ' input:invalid',
      title: 'Invalid',
      properties: ['background', 'border'],
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

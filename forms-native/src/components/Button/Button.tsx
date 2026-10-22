import React from 'react';
import { registerVevComponent } from '@vev/react';
import formIcon from '../../assets/form-icon.svg';
import styles from './Button.module.css';

type Props = {
  buttonText: string;
  type: 'reset' | 'submit';
};

function Button({ ...props }: Props) {
  const { buttonText = 'Submit', type = 'submit' } = props;

  return (
    <button className={styles.button} type={type}>
      {buttonText}
    </button>
  );
}

registerVevComponent(Button, {
  name: 'Form button (Native)',
  categories: ['Form'],
  icon: formIcon,
  editableCSS: [
    {
      selector: styles.button,
      title: 'Base',
      properties: [
        'background',
        'color',
        'border-radius',
        'box-shadow',
        'padding',
        'font-family',
        'font-size',
        'text-align',
      ],
    },
    {
      selector: styles.button + ':hover',
      title: 'Hover',
      properties: ['background', 'color', 'box-shadow'],
    },
    {
      selector: styles.button + ':disabled',
      title: 'Disabled',
      properties: ['background', 'color', 'box-shadow'],
    },
    {
      selector: styles.button + ':active',
      title: 'Active',
      properties: ['background', 'color', 'box-shadow'],
    },
  ],
  props: [
    {
      name: 'buttonText',
      title: 'Button text',
      type: 'string',
      initialValue: 'Submit',
    },
    {
      name: 'type',
      type: 'select',
      initialValue: 'submit',
      options: {
        items: [
          {
            value: 'submit',
            label: 'Submit',
          },
          {
            value: 'reset',
            label: 'Reset',
          },
        ],
      },
    },
  ],
  size: {
    width: 40,
    height: 100,
  },
  // No interactions: SET_LABEL and SET_LOADING were declared here for years
  // without an implementation, so authors could bind to them and get nothing.
});

export default Button;

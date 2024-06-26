import React from 'react';
import styles from './Typeform.module.css';
import { registerVevComponent } from '@vev/react';

type Props = {
  url: string;
};

const Typeform = ({ url }: Props) => {
  return (
    <div className={styles.wrapper}>
      <iframe className={styles.frame} src={url} frameBorder="0" />
    </div>
  );
};

registerVevComponent(Typeform, {
  name: 'Typeform',
  props: [{ name: 'url', title: 'Typeform URL', type: 'string' }],
  emptyState: {
    action: 'OPEN_PROPERTIES',
    linkText: 'Add URL',
    description: 'to your Typeform form',
    checkProperty: 'url',
  },
  editableCSS: [
    {
      title: 'Container',
      selector: styles.frame,
      properties: ['background', 'border-radius', 'border', 'filter', 'padding', 'margin'],
    },
  ],
  type: 'both',
});

export default Typeform;

import React from 'react';
import styles from './IFrame.module.css';
import { registerVevComponent, useSize } from '@vev/react';

type Props = {
  pageUrl: string;
  scale: number;
  hostRef: React.RefObject<HTMLDivElement>;
};

const getSrc = (src: string) => {
  if (!/^https?:\/\//i.test(src)) return 'https://' + src;
  return src;
};

const IFrame = ({ pageUrl, hostRef, scale = 0 }: Props) => {
  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.iframe}
        frameBorder={0}
        allowFullScreen
        src={getSrc(pageUrl)}
        style={{ zoom: scale }}
      />
    </div>
  );
};

registerVevComponent(IFrame, {
  name: 'IFrame',
  props: [
    {
      name: 'pageUrl',
      title: 'URL to page',
      type: 'string',
      description:
        "If the content you're trying to embed cannot be displayed the site might not allow embedding in an iframe",
    },
    { name: 'scale', title: 'Scale page', type: 'number', initialValue: 0 },
  ],
  emptyState: {
    action: 'OPEN_PROPERTIES',
    linkText: 'Add URL',
    description: 'to page',
    checkProperty: 'pageUrl',
  },
  editableCSS: [
    {
      title: 'Container',
      selector: styles.wrapper,
      properties: ['background', 'border-radius', 'border', 'filter', 'padding', 'margin'],
    },
  ],
  type: 'both',
});

export default IFrame;

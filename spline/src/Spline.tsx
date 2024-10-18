import React, { useEffect, useRef } from 'react';
import styles from './Spline.module.css';
import { registerVevComponent } from '@vev/react';
import SplineViewer from '@splinetool/react-spline';

type Props = {
  sceneUrl: string;
  hostRef: React.RefObject<HTMLDivElement>;
};

const Spline = ({
  sceneUrl = 'https://prod.spline.design/LEvjG3OETYd2GsRw/scene.splinecode',
}: Props) => {
  if (sceneUrl.includes('my.spline.design')) {
    return (
      <iframe
        className={styles.wrapper}
        src={sceneUrl}
        frameBorder="0"
        marginHeight="0"
        marginWidth="0"
      >
        Loading form…
      </iframe>
    );
  }

  return (
    <div className={styles.wrapper}>
      <SplineViewer scene={sceneUrl} />
    </div>
  );
};

registerVevComponent(Spline, {
  name: 'Spline',
  emptyState: {
    linkText: 'Add URL',
    description: ' to your Spline scene',
    checkProperty: 'sceneUrl',
    action: 'OPEN_PROPERTIES',
  },
  description:
    'Embed interactive experiences made with Spline into your Vev project by copying the public URL in Spline and inserting it into the Spline element.',
  props: [
    {
      name: 'sceneUrl',
      title: 'Spline Scene URL',
      type: 'string',
      options: {
        type: 'text',
        multiline: true,
      },
    },
  ],
  editableCSS: [
    {
      title: 'Spline',
      selector: styles.wrapper,
      properties: ['background', 'border-radius', 'border', 'filter'],
    },
  ],
  type: 'both',
});

export default Spline;

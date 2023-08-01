import React, { useRef } from 'react';
import { useHubspotForm } from '@aaronhayes/react-use-hubspot-form';
import styles from './HubspotForm.module.css';

interface HubspotFormProperties {
  portalId: string;
  formId: string;
  className: string;
  widgetId: string;
}

export const HubspotFormElement = ({
  portalId,
  formId,
  className,
  widgetId,
}: HubspotFormProperties) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { loaded, formCreated } = useHubspotForm({
    portalId,
    formId,
    target: `#v-${widgetId}`,
  });
  if (!loaded || !formCreated) return <LoadingScreen />;
  return (
    <div
      ref={wrapperRef}
      key={`v-${widgetId}`}
      className={className}
      id={`v-${widgetId}`}
      dangerouslySetInnerHTML={{ __html: '' }}
    ></div>
  );
};

function LoadingScreen({ error }: { error?: string }) {
  if (error) {
    return (
      <div className={styles.info}>
        <h3>Error loading form, check Form ID and Portal ID</h3>
      </div>
    );
  }
  return (
    <div className={styles.info}>
      <h3>Loading form..</h3>
    </div>
  );
}

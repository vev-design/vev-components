import React, { useEffect, useState } from 'react';
import styles from './HubspotForm.module.css';
import { registerVevComponent } from '@vev/react';
import { HubspotProvider } from '@aaronhayes/react-use-hubspot-form';
import { HubspotFormElement } from './HubspotElement';

type Props = {
  formId: string;
  portalId: string;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

function ConfigScreen() {
  return (
    <div className={styles.info}>
      <h2>Missing settings.</h2>
      <p>
        You have some missing or incompatible settings in your element. Double-click to configure
        it.
      </p>
    </div>
  );
}

const HubspotForm = ({ formId, portalId, hostRef }: Props) => {
  const [usePortalId, setUsePortalId] = useState<string>(null);
  const [useFormId, setUseFormId] = useState<string>(null);
  const [elementId, setElementID] = useState<string>('');

  useEffect(() => {
    if (!elementId && hostRef?.current?.id) setElementID(hostRef.current.id);
  }, [elementId, hostRef]);

  useEffect(() => {
    if (formId && formId !== useFormId) setUseFormId(formId);
    if (portalId && portalId !== usePortalId) setUsePortalId(portalId);
  }, [formId, portalId, useFormId, usePortalId]);

  if (!formId || !portalId) return <ConfigScreen />;
  if (!elementId) return null;

  return (
    <HubspotProvider>
      <HubspotFormElement
        className="container"
        widgetId={elementId}
        formId={useFormId}
        portalId={usePortalId}
      />
    </HubspotProvider>
  );
};

registerVevComponent(HubspotForm, {
  name: 'HubspotForm',
  description:
    'Embed HubSpot Forms into your Vev project by simply pasting the portal and form ID into this form element. [Read documentation](https://help.vev.design/en/articles/6272253-hubspot-forms-beta)',
  props: [
    { name: 'portalId', title: 'Portal ID', type: 'string' },
    { name: 'formId', title: 'Form ID', type: 'string' },
  ],
  type: 'both',
});

export default HubspotForm;

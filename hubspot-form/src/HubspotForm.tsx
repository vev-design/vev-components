import React, { useEffect, useState } from 'react';
import { registerVevComponent } from '@vev/react';
import { HubspotProvider } from '@aaronhayes/react-use-hubspot-form';
import { HubspotFormElement } from './HubspotElement';

type Props = {
  formId: string;
  portalId: string;
  hostRef: React.MutableRefObject<HTMLDivElement>;
};

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

  if (!elementId || !formId || !portalId) return null;

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
  emptyState: {
    action: 'OPEN_PROPERTIES',
    linkText: 'Add portal and form ID',
    description: ' to your HubSpot component',
    checkProperty: 'portalId',
  },
  description:
    'Embed HubSpot Forms into your Vev project by simply pasting the portal and form ID into this form element. [Read documentation](https://help.vev.design/en/articles/6272253-hubspot-forms-beta)',
  props: [
    {
      name: 'portalId',
      title: 'Portal ID',
      type: 'string',
      options: {
        placeholder: '1234567',
      },
    },
    {
      name: 'formId',
      title: 'Form ID',
      type: 'string',
      options: {
        placeholder: '1yegf7831-8wh7-7b91',
      },
    },
  ],
  type: 'both',
});

export default HubspotForm;

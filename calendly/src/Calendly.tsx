import React, { useEffect, useState } from 'react';
import { InlineWidget } from 'react-calendly';
import styles from './Calendly.module.css';
import { registerVevComponent } from '@vev/react';
import { Utm } from 'react-calendly/typings/calendly';

type Props = {
  calendlyUrl: string | null;
  hideEventTypeDetails: boolean;
  hideLandingPageDetails: boolean;
  hideGdprBanner: boolean;
};

const Calendly = ({
  calendlyUrl,
  hideEventTypeDetails = false,
  hideLandingPageDetails = false,
  hideGdprBanner = false,
}: Props) => {
  const [utm, setUtm] = useState<Utm | null>(null);

  // We have to do this in a weird way since the InlineWidget
  // Does not seem to rerender when getting new props
  useEffect(() => {
    if (calendlyUrl) {
      const url = new URL(window.location.toString());
      const params = new URLSearchParams(url.search);
      setUtm({
        utmSource: params.get('utm_source'),
        utmCampaign: params.get('utm_campaign'),
        utmContent: params.get('utm_content'),
        utmTerm: params.get('utm_term'),
        utmMedium: params.get('utm_medium'),
        salesforce_uuid: params.get('salesforce_uuid'),
      });
    }
  }, [calendlyUrl]);

  if (!calendlyUrl) {
    return (
      <div>
        <h1>Enter your Calendly url</h1>
      </div>
    );
  }

  if (!utm) {
    return <></>;
  }

  return (
    <div className={styles.wrapper}>
      <InlineWidget
        styles={{ height: '100%' }}
        url={calendlyUrl}
        utm={utm}
        pageSettings={{
          hideEventTypeDetails,
          hideLandingPageDetails,
          hideGdprBanner,
        }}
      />
    </div>
  );
};

registerVevComponent(Calendly, {
  name: 'Calendly',
  props: [
    {
      title: 'Calendly URL',
      name: 'calendlyUrl',
      type: 'string',
      initialValue: null,
      options: {
        multiline: true,
      },
    },
    {
      title: 'Hide event type details',
      name: 'hideEventTypeDetails',
      type: 'boolean',
      initialValue: false,
    },
    {
      title: 'Hide landing page details',
      name: 'hideLandingPageDetails',
      type: 'boolean',
      initialValue: false,
    },
    {
      title: 'Hide cookie banner',
      name: 'hideGdprBanner',
      type: 'boolean',
      initialValue: false,
    },
  ],
  editableCSS: [],
  description: 'Embed Calendly',
});

export default Calendly;

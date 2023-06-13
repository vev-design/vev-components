import React, { useEffect, useState } from 'react';
import styles from './GoogleMaps.module.css';
import { registerVevComponent } from '@vev/react';
import { SilkeAutocompleteField } from '@vev/silke';

declare global {
  interface Window {
    initGMapsService: () => void;
  }
}

const apiKey = 'AIzaSyAkQRDoMLeuxVyX1QvG_JIxo8P7rajLMxo';
const baseUrl = 'https://www.google.com/maps/embed/v1/';

type Props = {
  address: string;
  zoom: number;
  type: string;
};

function getUrl(address, zoom, type: string) {
  const params = ['key=' + apiKey];
  if (zoom) params.push(`zoom=${zoom}`);
  if (type) params.push(`maptype=${type}`);
  params.push('q=' + encodeURIComponent(address || 'Vev, Oslo, Norway'));
  return baseUrl + 'place' + '?' + params.join('&');
}

const GoogleMaps = ({ address = '', zoom = 15, type = 'roadmap' }: Props) => {
  return (
    <iframe
      className={styles.wrapper}
      frameBorder={0}
      style={{ border: 0 }}
      src={getUrl(address, zoom, type)}
      allowFullScreen
    />
  );
};

const MapsAutoComplete = (props) => {
  const [predictions, setPredictions] = useState<google.maps.places.QueryAutocompletePrediction[]>(
    [],
  );
  const [service, setService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [search, setSearch] = useState<string>(props.value || '');

  useEffect(() => {
    if (service) {
      if (search) {
        service.getQueryPredictions(
          { input: search },
          (predictions: google.maps.places.QueryAutocompletePrediction[] | null) => {
            if (predictions) {
              setPredictions(predictions);
            }
          },
        );
      }
    }
  }, [service, search]);

  useEffect(() => {
    window.initGMapsService = () => {
      setService(new google.maps.places.AutocompleteService());
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGMapsService`;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <SilkeAutocompleteField
      label="Address"
      name="address"
      onChange={(value) => {
        props.onChange(value);
        setSearch(value);
      }}
      onSearch={setSearch}
      onC
      value={search}
      items={predictions.map((prediction) => {
        return {
          value: prediction.description,
          label: prediction.description,
        };
      })}
    />
  );
};

registerVevComponent(GoogleMaps, {
  name: 'Google Maps',
  description:
    "Help readers locate your business or event by adding Google Maps to your project. Vev's Google Map element is a zoomable map snippet for showing a current or custom set location. [Read Documentation](https://help.vev.design/design/elements/google-maps?ref=addmenu)",
  props: [
    {
      title: 'Address',
      name: 'address',
      type: 'string',
      component: MapsAutoComplete,
    },
    {
      title: 'Initial Zoom',
      name: 'zoom',
      type: 'number',
      initialValue: 15,
      options: {
        display: 'slider',
        min: 0,
        max: 21,
      },
    },
    {
      title: 'Map Type',
      name: 'type',
      type: 'select',
      initialValue: 'roadmap',
      options: {
        display: 'dropdown',
        items: [
          { label: 'Roadmap', value: 'roadmap' },
          { label: 'Satellite', value: 'satellite' },
        ],
      },
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background'],
    },
  ],
  type: 'both',
});

export default GoogleMaps;

import React, { useEffect, useRef, useState } from 'react';
import styles from './GoogleMaps.module.css';
import { registerVevComponent, useEditorState } from '@vev/react';
import { SilkeAutocompleteField } from '@vev/silke';
import { useGoogleMapsApi } from './use-google-maps-api';
import { extractEmbedSrc, recenterEmbedSrc, extractSearchQuery } from './parse-embed-url';

const API_KEY = 'AIzaSyAkQRDoMLeuxVyX1QvG_JIxo8P7rajLMxo';
const DEFAULT_CENTER = { lat: 59.913, lng: 10.752 }; // Oslo


type Props = {
  address: string;
  zoom: number;
  type: string;
  embedUrl: string;
  userLocation: boolean;
  hostRef: React.RefObject<HTMLDivElement>;
};

const GoogleMaps = ({
  address = '',
  zoom = 14,
  type = 'roadmap',
  embedUrl = '',
  userLocation = false,
}: Props) => {
  const embedSrc = embedUrl ? extractEmbedSrc(embedUrl) : null;

  // Embed URL mode
  if (embedSrc) {
    return (
      <EmbedMap
        embedUrl={embedUrl}
        embedSrc={embedSrc}
        userLocation={userLocation}
      />
    );
  }

  // JS API mode
  return (
    <JsApiMap
      address={address}
      zoom={zoom}
      type={type}
      userLocation={userLocation}
    />
  );
};

type EmbedMapProps = {
  embedUrl: string;
  embedSrc: string;
  userLocation: boolean;
};

const EmbedMap = ({ embedUrl, embedSrc, userLocation }: EmbedMapProps) => {
  const [src, setSrc] = useState(embedSrc);

  useEffect(() => {
    if (!userLocation) {
      setSrc(embedSrc);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Try to get the original search term (e.g., "Pizza" or "Eiffel Tower")
        const query = extractSearchQuery(embedUrl) || "attractions";
        console.log('query', query);
        if (query) {
          // IMPORTANT: Use /v1/search to keep the icons and sidebar
          const params = new URLSearchParams({
            key: API_KEY,
            q: query, // The magic ingredient for icons
            center: `${latitude},${longitude}`,
            zoom: '14',
          });
          setSrc(`https://www.google.com/maps/embed/v1/search?${params.toString()}`);
        } else {
          // If no query exists, we use /v1/view, but icons will be sparse
          const params = new URLSearchParams({
            key: API_KEY,
            center: `${latitude},${longitude}`,
            zoom: '14',
          });
          setSrc(`https://www.google.com/maps/embed/v1/view?${params.toString()}`);
        }
      },
      () => setSrc(embedSrc)
    );
  }, [userLocation, embedUrl, embedSrc]);

  return (
    <iframe
      className={styles.wrapper}
      src={src}
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
    />
  );
};

type JsApiMapProps = {
  address: string;
  zoom: number;
  type: string;
  userLocation: boolean;
};

const JsApiMap = ({ address, zoom, type, userLocation }: JsApiMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const { disabled } = useEditorState();
  const { ready, error } = useGoogleMapsApi(API_KEY);

  const effectiveZoom = Math.max(1, Math.min(21, zoom));

  // Initialize map once
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: effectiveZoom,
      mapTypeId: type,
      mapId: 'vev-google-maps',
      disableDefaultUI: disabled,
      gestureHandling: disabled ? 'none' : 'auto',
    });

    return () => {
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [ready]);

  // Update map options when props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setMapTypeId(type);
  }, [type]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(effectiveZoom);
  }, [effectiveZoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setOptions({
      disableDefaultUI: disabled,
      gestureHandling: disabled ? 'none' : 'auto',
    });
  }, [disabled]);

  // Center on user's location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation || address) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
    );
  }, [userLocation, address, ready]);

  // Handle address geocoding
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready || !address) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return;

      const location = results[0].geometry.location;
      map.setCenter(location);

      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: location,
        title: address,
      });
      markersRef.current = [marker];
    });
  }, [address, ready]);

  if (error) {
    return <div className={styles.loading}>Failed to load Google Maps</div>;
  }

  if (!ready) {
    return <div className={styles.loading}>Loading map...</div>;
  }

  return <div ref={mapRef} className={styles.wrapper} />;
};

// --- Editor components ---

const MapsAutoComplete = (props: any) => {
  const [predictions, setPredictions] = useState<
    google.maps.places.QueryAutocompletePrediction[]
  >([]);
  const [service, setService] = useState<google.maps.places.AutocompleteService | null>(
    null,
  );
  const [search, setSearch] = useState<string>(props.value || '');
  const { ready } = useGoogleMapsApi(API_KEY);

  useEffect(() => {
    if (ready && !service) {
      setService(new google.maps.places.AutocompleteService());
    }
  }, [ready, service]);

  useEffect(() => {
    if (service && search) {
      service.getQueryPredictions(
        { input: search },
        (preds: google.maps.places.QueryAutocompletePrediction[] | null) => {
          if (preds) setPredictions(preds);
        },
      );
    }
  }, [service, search]);

  return (
    <SilkeAutocompleteField
      label="Address"
      name="address"
      placeholder="Search and select"
      size="s"
      onClear={() => props.onChange(undefined)}
      value={props.value || ''}
      onChange={(value: string) => {
        props.onChange(value);
        setSearch(value);
      }}
      onSearch={setSearch}
      items={predictions.map((p) => ({
        value: p.description,
        label: p.description,
      }))}
    />
  );
};

registerVevComponent(GoogleMaps, {
  name: 'Google Maps',
  description:
    "Help readers locate your business or event by adding Google Maps to your project. Vev's Google Map element is a zoomable map snippet for showing a current or custom set location. [Read Documentation](https://help.vev.design/design/elements/google-maps?ref=addmenu)",
  props: [
    {
      title: 'Embed URL',
      name: 'embedUrl',
      type: 'string',
      placeholder: 'Paste embed URL or <iframe> code',
      description:
        'Paste a Google Maps embed URL or iframe code to embed that map directly',
    },
    {
      title: 'Address',
      name: 'address',
      type: 'string',
      clearProps: ['embedUrl'],
      component: MapsAutoComplete,
      hidden: (context) => {
        return context.value.embedUrl;
      },
    },
    {
      title: 'Zoom',
      name: 'zoom',
      type: 'number',
      initialValue: 14,
      options: {
        display: 'slider',
        min: 1,
        max: 21,
      },
      hidden: (context) => {
        return context.value.embedUrl;
      },
    },
    {
      title: 'Use user location',
      name: 'userLocation',
      type: 'boolean',
      initialValue: false,
      hidden: (context) => {
        return context.value.embedUrl;
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
          { label: 'Default', value: 'roadmap' },
          { label: 'Satellite', value: 'satellite' },
        ],
      },
      hidden: (context) => {
        return context.value.embedUrl;
      },
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ['background', 'margin', 'border', 'border-radius', 'filter'],
    },
  ],
  type: 'both',
});

export default GoogleMaps;

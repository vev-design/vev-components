import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './GoogleMaps.module.css';
import { registerVevComponent, useEditorState } from '@vev/react';
import { SilkeAutocompleteField, SilkeTextField, SilkeBox } from '@vev/silke';
import { useGoogleMapsApi } from './use-google-maps-api';
import { parseEmbedUrl } from './parse-embed-url';

const API_KEY = 'AIzaSyAkQRDoMLeuxVyX1QvG_JIxo8P7rajLMxo';
const DEFAULT_CENTER = { lat: 59.913, lng: 10.752 }; // Oslo

type Props = {
  address: string;
  zoom: number;
  type: string;
  embedUrl: string;
  hostRef: React.RefObject<HTMLDivElement>;
};

const GoogleMaps = ({
  address = '',
  zoom = 14,
  type = 'roadmap',
  embedUrl = '',
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const { disabled } = useEditorState();
  const { ready, error } = useGoogleMapsApi(API_KEY);

  const parsed = useMemo(() => (embedUrl ? parseEmbedUrl(embedUrl) : null), [embedUrl]);

  const effectiveZoom = Math.max(1, Math.min(21, zoom));

  // Initialize map once
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const center =
      parsed?.lat != null && parsed?.lng != null
        ? { lat: parsed.lat, lng: parsed.lng }
        : DEFAULT_CENTER;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: effectiveZoom,
      mapTypeId: type,
      mapId: 'vev-google-maps',
      disableDefaultUI: disabled,
      gestureHandling: disabled ? 'none' : 'auto',
    });

    mapInstanceRef.current = map;

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

  // Handle embed URL center + search
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready || !parsed) return;

    if (parsed.lat != null && parsed.lng != null) {
      map.setCenter({ lat: parsed.lat, lng: parsed.lng });
    }

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    if (parsed.query && !address) {
      const service = new google.maps.places.PlacesService(map);
      service.textSearch(
        {
          query: parsed.query,
          location: parsed.lat != null ? { lat: parsed.lat, lng: parsed.lng } : undefined,
          radius: 50000,
        },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;

          const newMarkers = results.map(
            (place) =>
              new google.maps.marker.AdvancedMarkerElement({
                map,
                position: place.geometry?.location,
                title: place.name,
              }),
          );
          markersRef.current = newMarkers;

          if (results.length > 1) {
            const bounds = new google.maps.LatLngBounds();
            results.forEach((place) => {
              if (place.geometry?.location) bounds.extend(place.geometry.location);
            });
            map.fitBounds(bounds);
          }
        },
      );
    }
  }, [parsed, ready, address]);

  // Handle address geocoding (address mode or override)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready || !address) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) return;

      const location = results[0].geometry.location;
      map.setCenter(location);

      // Clear old markers
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
      size="xs"
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

const EmbedUrlField = (props: any) => {
  return (
    <SilkeBox column gap="s" fill>
      <SilkeTextField
        label="Google Maps Embed URL"
        size="s"
        value={props.value || ''}
        onChange={(value: string) => props.onChange(value)}
        placeholder="Paste embed URL or <iframe> code"
      />
    </SilkeBox>
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
      description: 'Paste a Google Maps embed URL or <iframe> code to recreate that map',
      component: EmbedUrlField,
    },
    {
      title: 'Address',
      name: 'address',
      type: 'string',
      component: MapsAutoComplete,
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

import React, { useEffect, useMemo, useRef } from "react";
import styles from "./MapBox.module.css";
import { registerVevComponent, s, useVevEvent } from "@vev/react";

declare global {
  interface Window {
    mapboxgl: any;
  }
}

const FLY_TO_MARKER = "FLY_TO_MARKER";

type Marker = {
  id: string;
  center: [lng: number, lat: number];
  bearing: number;
  zoom: number;
  pitch: number;
};

let mapBoxPromise: Promise<any> | null = null;
async function initMapbox(
  accessToken: string,
  container: HTMLDivElement,
  mapStyle?: string,
  firstMarker?: Marker
) {
  if (!mapBoxPromise) {
    s.import("https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css");
    mapBoxPromise = s.import(
      "https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.js"
    );
  }
  await mapBoxPromise;
  window.mapboxgl.accessToken = accessToken;
  const map = new window.mapboxgl.Map({
    container,
    // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
    style: mapStyle || "mapbox://styles/mapbox/standard",
    center: firstMarker?.center || [-0.15591514, 51.51830379],
    zoom: firstMarker?.zoom || 15.5,
    bearing: firstMarker?.bearing || 27,
    pitch: firstMarker?.pitch || 45,
  });
  return map;
}

type Props = {
  accessToken: string;
  mapStyle: string;
  markers: {
    marker: {
      id: string;
      lat: string;
      lng: string;
      bearing: number;
      zoom: number;
      pitch: number;
    };
  }[];
};

const MapBox = ({ accessToken, mapStyle, markers }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapBoxRef = useRef<any>(null);
  const markersData: Marker[] = useMemo(
    () =>
      markers?.map((m) => ({
        id: m.marker.id,
        center: [parseFloat(m.marker.lng), parseFloat(m.marker.lat)],
        bearing: m.marker.bearing,
        zoom: m.marker.zoom,
        pitch: m.marker.pitch,
      })),
    [markers]
  );

  useVevEvent(FLY_TO_MARKER, (event: { id: string; speed?: number }) => {
    const map = mapBoxRef.current;
    if (!map) return;

    const marker = markersData.find((m) => m.id === event.id);
    console.log("FLY TO ", marker);
    if (!marker) return;
    map.flyTo({
      ...marker,
      speed: event.speed || 1,
    });
  });

  const firstMarker = markers[0];

  useEffect(() => {
    if (ref.current) {
      initMapbox(accessToken, ref.current, mapStyle, firstMarker).then(
        (map) => {
          mapBoxRef.current = map;
        }
      );
    }
  }, [accessToken, mapStyle]);

  return <div ref={ref} className={styles.wrapper}></div>;
};

registerVevComponent(MapBox, {
  name: "MapBox",

  props: [
    {
      type: "string",
      title: "Access Token",
      name: "accessToken",
      options: { placeholder: "Enter your Mapbox access token", type: "text" },
    },
    {
      type: "string",
      title: "Map Style",
      name: "mapStyle",
      initialValue: "mapbox://styles/mapbox/standard",

      options: {
        type: "text",
        placeholder: "Mapbox Style",
        suggestions: [
          {
            label: "Mapbox Standard",
            value: "mapbox://styles/mapbox/standard",
            icon: "add",
          },
          {
            label: "Mapbox Streets",
            value: "mapbox://styles/mapbox/streets-v12",
            icon: "map",
          },
          {
            label: "Mapbox Outdoors",
            value: "mapbox://styles/mapbox/outdoors-v12",
            icon: "map",
          },
          {
            label: "Mapbox Light",
            value: "mapbox://styles/mapbox/light-v11",
            icon: "map",
          },
          {
            label: "Mapbox Dark",
            value: "mapbox://styles/mapbox/dark-v11",
            icon: "map",
          },
          {
            label: "Mapbox Satellite",
            value: "mapbox://styles/mapbox/satellite-v9",
            icon: "map",
          },
          {
            label: "Mapbox Satellite Streets",
            value: "mapbox://styles/mapbox/satellite-streets-v12",
            icon: "map",
          },
        ],
      },
    },
    {
      type: "array",
      title: "Markers",
      name: "markers",
      of: [
        {
          type: "object",
          name: "marker",
          fields: [
            {
              type: "string",
              title: "Id",
              name: "id",
            },
            {
              type: "string",
              title: "Longitude",
              name: "lng",
            },
            {
              type: "string",
              title: "Latitude",
              name: "lat",
            },
            {
              type: "number",
              name: "bearing",
              title: "Bearing",
              options: {
                placeholder: "Bearing of the map",
              },
            },
            {
              type: "number",
              name: "zoom",
            },
            {
              type: "number",
              name: "pitch",
            },
          ],
        },
      ],
    },
  ],
  interactions: [
    {
      type: FLY_TO_MARKER,
      description: "Fly to a marker on the map",
      args: [
        {
          type: "string",
          name: "id",
          title: "Marker ID",
          options: {
            type: "text",
            placeholder: "ID from added map markers",
          },
        },
        {
          type: "number",
          name: "speed",
          title: "Speed",
          options: {
            placeholder: "Speed of the map fly",
          },
        },
      ],
    },
  ],
  editableCSS: [
    {
      selector: styles.wrapper,
      properties: ["background"],
    },
  ],
  type: "both",
});

export default MapBox;

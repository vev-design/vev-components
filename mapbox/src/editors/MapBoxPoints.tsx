import React from "react";
import MapBox from "../MapBox";

const accessToken =
  "pk.eyJ1IjoidGhhZmZlIiwiYSI6ImNtY3dkZ3FwczAxMnUybXNlNHc1bWkxbGcifQ.J1WA8S4Df1NdC2hwQFyl2Q";
export function MapBoxPoints() {
  return (
    <MapBox
      accessToken={accessToken}
      mapStyle="mapbox://styles/mapbox/standard"
      markers={[]}
    />
  );
}

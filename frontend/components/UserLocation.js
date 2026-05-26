"use client";

import { useEffect } from "react";
import { CircleMarker, Popup, useMap } from "react-leaflet";

/**
 * RecenterMap — shifts the map view to the user's coordinates.
 * Must be used inside a <MapContainer> (calls useMap() internally).
 */
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14, { animate: true });
  }, [lat, lng, map]);
  return null;
}

/**
 * UserLocation — react-leaflet child component.
 * Must be rendered inside a <MapContainer>.
 *
 * Props:
 *   position — { lat, lng } or null
 *
 * When position is provided it:
 *   1. Recenters the map to the user's coordinates at zoom 14
 *   2. Places a distinct orange circle marker at the user's position
 *   3. Shows a popup with the exact coordinates
 */
export default function UserLocation({ position }) {
  if (!position) return null;

  return (
    <>
      <RecenterMap lat={position.lat} lng={position.lng} />

      <CircleMarker
        center={[position.lat, position.lng]}
        radius={10}
        pathOptions={{
          color: "#f97316",
          fillColor: "#f97316",
          fillOpacity: 0.9,
          weight: 2,
        }}
      >
        <Popup>
          <strong>📍 You are here</strong>
          <br />
          {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </Popup>
      </CircleMarker>
    </>
  );
}

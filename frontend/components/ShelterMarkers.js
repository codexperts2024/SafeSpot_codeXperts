"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import UserLocation from "./UserLocation";

const COOLING_URL =
  "https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/Air_Conditioned_and_Cool_Spaces_v2/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson";

const LIBRARY_URL =
  "https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/tpl_branch_general_information___4326/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson";

/**
 * ShelterMarkers — the full Leaflet map.
 *
 * This file is dynamically imported with { ssr: false } from NearestShelter.js
 * so Leaflet never runs on the server (it needs `window` to exist).
 *
 * Props:
 *   userLocation     — { lat, lng } or null
 *   onSheltersLoaded — callback(sheltersArray) once both feeds finish loading
 */
export default function ShelterMarkers({ userLocation, onSheltersLoaded }) {
  const [coolingFeatures, setCoolingFeatures] = useState([]);
  const [libraryFeatures, setLibraryFeatures] = useState([]);

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [43.6532, -79.3832]; // Default: downtown Toronto

  useEffect(() => {
    Promise.all([
      fetch(COOLING_URL).then((r) => r.json()),
      fetch(LIBRARY_URL).then((r) => r.json()),
    ])
      .then(([coolingData, libraryData]) => {
        const cooling = coolingData.features || [];
        const libraries = libraryData.features || [];

        setCoolingFeatures(cooling);
        setLibraryFeatures(libraries);

        // Build flat array for the nearest-shelter calculation in NearestShelter.js
        const coolingList = cooling
          .filter((f) => f.geometry?.coordinates?.length >= 2)
          .map((f) => ({
            type: "cooling",
            name: f.properties.NAME || "Cooling Centre",
            address: f.properties.ADDRESS || "",
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          }));

        const libraryList = libraries
          .filter((f) => f.geometry?.coordinates?.length >= 2)
          .map((f) => ({
            type: "library",
            name: f.properties.BranchName || "Library Branch",
            address: f.properties.address_full || f.properties.ADDRESS || "",
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          }));

        onSheltersLoaded?.([...coolingList, ...libraryList]);
      })
      .catch((err) => console.error("Failed to load shelter data:", err));
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User position marker + auto-recenter */}
      <UserLocation position={userLocation} />

      {/* Cooling centre markers — blue */}
      {coolingFeatures
        .filter((f) => f.geometry?.coordinates?.length >= 2)
        .map((f, i) => (
          <CircleMarker
            key={`cc-${i}`}
            center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
            radius={5}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.7, weight: 1 }}
          >
            <Popup>
              <strong>{f.properties.NAME || "Cooling Centre"}</strong>
              <br />
              {f.properties.ADDRESS || ""}
            </Popup>
          </CircleMarker>
        ))}

      {/* Library markers — green */}
      {libraryFeatures
        .filter((f) => f.geometry?.coordinates?.length >= 2)
        .map((f, i) => (
          <CircleMarker
            key={`lib-${i}`}
            center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
            radius={5}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.7, weight: 1 }}
          >
            <Popup>
              <strong>{f.properties.BranchName || "Library Branch"}</strong>
              <br />
              {f.properties.address_full || f.properties.ADDRESS || ""}
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

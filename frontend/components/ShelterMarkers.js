"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import UserLocation from "./UserLocation";

const COOLING_URL =
  "https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/Air_Conditioned_and_Cool_Spaces_v2/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson";

const LIBRARY_URL =
  "https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/tpl_branch_general_information___4326/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson";

const HEAT_URL =
  "https://services1.arcgis.com/jYHC0Oa2n7z2uKcM/arcgis/rest/services/Impervious_Surface_and_the_Urban_Heat_Island_Effect_in_Toronto_WFL1/FeatureServer/1/query?where=1%3D1&outFields=SurfTemp_Tess_MEAN&f=geojson&resultRecordCount=2000";

// Heat island — all red, opacity by temperature
function heatStyle(feature) {
  const temp = feature.properties.SurfTemp_Tess_MEAN ?? 20;
  const min = 20, max = 42;
  const opacity = Math.min(0.75, Math.max(0.05, (temp - min) / (max - min) * 0.75));
  return { fillColor: "#ef4444", fillOpacity: opacity, weight: 0, stroke: false };
}

// Custom divIcon factory
function makeIcon(emoji) {
  return L.divIcon({
    html: `<div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">${emoji}</div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

const coolingIcon = makeIcon("❄️");
const libraryIcon = makeIcon("📚");

export default function ShelterMarkers({ userLocation, onSheltersLoaded }) {
  const [coolingFeatures, setCoolingFeatures] = useState([]);
  const [libraryFeatures, setLibraryFeatures] = useState([]);
  const [heatData, setHeatData] = useState(null);
  const onSheltersLoadedRef = useRef(onSheltersLoaded);
  onSheltersLoadedRef.current = onSheltersLoaded;

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [43.7, -79.42];

  useEffect(() => {
    Promise.all([
      fetch(COOLING_URL).then((r) => r.json()),
      fetch(LIBRARY_URL).then((r) => r.json()),
    ]).then(([coolingData, libraryData]) => {
      const cooling = coolingData.features || [];
      const libraries = libraryData.features || [];

      setCoolingFeatures(cooling);
      setLibraryFeatures(libraries);

      // Cooling data uses MultiPoint geometry: coordinates = [[lng, lat], ...]
      // so coordinates[0][0] = lng, coordinates[0][1] = lat
      const getCoords = (f) => {
        const c = f.geometry?.coordinates;
        if (!c) return null;
        // MultiPoint: [[lng, lat], ...]
        if (Array.isArray(c[0])) return { lng: c[0][0], lat: c[0][1] };
        // Point: [lng, lat]
        return { lng: c[0], lat: c[1] };
      };

      const coolingList = cooling
        .map((f) => ({ f, coords: getCoords(f) }))
        .filter(({ coords }) => coords !== null)
        .map(({ f, coords }) => ({
          type: "cooling",
          name: f.properties.locationName || f.properties.NAME || "Cooling Centre",
          address: f.properties.address || f.properties.ADDRESS || "",
          lat: coords.lat,
          lng: coords.lng,
        }));

      const libraryList = libraries
        .map((f) => ({ f, coords: getCoords(f) }))
        .filter(({ coords }) => coords !== null)
        .map(({ f, coords }) => ({
          type: "library",
          name: f.properties.BranchName || "Library Branch",
          address: f.properties.Address || f.properties.address || "",
          lat: coords.lat,
          lng: coords.lng,
        }));

      onSheltersLoadedRef.current?.([...coolingList, ...libraryList]);
    }).catch((err) => console.error("Failed to load shelter data:", err));

    fetch(HEAT_URL)
      .then((r) => r.json())
      .then(setHeatData)
      .catch((err) => console.error("Failed to load heat data:", err));
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      {/* Mapbox Light grey base map */}
      <TileLayer
        url={`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
        attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        tileSize={512}
        zoomOffset={-1}
      />

      {/* Heat Island layer — red, opacity by temperature */}
      {heatData && (
        <GeoJSON key="heat" data={heatData} style={heatStyle} />
      )}

      {/* User position */}
      <UserLocation position={userLocation} />

      {/* Cooling centres — ❄️ */}
      {coolingFeatures
        .filter((f) => f.geometry?.coordinates?.length > 0)
        .map((f, i) => {
          const c = Array.isArray(f.geometry.coordinates[0])
            ? f.geometry.coordinates[0]
            : f.geometry.coordinates;
          return (
            <Marker key={`cc-${i}`} position={[c[1], c[0]]} icon={coolingIcon}>
              <Popup>
                <strong>{f.properties.locationName || f.properties.NAME || "Cooling Centre"}</strong>
                <br />
                {f.properties.address || f.properties.ADDRESS || ""}
              </Popup>
            </Marker>
          );
        })}

      {/* Libraries — 📚 */}
      {libraryFeatures
        .filter((f) => f.geometry?.coordinates?.length > 0)
        .map((f, i) => {
          const c = Array.isArray(f.geometry.coordinates[0])
            ? f.geometry.coordinates[0]
            : f.geometry.coordinates;
          return (
            <Marker key={`lib-${i}`} position={[c[1], c[0]]} icon={libraryIcon}>
              <Popup>
                <strong>{f.properties.BranchName || "Library Branch"}</strong>
                <br />
                {f.properties.Address || ""}
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}

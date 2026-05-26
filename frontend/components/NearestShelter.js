"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import ShelterMarkers (the full map) with ssr: false.
// This prevents Leaflet from running on the server, where `window` doesn't exist.
const Map = dynamic(() => import("./ShelterMarkers"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
      <span className="text-3xl animate-pulse">🗺️</span>
      <span className="text-sm">Loading map…</span>
    </div>
  ),
});

/**
 * Haversine formula — straight-line distance between two GPS points.
 * Returns distance in kilometres.
 */
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * NearestShelter — main orchestrator for the GPS + map + routing feature.
 *
 * Holds state:
 *   userLocation — set when user clicks "Detect My Location"
 *   shelters     — set by ShelterMarkers once the ArcGIS feeds load
 *
 * Renders:
 *   - GPS location card with detect button
 *   - Live Leaflet map (ShelterMarkers → cooling + library pins + UserLocation)
 *   - Nearest cooling centre + nearest library result cards
 */
export default function NearestShelter() {
  const [userLocation, setUserLocation] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [gpsError, setGpsError] = useState(null);
  const [loading, setLoading] = useState(false);

  function detectLocation() {
    if (!navigator.geolocation) {
      setGpsError("Your browser does not support GPS location.");
      return;
    }
    setLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setGpsError("Location access denied. Please allow GPS in your browser settings.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Calculate nearest cooling centre and nearest library
  let nearestCooling = null;
  let nearestLibrary = null;

  if (userLocation && shelters.length > 0) {
    const withDistance = shelters.map((s) => ({
      ...s,
      distance: getDistance(userLocation.lat, userLocation.lng, s.lat, s.lng),
    }));

    nearestCooling = withDistance
      .filter((s) => s.type === "cooling")
      .sort((a, b) => a.distance - b.distance)[0];

    nearestLibrary = withDistance
      .filter((s) => s.type === "library")
      .sort((a, b) => a.distance - b.distance)[0];
  }

  return (
    <>
      {/* ── GPS Location card ── */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col">
        <p className="text-sm text-gray-500 mb-2">📍 Your Location</p>

        {userLocation ? (
          <>
            <div className="text-2xl font-bold text-cyan-400">
              {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Lat / Lng</p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-zinc-600">-- , --</div>
            <p className="text-xs text-gray-500 mt-1">Lat / Lng</p>
            <p className="text-xs text-gray-600 mt-3">Real-time location detected via browser GPS</p>
          </>
        )}

        {gpsError && (
          <p className="text-xs text-red-400 mt-3 leading-relaxed">{gpsError}</p>
        )}

        <button
          onClick={detectLocation}
          disabled={loading}
          className="mt-auto pt-4 w-full bg-cyan-700 hover:bg-cyan-600 active:bg-cyan-800 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-150"
        >
          {loading
            ? "⏳ Detecting location…"
            : userLocation
            ? "↺ Update My Location"
            : "📍 Detect My Location"}
        </button>
      </div>

      {/* ── Map legend ── */}
      <div className="flex flex-wrap justify-center gap-5 mt-8 mb-3 text-xs text-gray-500">
        <span><span className="text-orange-400 font-bold">●</span> You</span>
        <span><span className="text-blue-400 font-bold">●</span> Cooling Centres</span>
        <span><span className="text-green-400 font-bold">●</span> Libraries</span>
      </div>

      {/* ── Live map ── */}
      <div className="w-full max-w-3xl h-80 rounded-2xl overflow-hidden border border-zinc-700">
        <Map userLocation={userLocation} onSheltersLoaded={setShelters} />
      </div>

      {/* ── Nearest shelter results ── */}
      {userLocation && shelters.length > 0 && (
        <div className="w-full max-w-3xl mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {nearestCooling && (
            <div className="bg-zinc-900 border border-blue-800 rounded-xl p-4">
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-2">
                ❄️ Nearest Cooling Centre
              </p>
              <p className="text-white font-semibold">{nearestCooling.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{nearestCooling.address}</p>
              <p className="text-blue-400 text-sm font-bold mt-3">
                {nearestCooling.distance.toFixed(2)} km away
              </p>
            </div>
          )}

          {nearestLibrary && (
            <div className="bg-zinc-900 border border-green-800 rounded-xl p-4">
              <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-2">
                📚 Nearest Library
              </p>
              <p className="text-white font-semibold">{nearestLibrary.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{nearestLibrary.address}</p>
              <p className="text-green-400 text-sm font-bold mt-3">
                {nearestLibrary.distance.toFixed(2)} km away
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

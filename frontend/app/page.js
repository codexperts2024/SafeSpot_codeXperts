
'use client';
import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import AlertBanner from '@/components/AlertBanner';
import LogViewer from '@/components/LogViewer';

function getAlertLevel(temp) {
  if (temp === null) return "Safe";
  if (temp >= 40) return "Extreme";
  if (temp >= 35) return "Danger";
  if (temp >= 30) return "Caution";
  return "Safe";
}


let activeAudioCtx = null;

function playAlarmSound(level) {
  try {
    if (activeAudioCtx) {
      try {
        activeAudioCtx.close().catch(() => {});
      } catch (err) {}
      activeAudioCtx = null;
    }
    if (level === "Safe" || !level) {
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    activeAudioCtx = ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";

    if (level === "Extreme") {
      // Fast wailing siren
      gain.gain.setValueAtTime(0.25, t);
      for (let i = 0; i < 4; i++) {
        osc.frequency.setValueAtTime(600, t + i * 0.5);
        osc.frequency.linearRampToValueAtTime(1400, t + i * 0.5 + 0.25);
        osc.frequency.linearRampToValueAtTime(600, t + i * 0.5 + 0.5);
      }
      gain.gain.setValueAtTime(0.25, t + 1.9);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      osc.start(t);
      osc.stop(t + 2.0);
    } else if (level === "Danger") {
      // Slower wailing siren
      gain.gain.setValueAtTime(0.25, t);
      for (let i = 0; i < 2; i++) {
        osc.frequency.setValueAtTime(500, t + i * 0.8);
        osc.frequency.linearRampToValueAtTime(1100, t + i * 0.8 + 0.4);
        osc.frequency.linearRampToValueAtTime(500, t + i * 0.8 + 0.8);
      }
      gain.gain.setValueAtTime(0.25, t + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.start(t);
      osc.stop(t + 1.6);
    } else if (level === "Caution") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t);
      const beepDur = 0.12;
      const gap = 0.15;
      const groupGap = 0.35;
      for (let i = 0; i < 4; i++) {
        const s = t + i * (beepDur + gap);
        gain.gain.setValueAtTime(0.45, s);
        gain.gain.setValueAtTime(0.45, s + beepDur);
        gain.gain.setValueAtTime(0, s + beepDur + 0.01);
      }
      const offset = 4 * (beepDur + gap) + groupGap;
      for (let i = 0; i < 4; i++) {
        const s = t + offset + i * (beepDur + gap);
        gain.gain.setValueAtTime(0.45, s);
        gain.gain.setValueAtTime(0.45, s + beepDur);
        gain.gain.setValueAtTime(0, s + beepDur + 0.01);
      }
      gain.gain.setValueAtTime(0, t);
      osc.start(t);
      osc.stop(t + offset + 4 * (beepDur + gap));
    }
  } catch (e) {
    console.log("Audio play blocked:", e);
  }
}

function getPillStyles(temp) {
  if (temp === null) {
    return {
      bg: "bg-green-500/15 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]",
      ping: "bg-green-400",
      dot: "bg-green-500",
      text: "text-green-300/80"
    };
  }
  if (temp >= 40) {
    return {
      bg: "bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
      ping: "bg-red-400",
      dot: "bg-red-500",
      text: "text-red-300/80"
    };
  }
  if (temp >= 35) {
    return {
      bg: "bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]",
      ping: "bg-orange-400",
      dot: "bg-orange-500",
      text: "text-orange-300/80"
    };
  }
  if (temp >= 30) {
    return {
      bg: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]",
      ping: "bg-yellow-400",
      dot: "bg-yellow-500",
      text: "text-yellow-300/80"
    };
  }
  return {
    bg: "bg-green-500/15 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]",
    ping: "bg-green-400",
    dot: "bg-green-500",
    text: "text-green-300/80"
  };
}

function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

function bearingToCompass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function pointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function detectHeatZone(userPos, features) {
  if (!userPos || !features || features.length === 0) return null;
  const pt = [userPos.lng, userPos.lat];
  const matching = features.filter(f => {
    const geom = f.geometry;
    if (!geom) return false;
    const rings = geom.type === 'Polygon' ? [geom.coordinates[0]] : geom.type === 'MultiPolygon' ? geom.coordinates.map(p => p[0]) : [];
    return rings.some(ring => pointInPolygon(pt, ring));
  }).map(f => f.properties?.SurfTemp_Tess_MEAN ?? 0);
  if (matching.length === 0) return null;
  const maxTemp = Math.max(...matching);
  return maxTemp >= 30 ? 'high' : maxTemp >= 25 ? 'medium' : 'low';
}

export default function Home() {
  const [locationText, setLocationText] = useState('Detect location');

  const [sensorTemp, setSensorTemp] = useState(20.0);
  const [sensorHumidex, setSensorHumidex] = useState(null);
  const [simulatedTemp, setSimulatedTemp] = useState(null);
  const activeTemp = simulatedTemp !== null ? simulatedTemp : sensorTemp;
  const activeHumidex = simulatedTemp !== null ? simulatedTemp : (sensorHumidex ?? sensorTemp);
  const fetchSensorRef = useRef(null);
  const [weatherTemp, setWeatherTemp] = useState(null);
  const [weatherDesc, setWeatherDesc] = useState(null);
  const [weatherLoc, setWeatherLoc] = useState(null);
  const mapRef = useRef(null);
  const [userPos, setUserPos] = useState(null);
  const [sheltersList, setSheltersList] = useState([]);
  const [nearestShelter, setNearestShelter] = useState(null);
  const [nearestCooling, setNearestCooling] = useState(null);
  const [nearestLibrary, setNearestLibrary] = useState(null);
  const [heatFeatures, setHeatFeatures] = useState([]);
  const [currentZone, setCurrentZone] = useState(null);
  const [nearestBearing, setNearestBearing] = useState(null);
  const [selectedShelterType, setSelectedShelterType] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [locationDetail, setLocationDetail] = useState('');
  const [locationFull, setLocationFull] = useState('');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [toastAlert, setToastAlert] = useState(null);
  const toastTimeoutRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current || !selectedShelterType) return;

    let target = null;
    if (selectedShelterType === 'cooling' && nearestCooling) {
        target = nearestCooling;
    } else if (selectedShelterType === 'library' && nearestLibrary) {
        target = nearestLibrary;
    }

    if (target) {
        // Fly to the selected shelter automatically with higher zoom level
        mapRef.current.flyTo([target.lat, target.lng], 15, { duration: 1.2 });
    }
  }, [selectedShelterType, nearestCooling, nearestLibrary]);

  const getBannerAlert = () => {
    if (activeTemp === null) return null;
    if (activeTemp >= 40) {
      return { level: "extreme", message: "Extreme danger — Avoid outdoor activities!" };
    }
    if (activeTemp >= 36) {
      return { level: "danger", message: "Extreme Heat Warning — Heatstroke risk is critical!" };
    }
    if (activeTemp >= 30) {
      return { level: "caution", message: "Stay hydrated and seek shade" };
    }
    return null;
  };

  const prevLevel = useRef(null);
  useEffect(() => {
    const level = getAlertLevel(activeTemp);
    if (level === "Safe" || !level) {
      prevLevel.current = level;
      playAlarmSound("Safe");
      return;
    }
    if (level === prevLevel.current) return;
    prevLevel.current = level;
    playAlarmSound(level);

    // In-app toast
    setToastAlert({ level, temp: activeTemp });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastAlert(null), 5000);

    // Browser notification (works on desktop + iOS PWA 16.4+)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      } else if (Notification.permission === 'granted') {
        new Notification(`SafeSpot: ${level} Heat Alert`, {
          body: `${activeTemp?.toFixed(1)}°C detected — find a cooling centre!`,
          icon: '/favicon.svg'
        });
      }
    }
  }, [activeTemp]);

  // Poll Sensor Data
  useEffect(() => {
    async function fetchSensor() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/sensors`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.temperature != null) setSensorTemp(data.temperature);
        if (data.humidex != null) setSensorHumidex(data.humidex);
      } catch {}
    }
    fetchSensorRef.current = fetchSensor;
    fetchSensor();
    const interval = setInterval(fetchSensor, 5000);
    return () => clearInterval(interval);
  }, []);



  // Poll Weather Data
  useEffect(() => {
    async function fetchWeather() {
      try {
        const key = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        if (!key) return;
        const URL = `https://api.openweathermap.org/data/2.5/weather?q=Toronto,CA&appid=${key}&units=metric`;
        const res = await fetch(URL);
        const data = await res.json();
        if (data.main?.temp != null) { setWeatherTemp(data.main.temp); setWeatherDesc(data.weather?.[0]?.description || ""); setWeatherLoc(data.name || ""); }
      } catch {}
    }
    fetchWeather();
    const interval = setInterval(fetchWeather, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute Nearest Shelter
  useEffect(() => {
    if (!userPos || sheltersList.length === 0) return;
    
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

    const withDist = sheltersList.map(s => ({
      ...s,
      distance: getDistance(userPos.lat, userPos.lng, s.lat, s.lng)
    }));
    const cooling = withDist.filter(s => s.type === 'cooling').sort((a, b) => a.distance - b.distance);
    const libraries = withDist.filter(s => s.type === 'library').sort((a, b) => a.distance - b.distance);
    
    if (cooling.length > 0) setNearestCooling(cooling[0]);
    if (libraries.length > 0) setNearestLibrary(libraries[0]);

    const overall = [...withDist].sort((a, b) => a.distance - b.distance);
    const nearest = overall[0];
    setNearestShelter(nearest);
    if (nearest) {
      setNearestBearing(getBearing(userPos.lat, userPos.lng, nearest.lat, nearest.lng));
      setSelectedShelterType(prev => prev ?? nearest.type);
    }
  }, [userPos, sheltersList]);

  useEffect(() => {
    setCurrentZone(detectHeatZone(userPos, heatFeatures));
  }, [userPos, heatFeatures]);

  // Listen for map location button requesting GPS
  useEffect(() => {
    const handler = () => requestUserLocation(true);
    window.addEventListener('safespot-request-location', handler);
    return () => window.removeEventListener('safespot-request-location', handler);
  }, []);


  useEffect(() => {
    // Lucide icons
    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }
    
    // Extracted DOMContentLoaded scripts:

      if(document.getElementById('map') && typeof L !== 'undefined') {
        const cached = localStorage.getItem('safespot_coords');
        let initialLat = 43.7, initialLng = -79.42;
        if (cached) {
            try {
                const coords = JSON.parse(cached);
                if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
                    initialLat = coords.lat;
                    initialLng = coords.lng;
                }
            } catch(e) {}
        }

        const map = L.map('map', { zoomControl: false }).setView([initialLat, initialLng], 14);
        mapRef.current = map;
        
        // Dark theme map tiles (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        const COOLING_URL = "https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/Air_Conditioned_and_Cool_Spaces_v2/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson";
        const LIBRARY_URL = "https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/tpl_branch_general_information___4326/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson";
        const HEAT_URL = "https://services1.arcgis.com/jYHC0Oa2n7z2uKcM/arcgis/rest/services/Impervious_Surface_and_the_Urban_Heat_Island_Effect_in_Toronto_WFL1/FeatureServer/1/query?where=1%3D1&outFields=SurfTemp_Tess_MEAN&f=geojson&resultRecordCount=2000";

        const makeIcon = (emoji, type) => {
            // 타입별로 배경색과 테두리색을 다르게 적용하여 유리 같은 느낌(Glassmorphism) 연출
            const bg = type === 'cooling' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            const border = type === 'cooling' ? 'rgba(96, 165, 250, 0.5)' : 'rgba(255, 255, 255, 0.3)';
            return L.divIcon({
                html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${bg};border:1px solid ${border};box-shadow:0 4px 12px rgba(0,0,0,0.5);font-size:14px;backdrop-filter:blur(4px); cursor:pointer;">${emoji}</div>`,
                className: "",
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -14]
            });
        };

        fetch(HEAT_URL).then(r=>r.json()).then(data => {
            L.geoJSON(data, {
                style: function(feature) {
                    const temp = feature.properties.SurfTemp_Tess_MEAN || 20;
                    let color, opacity;
                    if (temp >= 30) {
                        color = "#dc2626"; opacity = 0.85;
                    } else if (temp >= 25) {
                        color = "#f97316"; opacity = 0.65;
                    } else {
                        color = "#facc15"; opacity = 0.45;
                    }
                    return { fillColor: color, fillOpacity: opacity, weight: 0, stroke: false };
                }
            }).addTo(map);
            if (data.features) setHeatFeatures(data.features);
        }).catch(e => console.error("Heat data load failed", e));

        fetch(COOLING_URL).then(r=>r.json()).then(data => {
            L.geoJSON(data, {
                pointToLayer: function(feature, latlng) {
                    // 동일 좌표에 있을 때 겹침을 방지하기 위한 미세한 분산(Jitter) 처리
                    const jLat = latlng.lat + (Math.random() - 0.5) * 0.0003;
                    const jLng = latlng.lng + (Math.random() - 0.5) * 0.0003;
                    return L.marker([jLat, jLng], {icon: makeIcon("❄️", "cooling")})
                        .bindTooltip(`<strong>${feature.properties.locationName || 'Cooling Centre'}</strong><br/>${feature.properties.address || ''}`, {direction: 'top', offset: [0, -10]});
                }
            }).addTo(map);
        }).catch(e => console.error("Cooling data load failed", e));

        fetch(LIBRARY_URL).then(r=>r.json()).then(data => {
            L.geoJSON(data, {
                pointToLayer: function(feature, latlng) {
                    // 동일 좌표에 있을 때 겹침을 방지하기 위한 미세한 분산(Jitter) 처리
                    const jLat = latlng.lat + (Math.random() - 0.5) * 0.0003;
                    const jLng = latlng.lng + (Math.random() - 0.5) * 0.0003;
                    return L.marker([jLat, jLng], {icon: makeIcon("📚", "library"), zIndexOffset: 1000})
                        .bindTooltip(`<strong>${feature.properties.BranchName || 'Library'}</strong><br/>${feature.properties.Address || ''}`, {direction: 'top', offset: [0, -10]});
                }
            }).addTo(map);
        }).catch(e => console.error("Library data load failed", e));
        
        const userIcon = L.divIcon({
            html: `<div class="relative flex items-center justify-center w-8 h-8"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-70"></span><div class="w-5 h-5 bg-green-500 rounded-full border-[2px] border-white shadow-[0_0_15px_rgba(34,197,94,0.9)]"></div></div>`,
            className: "",
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        let userMarker = null;

        window.addEventListener('safespot-gps-updated', (e) => {
            const { lat, lng } = e.detail;
            if (!userMarker) {
                userMarker = L.marker([lat, lng], {icon: userIcon, zIndexOffset: 9999}).addTo(map).bindTooltip("<b>You are here</b>", {permanent: true, direction: 'top', offset: [0, -16]});
            } else {
                userMarker.setLatLng([lat, lng]);
            }
            map.flyTo([lat, lng], 15, { duration: 1.2 });
        });

        // Add "Go to My Location" Control
        const MyLocationControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function (map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = `<button style="background-color: #161616; border: none; color: #fff; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#262626'" onmouseout="this.style.background='#161616'" title="Go to My Location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
                </button>`;
                container.style.border = "1px solid rgba(255,255,255,0.1)";
                container.style.overflow = "hidden";
                container.style.borderRadius = "4px";
                
                // Prevent click events from propagating to the map
                L.DomEvent.disableClickPropagation(container);
                
                container.onclick = function(e){
                    e.preventDefault();
                    if (!userMarker) {
                        // No GPS yet — ask React to acquire location
                        window.dispatchEvent(new CustomEvent('safespot-request-location'));
                    } else {
                        const latlng = userMarker.getLatLng();
                        map.flyTo([latlng.lat, latlng.lng], 15, { duration: 1.2 });
                    }
                };
                return container;
            }
        });
        map.addControl(new MyLocationControl());
      }

      // -------------------------------------------------------------
      // UI Interactions: Active Nav State & Back to Top
      // -------------------------------------------------------------
      const navLinks = document.querySelectorAll('nav a[href^="#"]');
      const backToTopBtn = document.getElementById('backToTop');
      
      const sections = [];
      navLinks.forEach(link => {
        const targetId = link.getAttribute('href');
        const targetEl = document.querySelector(targetId);
        if (targetEl) sections.push(targetEl);
      });

      // 1. Back to Top Button Visibility
      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
          backToTopBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
          backToTopBtn.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        } else {
          backToTopBtn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
          backToTopBtn.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
        }
      });

      // 2. Active Menu Highlight using IntersectionObserver
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const current = entry.target.getAttribute('id');
            navLinks.forEach(link => {
              link.classList.remove('text-white');
              if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('text-white');
              }
            });
          }
        });
      }, { threshold: 0.5 });

      sections.forEach(section => {
        observer.observe(section);
      });

      backToTopBtn.addEventListener('click', () => {
        if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.2 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      // Smooth scroll via Lenis (expo-out easing = Apple-like feel)
      const lenisEase = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

      function scrollTo(target, offset = 0) {
        // Always restart Lenis in case it was stopped by the How It Works stick effect
        window.__lenis?.start();
        if (window.__lenis) {
          window.__lenis.scrollTo(target, { offset, duration: 1.4, easing: lenisEase });
        } else {
          const y = (typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY) + offset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }

      // Smooth scroll for nav links
      navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').slice(1);
          const isMobile = window.innerWidth < 768;
          let scrollTarget;
          if (targetId === 'dashboard') {
            scrollTarget = isMobile
              ? (document.getElementById('map-area') || document.getElementById('map-widget'))
              : document.getElementById('map-widget');
          } else {
            scrollTarget = document.getElementById(targetId);
          }
          if (scrollTarget) {
            const navH = document.querySelector('header')?.offsetHeight || 64;
            scrollTo(scrollTarget, -(navH + 8));
          }
        });
      });
      
      // Re-initialize icons just in case
      if (typeof window !== 'undefined' && window.lucide) {
        window.lucide.createIcons();
      }

      // Scrollytelling for How It Works
      const hwSection = document.getElementById('how-it-works-simple');
      const hwItems = document.querySelectorAll('.hw-scroll-item');
      if(hwSection && hwItems.length > 0) {
        let wasAllVisible = false;
        let isStuck = false;
        let stuckAt = 0;
        let accumulated = 0;
        const STICK_THRESHOLD = 187; // wheel delta px before releasing

        // Wheel intercept for stick — e.preventDefault() blocks Lenis wheel input.
        // Nav clicks are programmatic (RAF-based), so they bypass this entirely.
        window.addEventListener('wheel', (e) => {
          if (!isStuck) return;
          e.preventDefault();
          accumulated += Math.abs(e.deltaY);
          if (accumulated >= STICK_THRESHOLD) {
            isStuck = false;
            accumulated = 0;
          }
        }, { passive: false });

        window.addEventListener('scroll', () => {
          const rect = hwSection.getBoundingClientRect();
          const totalScrollHeight = hwSection.offsetHeight - window.innerHeight;

          let scrollProgress = 0;
          if (rect.top <= 0) {
            scrollProgress = Math.abs(rect.top) / totalScrollHeight;
          }
          scrollProgress = Math.max(0, Math.min(1, scrollProgress));

          // Items appear during first 55% of scroll
          const itemProgress = Math.min(scrollProgress / 0.55, 1);
          let activeIndex = Math.floor(itemProgress * hwItems.length);
          if (activeIndex >= hwItems.length) activeIndex = hwItems.length - 1;

          hwItems.forEach((item, index) => {
            if (index <= activeIndex) {
              item.classList.remove('opacity-0', 'translate-y-8', 'pointer-events-none');
              item.classList.add('opacity-100', 'translate-y-0');
            } else {
              item.classList.remove('opacity-100', 'translate-y-0');
              item.classList.add('opacity-0', 'translate-y-8', 'pointer-events-none');
            }
          });

          // Show View Details only after all 4 items revealed (>= 55% progress)
          const allVisible = scrollProgress >= 0.55;
          const btn = document.getElementById('view-details-btn');
          if (btn) {
            if (allVisible) {
              btn.classList.remove('opacity-0', 'pointer-events-none');
              btn.classList.add('opacity-100', 'pointer-events-auto');
              if (!btn.dataset.clicked) btn.classList.add('btn-glow');
            } else {
              btn.classList.add('opacity-0', 'pointer-events-none');
              btn.classList.remove('opacity-100', 'pointer-events-auto', 'btn-glow');
            }
          }

          if (allVisible && !wasAllVisible) {
            isStuck = true;
            accumulated = 0;
            if (btn && !btn.dataset.clicked) {
              btn.addEventListener('click', () => {
                btn.classList.remove('btn-glow');
                btn.dataset.clicked = '1';
              }, { once: true });
            }
          }
          if (!allVisible) {
            isStuck = false;
          }
          wasAllVisible = allVisible;
        }, { passive: true });
      }

      // News citation reveal
      const citeItems = document.querySelectorAll('.cite-item');
      if (citeItems.length > 0) {
        const citeObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.remove('opacity-0', 'translate-y-4');
              entry.target.classList.add('opacity-100', 'translate-y-0');
              citeObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.2 });
        citeItems.forEach(item => citeObserver.observe(item));
      }

      // -------------------------------------------------------------
      // Spotlight Hover Effect
      // -------------------------------------------------------------
      document.querySelectorAll('.spotlight-card').forEach(card => {
        card.addEventListener('mousemove', e => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--x', `${x}px`);
          card.style.setProperty('--y', `${y}px`);
        });
      });

    
  }, []);

  
  useEffect(() => {
    async function loadShelters() {
      try {
        const getCoords = (f) => {
          const c = f.geometry?.coordinates;
          if (!c) return null;
          if (Array.isArray(c[0])) return { lng: c[0][0], lat: c[0][1] };
          return { lng: c[0], lat: c[1] };
        };

        const r1 = await fetch("https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/Air_Conditioned_and_Cool_Spaces_v2/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson");
        const d1 = await r1.json();
        const cooling = d1.features.map(f => {
          const coords = getCoords(f);
          return {
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
            name: f.properties.LocationName || f.properties.locationName || f.properties.NAME || 'Cooling Center',
            address: f.properties.address || f.properties.Address || f.properties.ADDRESSLINE1 || '',
            type: 'cooling'
          };
        }).filter(s => s.lat !== null && s.lng !== null);

        const r2 = await fetch("https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/tpl_branch_general_information___4326/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson");
        const d2 = await r2.json();
        const libs = d2.features.map(f => {
          const coords = getCoords(f);
          return {
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
            name: f.properties.BranchName || 'Library',
            address: f.properties.Address || f.properties.address || '',
            type: 'library'
          };
        }).filter(s => s.lat !== null && s.lng !== null);

        setSheltersList([...cooling, ...libs]);
      } catch(e) {}
    }
    loadShelters();
  }, []);

  const triggerTestTemp = async (temp) => {
    setSimulatedTemp(temp);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: temp, source: 'test' })
      });
    } catch {}
  };

  const requestUserLocation = (forceRefresh) => {
      setLocationText('Locating...');

      if (!forceRefresh) {
        const cachedCoords = localStorage.getItem('safespot_coords');
        const cachedLoc = localStorage.getItem('safespot_location');
        const cachedDetail = localStorage.getItem('safespot_location_detail');
        const cachedFull = localStorage.getItem('safespot_location_full');
        if (cachedCoords && cachedLoc) {
          try {
            setUserPos(JSON.parse(cachedCoords));
            setLocationText(cachedLoc);
            setLocationDetail(cachedDetail || cachedLoc);
            setLocationFull(cachedFull || cachedDetail || cachedLoc);
            return;
          } catch(e) {}
        }
      }

      if (!navigator.geolocation) {
        setLocationText('Detect location');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const coords = { lat: latitude, lng: longitude };
          setUserPos(coords);
          localStorage.setItem('safespot_coords', JSON.stringify(coords));
          window.dispatchEvent(new CustomEvent("safespot-gps-updated", { detail: coords }));
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
            .then(res => res.json())
            .then(data => {
              const addr = data.address || {};
              const city = addr.city || addr.town || addr.village || '';
              const province = addr.state || '';
              const postal = addr.postcode || '';
              const road = addr.road || '';
              const houseNo = addr.house_number || '';
              const street = houseNo && road ? `${houseNo} ${road}` : road;
              // Navbar: "Toronto, Ontario"
              const navLabel = city && province ? `${city}, ${province}` : city || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
              // Dashboard card: "Toronto, Ontario M5A 1A1"
              const detailLabel = navLabel + (postal ? ` ${postal}` : '');
              // Modal: "123 Main St, Toronto, Ontario M5A 1A1"
              const fullLabel = street ? `${street}, ${detailLabel}` : detailLabel;
              setLocationText(navLabel);
              setLocationDetail(detailLabel);
              setLocationFull(fullLabel);
              localStorage.setItem('safespot_location', navLabel);
              localStorage.setItem('safespot_location_detail', detailLabel);
              localStorage.setItem('safespot_location_full', fullLabel);
            })
            .catch(() => {
              const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
              setLocationText(fallback);
              setLocationDetail(fallback);
              setLocationFull(fallback);
              localStorage.setItem('safespot_location', fallback);
              localStorage.setItem('safespot_location_detail', fallback);
              localStorage.setItem('safespot_location_full', fallback);
            });
        },
        () => {
          setLocationText('Detect location');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
  };

  const handleFlyToLocation = (e) => {
      if (e) e.stopPropagation();
      if (userPos && mapRef.current) {
          mapRef.current.flyTo([userPos.lat, userPos.lng], 15, { duration: 1.2 });
          const mapArea = document.getElementById('map-area');
          if (mapArea) mapArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
          requestUserLocation(true);
      }
  };

  return (
    <>
      <Script src="https://unpkg.com/lucide@latest" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="beforeInteractive" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <AlertBanner alert={getBannerAlert()} />

      {/* Location Modal */}
      {locationModalOpen && userPos && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
          onClick={() => setLocationModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[520px] overflow-hidden bg-gradient-to-b from-[#1a1a1a]/95 to-[#0a0a0a]/98 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-[0_30px_100px_rgba(0,0,0,0.9)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
            <div className="absolute top-0 -left-1/2 w-[200%] h-32 bg-cyan-500/10 blur-[50px] rounded-[100%] pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <span className="font-semibold text-white tracking-wide text-[15px]">Location Details</span>
              </div>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col gap-6">
              
              {/* Address */}
              <div className="group flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-widest flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                    Physical Address
                  </span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(locationFull || locationDetail || locationText || '')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-white/10"
                    title="Copy address"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
                <span className="text-[18px] md:text-[20px] font-medium text-white/90 leading-snug">
                  {locationFull || locationDetail || locationText || 'Unknown'}
                </span>
              </div>

              {/* Coordinates Box */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between group shadow-inner">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-widest flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    GPS Coordinates
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-[20px] font-mono font-medium text-cyan-400 tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                      {userPos.lat.toFixed(5)}<span className="text-cyan-400/40">,</span>
                    </span>
                    <span className="text-[20px] font-mono font-medium text-cyan-400 tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                      {userPos.lng.toFixed(5)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(`${userPos.lat.toFixed(5)}, ${userPos.lng.toFixed(5)}`)}
                  className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(34,211,238,0.1)]"
                  title="Copy coordinates"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>

              {/* Emergency Banner */}
              <div className="bg-gradient-to-r from-red-500/10 to-transparent border-l-2 border-red-500 rounded-r-lg px-4 py-3.5 flex items-start gap-3 mt-2">
                <div className="text-red-400 mt-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"/></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-red-400 tracking-wide">EMERGENCY PROTOCOL</span>
                  <span className="text-[12px] text-neutral-300 mt-0.5 leading-relaxed font-medium">Call <strong className="text-white">911</strong> and read the blue GPS coordinates aloud to dispatch.</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Removed bottom toast alert to prevent duplicate alerts (top banner is sufficient) */}




      {/*   Floating Download Actions for HTML Version   */}
      <div className="min-h-screen flex flex-col items-center bg-[#000000] w-full text-[#f2f2f2] font-sans selection:bg-neutral-800 overflow-x-clip">
      
      {/*   Navigation   */}
      <header className="w-full sticky top-0 z-50 bg-[#000000]/80 backdrop-blur-md border-b border-white/[0.05]">
        <div className="w-full flex items-center justify-between px-6 py-4 max-w-[1200px] mx-auto">
          <a href="#" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="flex gap-1 items-center justify-center">
              <div className="w-5 h-5 rounded-full border-[3px] border-white relative before:absolute before:inset-0 before:m-auto before:w-2 before:h-2 before:bg-white before:rounded-full mix-blend-screen opacity-90 -ml-1"></div>
            </div>
            <span className="font-semibold text-[17px] tracking-tight">SafeSpot</span>
          </a>

          <div className="flex items-center gap-3">
            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-7 text-[13px] text-neutral-400 font-medium">
              <a href="#story" className="hover:text-white transition-colors">Why SafeSpot</a>
              <a href="#how-it-works-simple" className="hover:text-white transition-colors">How It Works</a>
              <a href="#dashboard" className="hover:text-white transition-colors">Live Map</a>
              <a href="#open-source" className="hover:text-white transition-colors">Open Source</a>
              <a href="#team-sponsors" className="hover:text-white transition-colors">Team</a>
            </nav>

            <div className="hidden md:block w-[1px] h-4 bg-white/20 mx-1"></div>

            {/* Temperature pill — always visible */}
            {(() => {
              const styles = getPillStyles(activeTemp);
              return (
                <a href="#dashboard" className={`${styles.bg} px-3.5 py-1.5 rounded-full hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 text-[13px] font-medium`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${styles.ping} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.dot}`}></span>
                  </span>
                  <span className="font-semibold">{getAlertLevel(activeTemp)}</span>
                  <span className={`${styles.text} font-mono`}>{activeTemp !== null ? activeTemp.toFixed(1) : "--"}°C</span>
                </a>
              );
            })()}

            {/* Detect location — desktop only */}
            <button id="location-pill" onClick={handleFlyToLocation} className="hidden md:flex items-center gap-1.5 text-neutral-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-[13px]">
              <i data-lucide="map-pin" className="w-3 h-3 text-green-400"></i>
              <span id="location-text" className="text-neutral-300 text-[12px]">{locationText}</span>
            </button>

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-[#000000]/95 backdrop-blur-md px-6 py-4 flex flex-col gap-4">
            <nav className="flex flex-col gap-3 text-[15px] text-neutral-400 font-medium">
              {[['#story','Why SafeSpot'],['#how-it-works-simple','How It Works'],['#dashboard','Live Map'],['#open-source','Open Source'],['#team-sponsors','Team']].map(([href, label]) => (
                <a key={href} href={href} onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  const targetId = href.slice(1);
                  const el = targetId === 'dashboard'
                    ? (document.getElementById('map-area') || document.getElementById('map-widget'))
                    : document.getElementById(targetId);
                  if (el) {
                    const navH = document.querySelector('header')?.offsetHeight || 64;
                    if (window.__lenis) {
                      window.__lenis.scrollTo(el, { offset: -(navH + 8), duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
                    } else {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }} className="hover:text-white transition-colors py-1">{label}</a>
              ))}
            </nav>
            <button onClick={() => { requestUserLocation(true); setMobileMenuOpen(false); }} className="self-start flex items-center gap-2 text-[13px] text-neutral-400 bg-white/5 border border-white/10 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-400 shrink-0">
                <circle cx="12" cy="12" r="4"/>
                <path d="M13 4.069V2h-2v2.069A8.01 8.01 0 0 0 4.069 11H2v2h2.069A8.008 8.008 0 0 0 11 19.931V22h2v-2.069A8.007 8.007 0 0 0 19.931 13H22v-2h-2.069A8.008 8.008 0 0 0 13 4.069zM12 18c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"/>
              </svg>
              <span className="text-neutral-300">{userPos ? locationText : 'Detect location'}</span>
            </button>
          </div>
        )}
      </header>

      {/*   Hero Section   */}
      <section id="story" className="w-full relative overflow-hidden scroll-mt-24">
        {/*  Background Gradient Layer  */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,79,2,0.3)_0%,rgba(255,79,2,0)_50%),radial-gradient(circle_at_80%_80%,rgba(0,173,189,0.28)_0%,rgba(0,173,189,0)_50%),linear-gradient(135deg,rgba(0,0,0,0.96)_0%,rgba(255,79,2,0.18)_40%,rgba(0,0,0,0.9)_50%,rgba(0,173,189,0.18)_60%,rgba(0,0,0,0.95)_100%)] [background-position:0%_0%,100%_100%,0%_50%] [background-size:180%_180%,180%_180%,250%_250%] before:absolute before:left-[-5%] before:top-[-20%] before:h-[600px] before:w-[600px] before:rounded-full before:bg-[radial-gradient(circle,rgba(255,79,2,0.25)_0%,transparent_65%)] before:content-[''] before:[filter:blur(4px)] after:absolute after:bottom-[-15%] after:right-[-5%] after:h-[600px] after:w-[600px] after:rounded-full after:bg-[radial-gradient(circle,rgba(0,173,189,0.25)_0%,transparent_65%)] after:content-[''] after:[filter:blur(3px)] motion-safe:animate-[hero-gradient-flow_20s_ease-in-out_infinite] motion-safe:before:animate-[hero-glow-drift_12s_ease-in-out_infinite] motion-safe:after:animate-[hero-glow-drift-reverse_14s_ease-in-out_infinite] will-change-[background-position]"></div>
        
        {/*  Content Container  */}
        <div className="relative z-10 w-full flex flex-col justify-center items-start pt-16 pb-8 md:py-32 px-6 text-left max-w-[1200px] mx-auto border-b border-white/[0.05] min-h-[calc(100vh-76px)]">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-6 font-semibold">Why SafeSpot?</p>
        <h1 className="text-4xl md:text-[56px] font-medium tracking-tight max-w-[900px] leading-[1.15] mb-8 text-white text-left">
          <span className="inline-block opacity-0 animate-[fade-up_0.8s_ease-out_0.2s_forwards]">In 2021, a heat dome killed</span><br/>
          <span className="inline-block opacity-0 animate-[fade-up_0.8s_ease-out_0.4s_forwards]">570 people in British Columbia.</span>
        </h1>
        
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between w-full mt-2 mb-4 md:mt-4 md:mb-16 gap-6 md:gap-0">
          <div className="flex flex-col gap-4 text-left max-w-[600px]">
             <p className="text-lg md:text-xl text-neutral-400 leading-relaxed">
               Many victims lived near cooling centres — but had no way of knowing. If they had received a real-time alert and been guided to the nearest safe space, more lives could have been saved.
             </p>
             <p className="text-lg font-medium text-orange-400 leading-relaxed">
               SafeSpot detects extreme heat in real time and routes you to the nearest cooling centre via GPS.
             </p>
          </div>
          
          <div className="flex flex-col gap-3 shrink-0 md:mb-1">
            <a href="https://www.cbc.ca/news/canada/british-columbia/bc-heat-dome-sudden-deaths-570-1.6122316" target="_blank" className="cite-item opacity-0 translate-y-4 transition-all duration-500 flex items-center gap-3 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 rounded-full pl-3 pr-4 py-2 group">
              <span className="text-xs font-semibold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full w-[60px] text-center">CBC</span>
              <span className="text-neutral-300">B.C. Sudden Deaths (2021)</span>
              <i data-lucide="arrow-up-right" className="w-4 h-4 text-neutral-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"></i>
            </a>
            <a href="https://climateinstitute.ca/reports/extreme-heat-in-canada/" target="_blank" className="cite-item opacity-0 translate-y-4 transition-all duration-500 [transition-delay:150ms] flex items-center gap-3 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 rounded-full pl-3 pr-4 py-2 group">
              <span className="text-xs font-semibold bg-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded-full w-[60px] text-center">Report</span>
              <span className="text-neutral-300">Extreme Heat in Canada (2023)</span>
              <i data-lucide="arrow-up-right" className="w-4 h-4 text-neutral-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"></i>
            </a>
            <a href="https://www.cbc.ca/news/canada/montreal/heat-wave-death-toll-1.4740031" target="_blank" className="cite-item opacity-0 translate-y-4 transition-all duration-500 [transition-delay:300ms] flex items-center gap-3 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 rounded-full pl-3 pr-4 py-2 group">
              <span className="text-xs font-semibold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full w-[60px] text-center">CBC</span>
              <span className="text-neutral-300">Montreal Heat Wave (2018)</span>
              <i data-lucide="arrow-up-right" className="w-4 h-4 text-neutral-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"></i>
            </a>
          </div>
        </div>
        
        </div>
        {/* Fade hero to black */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-b from-transparent to-[#000000] z-[5] pointer-events-none"></div>
      </section>

      {/*   Sponsors & Partners   */}



      {/*  How It Works (Simple Horizontal View - Scrollytelling)  */}
      <section id="how-it-works-simple" className="w-full relative h-auto md:h-[260vh] bg-[#000000]">
        <div className="relative md:sticky top-0 h-auto md:h-screen w-full flex flex-col justify-start pt-28 md:pt-0 md:justify-center overflow-hidden border-b border-white/[0.05]">
          <div className="w-full max-w-[1200px] mx-auto px-6 overflow-y-auto md:overflow-visible pb-10 md:pb-0">
            <div className="mb-6 md:mb-20 shrink-0">
              <p className="text-sm uppercase tracking-widest text-orange-400 mb-3 md:mb-4">How It Works</p>
              <h2 className="text-3xl md:text-[40px] font-medium tracking-tight text-white mb-3 md:mb-4">From Sensor to Safety</h2>
              <p className="text-[15px] text-neutral-400 leading-relaxed">Unlike weather apps that report a city-wide average, SafeSpot measures the <span className="text-orange-400 font-medium">actual temperature where you are</span>.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-8 mb-4 md:mb-16 relative">
              {/*  Item 1  */}
              <div className="hw-scroll-item flex flex-row md:flex-col group opacity-0 transition-[opacity,transform] duration-700 ease-out translate-y-8 pointer-events-none" data-index="0">
                <div className="flex md:items-center h-full w-4 md:w-full mr-4 md:mr-0 mb-0 md:mb-8 relative overflow-visible shrink-0">
                   <div className="hidden md:block w-full h-[1px] bg-white/10 absolute left-0 top-1/2 -translate-y-1/2"></div>
                   <div className="md:hidden w-[1px] h-full bg-white/10 absolute top-0 left-1/2 -translate-x-1/2"></div>
                   <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-orange-400 absolute left-0 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(251,146,60,0.8)] animate-[travel-dot_4s_linear_infinite]"></div>
                   <div className="md:hidden w-1.5 h-1.5 rounded-full bg-orange-400 absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_8px_rgba(251,146,60,0.8)]" style={{ animation: 'travel-dot-vertical 4s linear infinite', animationDelay: '0s' }}></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-orange-400 border-[2px] border-orange-400 z-10 shadow-[0_0_0_4px_#000] group-hover:shadow-[0_0_0_4px_#000,0_0_10px_rgba(251,146,60,0.5)] transition-all relative mt-1 md:mt-0"></div>
                </div>
                <div className="flex flex-col pb-4 md:pb-0">
                  <h3 className="text-[16px] md:text-lg font-semibold text-white group-hover:text-orange-400 transition-colors mb-2">Measure Real Local Heat</h3>
                  <p className="text-[13px] md:text-[15px] text-neutral-400 leading-relaxed md:max-w-[90%]">A Raspberry Pi sensor captures actual ground-level temperature.</p>
                  <div className="mt-3 md:mt-4"><span className="text-[12px] md:text-[13px] px-2.5 py-0.5 rounded-full font-medium bg-orange-900 text-orange-300">Hardware</span></div>
                </div>
              </div>

              {/*  Item 2  */}
              <div className="hw-scroll-item flex flex-row md:flex-col group opacity-0 transition-[opacity,transform] duration-700 ease-out translate-y-8 pointer-events-none" data-index="1">
                <div className="flex md:items-center h-full w-4 md:w-full mr-4 md:mr-0 mb-0 md:mb-8 relative overflow-visible shrink-0">
                   <div className="hidden md:block w-full h-[1px] bg-white/10 absolute left-0 top-1/2 -translate-y-1/2"></div>
                   <div className="md:hidden w-[1px] h-full bg-white/10 absolute top-0 left-1/2 -translate-x-1/2"></div>
                   <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-purple-400 absolute left-0 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(192,132,252,0.8)] animate-[travel-dot_4s_linear_infinite] [animation-delay:1s]"></div>
                   <div className="md:hidden w-1.5 h-1.5 rounded-full bg-purple-400 absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_8px_rgba(192,132,252,0.8)]" style={{ animation: 'travel-dot-vertical 4s linear infinite', animationDelay: '1s' }}></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-purple-400 border-[2px] border-purple-400 z-10 shadow-[0_0_0_4px_#000] group-hover:shadow-[0_0_0_4px_#000,0_0_10px_rgba(192,132,252,0.5)] transition-all relative mt-1 md:mt-0"></div>
                </div>
                <div className="flex flex-col pb-4 md:pb-0">
                  <h3 className="text-[16px] md:text-lg font-semibold text-white group-hover:text-purple-400 transition-colors mb-2">Map Urban Heat Zones</h3>
                  <p className="text-[13px] md:text-[15px] text-neutral-400 leading-relaxed md:max-w-[90%]">ArcGIS data overlays heat island zones on an interactive map.</p>
                  <div className="mt-3 md:mt-4"><span className="text-[12px] md:text-[13px] px-2.5 py-0.5 rounded-full font-medium bg-purple-900 text-purple-300">GIS Data</span></div>
                </div>
              </div>

              {/*  Item 3  */}
              <div className="hw-scroll-item flex flex-row md:flex-col group opacity-0 transition-[opacity,transform] duration-700 ease-out translate-y-8 pointer-events-none" data-index="2">
                <div className="flex md:items-center h-full w-4 md:w-full mr-4 md:mr-0 mb-0 md:mb-8 relative overflow-visible shrink-0">
                   <div className="hidden md:block w-full h-[1px] bg-white/10 absolute left-0 top-1/2 -translate-y-1/2"></div>
                   <div className="md:hidden w-[1px] h-full bg-white/10 absolute top-0 left-1/2 -translate-x-1/2"></div>
                   <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-red-400 absolute left-0 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(248,113,113,0.8)] animate-[travel-dot_4s_linear_infinite] [animation-delay:2s]"></div>
                   <div className="md:hidden w-1.5 h-1.5 rounded-full bg-red-400 absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_8px_rgba(248,113,113,0.8)]" style={{ animation: 'travel-dot-vertical 4s linear infinite', animationDelay: '2s' }}></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-red-400 border-[2px] border-red-400 z-10 shadow-[0_0_0_4px_#000] group-hover:shadow-[0_0_0_4px_#000,0_0_10px_rgba(248,113,113,0.5)] transition-all relative mt-1 md:mt-0"></div>
                </div>
                <div className="flex flex-col pb-4 md:pb-0">
                  <h3 className="text-[16px] md:text-lg font-semibold text-white group-hover:text-red-400 transition-colors mb-2">Trigger Danger Alerts</h3>
                  <p className="text-[13px] md:text-[15px] text-neutral-400 leading-relaxed md:max-w-[90%]">Alert trigger when heat and location reach extreme risk.</p>
                  <div className="mt-3 md:mt-4"><span className="text-[12px] md:text-[13px] px-2.5 py-0.5 rounded-full font-medium bg-red-900 text-red-300">Alert System</span></div>
                </div>
              </div>

              {/*  Item 4  */}
              <div className="hw-scroll-item flex flex-row md:flex-col group opacity-0 transition-[opacity,transform] duration-700 ease-out translate-y-8 pointer-events-none" data-index="3">
                <div className="flex md:items-center h-full w-4 md:w-full mr-4 md:mr-0 mb-0 md:mb-8 relative overflow-visible shrink-0">
                   <div className="hidden md:block w-full h-[1px] bg-gradient-to-r from-white/10 to-transparent absolute left-0 top-1/2 -translate-y-1/2"></div>
                   <div className="md:hidden w-[1px] h-full bg-gradient-to-b from-white/10 to-transparent absolute top-0 left-1/2 -translate-x-1/2"></div>
                   <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-green-400 absolute left-0 top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-[travel-dot_4s_linear_infinite] [animation-delay:3s]"></div>
                   <div className="md:hidden w-1.5 h-1.5 rounded-full bg-green-400 absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_8px_rgba(74,222,128,0.8)]" style={{ animation: 'travel-dot-vertical 4s linear infinite', animationDelay: '3s' }}></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-green-400 border-[2px] border-green-400 z-10 shadow-[0_0_0_4px_#000] group-hover:shadow-[0_0_0_4px_#000,0_0_10px_rgba(74,222,128,0.5)] transition-all relative mt-1 md:mt-0"></div>
                </div>
                <div className="flex flex-col pb-4 md:pb-0">
                  <h3 className="text-[16px] md:text-lg font-semibold text-white group-hover:text-green-400 transition-colors mb-2">Route to Safety</h3>
                  <p className="text-[13px] md:text-[15px] text-neutral-400 leading-relaxed md:max-w-[90%]">Instantly calculates your nearest cooling centre via Maps.</p>
                  <div className="mt-3 md:mt-4"><span className="text-[12px] md:text-[13px] px-2.5 py-0.5 rounded-full font-medium bg-green-900 text-green-300">Routing</span></div>
                </div>
              </div>
            </div>
          </div>
          {/* View Details button — separated below items, absolute on desktop */}
          <div className="w-full max-w-[1200px] mx-auto px-6 mt-6 md:absolute md:bottom-10 md:left-0 md:right-0">
            <button id="view-details-btn" onClick={() => {document.getElementById('how-it-works-simple').classList.add('hidden'); document.getElementById('how-it-works-detailed').classList.remove('hidden'); window.__lenis?.start(); setTimeout(() => document.getElementById('how-it-works-detailed').scrollIntoView({ behavior: 'smooth' }), 50);}} className="flex items-center gap-2 text-[15px] font-medium text-neutral-400 hover:text-white transition-[opacity,color] duration-300 group px-4 py-2 rounded-lg opacity-0 pointer-events-none">
              <span>View all details</span> <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>

      {/*  How It Works Section (Detailed Vertical Style)  */}
      <section id="how-it-works-detailed" className="hidden w-full max-w-[1200px] mx-auto py-32 px-6 border-b border-white/[0.05]">
        <div className="mb-20">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4">How It Works</p>
          <h2 className="text-4xl md:text-[40px] font-medium tracking-tight text-white mb-4">From Sensor to Safety</h2>
          <p className="text-[15px] text-neutral-400 leading-relaxed">Unlike weather apps that report a city-wide average, SafeSpot measures the <span className="text-orange-400 font-medium">actual temperature where you are</span>.</p>
        </div>

        <div className="relative w-full pl-6 md:pl-8 mt-12">
          {/*  Continuous left line  */}
          <div className="absolute left-0 top-2 bottom-0 w-[1px] bg-white/10"></div>
          
          <div className="flex flex-col gap-14 md:gap-16">
            
            {/*  Item 1  */}
            <div className="relative group cursor-pointer block">
              {/*  Indicator Dot  */}
              <div className="absolute -left-[30px] md:-left-[38px] top-1.5 w-2.5 h-2.5 rounded-full bg-orange-400 border-[2px] border-orange-400 transition-all shadow-[0_0_0_3px_#000] group-hover:shadow-[0_0_0_3px_#000,0_0_10px_rgba(251,146,60,0.5)]"></div>
              
              <div className="flex flex-col gap-2">
                <h3 className="text-lg md:text-[20px] font-medium text-white group-hover:text-orange-400 transition-colors">Measure Real Local Heat</h3>
                <p className="text-[15px] text-neutral-400 leading-relaxed max-w-[760px] mt-1">A custom hardware Raspberry Pi temperature sensor is deployed directly in high-risk heat zones. Instead of relying on generalized city-wide weather reports, our sensor sends hyper-local, real-time data to a FastAPI backend at regular intervals. This live reading is instantly rendered on the map, capturing the true ground-level climate reality.</p>
                <div className="mt-4 mb-6"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-900 text-orange-300">Hardware</span></div>
                
                <figure className="relative w-full max-w-[760px] rounded-[16px] border border-white/10 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-900 mt-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500 z-10 pointer-events-none"></div>
                  <img alt="Hardware Sensor" src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80" className="w-full h-[280px] md:h-[360px] object-cover opacity-60 group-hover:opacity-90 transition-all duration-700 scale-100 group-hover:scale-[1.02]" loading="lazy" />
                </figure>
              </div>
            </div>

            {/*  Item 2  */}
            <div className="relative group cursor-pointer block">
              <div className="absolute -left-[30px] md:-left-[38px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-400 border-[2px] border-purple-400 transition-all shadow-[0_0_0_3px_#000] group-hover:shadow-[0_0_0_3px_#000,0_0_10px_rgba(192,132,252,0.5)]"></div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg md:text-[20px] font-medium text-white group-hover:text-purple-400 transition-colors">Map Urban Heat Zones</h3>
                <p className="text-[15px] text-neutral-400 leading-relaxed max-w-[760px] mt-1">We integrate live ArcGIS REST API data to display Toronto's 'Impervious Surface and Urban Heat Island Effect' layer directly on an interactive Leaflet map. This creates colour-coded zones—from yellow to deep red—clearly distinguishing high, medium, and low heat risk areas so you can instantly see which neighbourhoods are most vulnerable.</p>
                <div className="mt-4 mb-6"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-900 text-purple-300">GIS Data</span></div>
                
                <figure className="relative w-full max-w-[760px] rounded-[16px] border border-white/10 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-900 mt-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500 z-10 pointer-events-none"></div>
                  <img alt="Map Data" src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80" className="w-full h-[280px] md:h-[360px] object-cover opacity-60 group-hover:opacity-90 transition-all duration-700 scale-100 group-hover:scale-[1.02]" loading="lazy" />
                </figure>
              </div>
            </div>

            {/*  Item 3  */}
            <div className="relative group cursor-pointer block">
              <div className="absolute -left-[30px] md:-left-[38px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border-[2px] border-cyan-400 transition-all shadow-[0_0_0_3px_#000] group-hover:shadow-[0_0_0_3px_#000,0_0_10px_rgba(34,211,238,0.5)]"></div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg md:text-[20px] font-medium text-white group-hover:text-cyan-400 transition-colors">Find You</h3>
                <p className="text-[15px] text-neutral-400 leading-relaxed max-w-[760px] mt-1">Using secure browser APIs, SafeSpot pinpoints your exact geographic coordinates in real time. By quickly detecting your position, the application establishes your precise location as the critical starting point for all subsequent safety and routing calculations.</p>
                <div className="mt-4 mb-6"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-900 text-cyan-300">GPS</span></div>
                
                <figure className="relative w-full max-w-[760px] rounded-[16px] border border-white/10 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-900 mt-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500 z-10 pointer-events-none"></div>
                  <img alt="Location Tracking" src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80" className="w-full h-[280px] md:h-[360px] object-cover opacity-60 group-hover:opacity-90 transition-all duration-700 scale-100 group-hover:scale-[1.02]" loading="lazy" />
                </figure>
              </div>
            </div>

            {/*  Item 4  */}
            <div className="relative group cursor-pointer block">
              <div className="absolute -left-[30px] md:-left-[38px] top-1.5 w-2.5 h-2.5 rounded-full bg-pink-400 border-[2px] border-pink-400 transition-all shadow-[0_0_0_3px_#000] group-hover:shadow-[0_0_0_3px_#000,0_0_10px_rgba(244,114,182,0.5)]"></div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg md:text-[20px] font-medium text-white group-hover:text-pink-400 transition-colors">Cross-Check Your Risk</h3>
                <p className="text-[15px] text-neutral-400 leading-relaxed max-w-[760px] mt-1">Your live GPS coordinates are dynamically cross-referenced against the ArcGIS urban heat island layers. Because experiencing extreme temperatures inside a known heat island is exponentially more dangerous, SafeSpot combines these two data points—hardware sensor readings and geospatial risk zoning—to accurately calculate your individualized risk level.</p>
                <div className="mt-4 mb-6"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-pink-900 text-pink-300">Risk Engine</span></div>
                
                <figure className="relative w-full max-w-[760px] rounded-[16px] border border-white/10 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-900 mt-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500 z-10 pointer-events-none"></div>
                  <img alt="Data Dashboard" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80" className="w-full h-[280px] md:h-[360px] object-cover opacity-60 group-hover:opacity-90 transition-all duration-700 scale-100 group-hover:scale-[1.02]" loading="lazy" />
                </figure>
              </div>
            </div>

            {/*  Item 5  */}
            <div className="relative group cursor-pointer block">
              <div className="absolute -left-[30px] md:-left-[38px] top-1.5 w-2.5 h-2.5 rounded-full bg-red-400 border-[2px] border-red-400 transition-all shadow-[0_0_0_3px_#000] group-hover:shadow-[0_0_0_3px_#000,0_0_10px_rgba(248,113,113,0.5)]"></div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg md:text-[20px] font-medium text-white group-hover:text-red-400 transition-colors">Trigger a Danger Alert</h3>
                <p className="text-[15px] text-neutral-400 leading-relaxed max-w-[760px] mt-1">When our Raspberry Pi sensor detects that the local temperature has exceeded the critical 35°C threshold, the app automatically triggers an 'Extreme Heat Warning'. A prominent alert banner fires, displaying your current temperature and risk level, immediately prompting you to find a cool space.</p>
                <div className="mt-4 mb-6"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-900 text-red-300">Alert System</span></div>
                
                <figure className="relative w-full max-w-[760px] rounded-[16px] border border-white/10 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-900 mt-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500 z-10 pointer-events-none"></div>
                  <img alt="Alert System" src="https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=1600&q=80" className="w-full h-[280px] md:h-[360px] object-cover opacity-60 group-hover:opacity-90 transition-all duration-700 scale-100 group-hover:scale-[1.02]" loading="lazy" />
                </figure>
              </div>
            </div>

            {/*  Item 6  */}
            <div className="relative group cursor-pointer block">
              <div className="absolute -left-[30px] md:-left-[38px] top-1.5 w-2.5 h-2.5 rounded-full bg-green-400 border-[2px] border-green-400 transition-all shadow-[0_0_0_3px_#000] group-hover:shadow-[0_0_0_3px_#000,0_0_10px_rgba(74,222,128,0.5)]"></div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg md:text-[20px] font-medium text-white group-hover:text-green-400 transition-colors">Route You to Safety</h3>
                <p className="text-[15px] text-neutral-400 leading-relaxed max-w-[760px] mt-1">Once a danger alert is triggered, the system automatically calculates the distance to the closest City of Toronto cooling centre or library branch. It highlights these safe spaces on your map and displays actionable information, such as "Nearest Cooling Centre: [Name], 0.3 km away", providing you with an immediate, life-saving route to safety.</p>
                <div className="mt-4 mb-6"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-900 text-green-300">Routing</span></div>
                
                <figure className="relative w-full max-w-[760px] rounded-[16px] border border-white/10 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] bg-zinc-900 mt-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-black/20 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors duration-500 z-10 pointer-events-none"></div>
                  <img alt="Routing to Safety" src="../images/routing_map.png" className="w-full h-[280px] md:h-[360px] object-cover opacity-60 group-hover:opacity-90 transition-all duration-700 scale-100 group-hover:scale-[1.02]" loading="lazy" />
                </figure>
              </div>
            </div>

          </div>
        </div>

        <div className="mt-20 flex justify-start">
          <button onClick={() => {document.getElementById('how-it-works-detailed').classList.add('hidden'); document.getElementById('how-it-works-simple').classList.remove('hidden'); setTimeout(() => document.getElementById('how-it-works-simple').scrollIntoView({ behavior: 'smooth' }), 50);}} className="inline-flex items-center gap-2 text-[15px] font-medium text-neutral-400 hover:text-white transition-colors group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> <span>Show less</span>
          </button>
        </div>
      </section>

      <section id="dashboard" className="w-full max-w-[1200px] mx-auto py-16 px-6 border-b border-white/[0.05] scroll-mt-16">
        <div className="mb-16">
          <p className="text-sm uppercase tracking-widest text-orange-400 mb-4 font-semibold">Live Map</p>
          <h2 className="text-3xl md:text-[40px] font-medium tracking-tight text-white mb-4">Interactive Heat Dashboard</h2>
          <p className="text-[15px] md:text-[16px] text-neutral-400 max-w-[800px] leading-relaxed">
            Experience our live integration. We combine real-time hardware sensor readings with ArcGIS mapping to highlight extreme urban heat zones and safely route users to cooling centres.
          </p>
        </div>
        {/*   Main App Mockup Image   */}
        {/*   Main App Mockup HTML   */}
        <div id="map-widget" className="w-full min-h-[760px] rounded-[16px] border border-white/10 bg-[#0a0a0a] overflow-hidden relative z-10 shadow-[0_40px_100px_rgba(255,255,255,0.03)] flex flex-col md:flex-row ring-1 ring-white/5">
           
           {/*   Left Sidebar: Data Cards   */}
           <div className="w-full md:w-[280px] border-r border-white/5 bg-[#111111]/90 backdrop-blur-xl flex flex-col z-20 shrink-0">
              {/*  Header  */}
              <div className="h-16 border-b border-white/5 flex items-center px-6 justify-between gap-4 w-full relative overflow-hidden">
                 <div className="flex items-center gap-3 shrink-0">
                   <div className="flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/20 text-orange-400 shrink-0">
                     <i data-lucide="activity" className="w-4 h-4"></i>
                   </div>
                   <span className="text-white font-medium text-[14px] whitespace-nowrap">Live Dashboard</span>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   {/* Animated Waveform replacing the 'Live' text */}
                   <div className="w-[80px] h-5 relative overflow-hidden flex items-center opacity-80" style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
                     <style>{`
                       @keyframes slideWave {
                         0% { transform: translateX(0); }
                         100% { transform: translateX(-120px); }
                       }
                     `}</style>
                     <svg width="200%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute left-0 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" style={{ animation: 'slideWave 1.5s linear infinite' }}>
                       <defs>
                         <pattern id="waveformMoving" x="0" y="0" width="120" height="20" patternUnits="userSpaceOnUse">
                           <path d="M0 10h30l5-8 10 16 5-8h70" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                         </pattern>
                       </defs>
                       <rect x="0" y="0" width="100%" height="100%" fill="url(#waveformMoving)" />
                     </svg>
                   </div>
                 </div>
              </div>

              {/*  Cards Container  */}
              <div className="flex-1 p-6 flex flex-col gap-6">
                 
                 {/*  Sensor & Weather Grid  */}
                 <div className="flex flex-col gap-4">
                   {/*  Sensor Card  */}
                   <div className="bg-gradient-to-br from-[#1a1311] to-white/[0.02] border border-orange-500/20 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-orange-500/40 transition-colors">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                       <i data-lucide="cpu" className="w-16 h-16 text-orange-500"></i>
                     </div>
                     <div className="text-[12px] font-medium text-neutral-400 mb-1 flex items-center gap-2">
                       <i data-lucide="thermometer" className="w-3.5 h-3.5 text-orange-400"></i> Local Humidex
                     </div>
                     <div className="text-3xl font-semibold text-white tracking-tight mt-1">{activeHumidex !== null ? activeHumidex.toFixed(1) : "--"}<span className="text-lg text-neutral-500 font-normal ml-0.5">°C</span></div>
                     <div className="mt-4 flex items-center gap-2 text-[12px]">
                       <span className={`px-2 py-0.5 rounded flex items-center gap-1 font-medium ${activeTemp === null || activeTemp >= 40 ? "bg-red-500/20 text-red-400" : activeTemp >= 35 ? "bg-orange-500/20 text-orange-400" : activeTemp >= 30 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}><i data-lucide={activeTemp === null || activeTemp >= 35 ? "alert-triangle" : "check-circle"} className="w-3 h-3"></i> {getAlertLevel(activeTemp)}</span>
                       <span className="text-neutral-500">Raspberry Pi</span>
                     </div>
                   </div>

                   {/*  Weather Card  */}
                   <div className="bg-gradient-to-br from-[#11151a] to-white/[0.02] border border-blue-500/10 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                       <i data-lucide="cloud-sun" className="w-16 h-16 text-blue-400"></i>
                     </div>
                     <div className="text-[12px] font-medium text-neutral-400 mb-1 flex items-center gap-2">
                       <i data-lucide="map-pin" className="w-3.5 h-3.5 text-blue-400"></i> City Weather
                     </div>
                     <div className="text-3xl font-semibold text-white tracking-tight mt-1">{weatherTemp !== null ? weatherTemp.toFixed(1) : "--"}<span className="text-lg text-neutral-500 font-normal ml-0.5">°C</span></div>
                     <div className="mt-4 flex items-center gap-2 text-[12px]">
                       <span className="text-neutral-300 font-medium" style={{textTransform:"capitalize"}}>{weatherLoc ? weatherLoc : "Toronto"}</span>
                       <span className="text-neutral-600 px-1">•</span>
                       <span className="text-neutral-500" style={{textTransform:"capitalize"}}>{weatherDesc ? weatherDesc : "--"}</span>
                     </div>
                   </div>
                 </div>

                 <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                  {/*  Your Location Bar  */}
                  <div
                    className={`bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 flex items-start justify-between gap-2 transition-all duration-300 ${userPos ? 'cursor-pointer location-card-hover' : ''}`}
                    onClick={() => userPos && setLocationModalOpen(true)}
                  >
                    <div className="flex flex-col min-w-0 gap-1">
                      <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
                        📍 Your Location
                      </span>
                      {userPos ? (
                        <>
                          <span className="text-[12px] text-cyan-400 font-semibold truncate">
                            {locationDetail || locationText || 'Locating...'}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 tracking-tight">
                            {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[12px] text-neutral-500">--, --</span>
                      )}
                    </div>
                    <button
                      onClick={handleFlyToLocation}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-cyan-400 transition-colors shrink-0 mt-0.5"
                      title="Detect Location"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="4"/>
                        <path d="M13 4.069V2h-2v2.069A8.01 8.01 0 0 0 4.069 11H2v2h2.069A8.008 8.008 0 0 0 11 19.931V22h2v-2.069A8.007 8.007 0 0 0 19.931 13H22v-2h-2.069A8.008 8.008 0 0 0 13 4.069zM12 18c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"/>
                      </svg>
                    </button>
                  </div>

                  {/*  Nearest Cooling Centre Card — desktop sidebar only; mobile shows below map  */}
                  <div
                    className={`hidden md:flex flex-col gap-1 border rounded-xl p-3 cursor-pointer transition-all ${selectedShelterType === 'cooling' ? 'bg-[#141824]/80 border-blue-400/60 ring-1 ring-blue-400/30' : 'bg-[#141824]/40 border-blue-500/20 hover:border-blue-400/40'}`}
                    onClick={() => userPos && nearestCooling && setSelectedShelterType('cooling')}
                  >
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between gap-1">
                      <span>❄️ Nearest Cooling</span>
                      {selectedShelterType === 'cooling' && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">Selected</span>}
                    </div>
                    {userPos && nearestCooling ? (
                      <>
                        <div className="text-[13px] font-semibold text-white truncate mt-1" title={nearestCooling.name}>{nearestCooling.name}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{nearestCooling.address || 'Address not listed'}</div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-400">{nearestCooling.distance.toFixed(2)} km</span>
                            {selectedShelterType === 'cooling' && (
                              <span className="flex items-center gap-0.5 text-cyan-400">
                                <span style={{ transform: `rotate(${getBearing(userPos.lat, userPos.lng, nearestCooling.lat, nearestCooling.lng)}deg)`, display: 'inline-block' }}>↑</span>
                                {bearingToCompass(getBearing(userPos.lat, userPos.lng, nearestCooling.lat, nearestCooling.lng))}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${nearestCooling.lat},${nearestCooling.lng}`, "_blank"); }}
                            className="text-blue-400 hover:text-blue-200 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-400/15 hover:shadow-[0_0_10px_rgba(96,165,250,0.5)] transition-all duration-200"
                          >
                            
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>
                              Directions
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-[11px] text-neutral-500 mt-0.5">Detect location to calculate</div>
                    )}
                  </div>

                  {/*  Nearest Library Card — desktop sidebar only  */}
                  <div
                    className={`hidden md:flex flex-col gap-1 border rounded-xl p-3 cursor-pointer transition-all ${selectedShelterType === 'library' ? 'bg-[#121c17]/80 border-green-400/60 ring-1 ring-green-400/30' : 'bg-[#121c17]/40 border-green-500/20 hover:border-green-400/40'}`}
                    onClick={() => userPos && nearestLibrary && setSelectedShelterType('library')}
                  >
                    <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center justify-between gap-1">
                      <span>📚 Nearest Library</span>
                      {selectedShelterType === 'library' && <span className="text-[9px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">Selected</span>}
                    </div>
                    {userPos && nearestLibrary ? (
                      <>
                        <div className="text-[13px] font-semibold text-white truncate mt-1" title={nearestLibrary.name}>{nearestLibrary.name}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{nearestLibrary.address || 'Address not listed'}</div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-400">{nearestLibrary.distance.toFixed(2)} km</span>
                            {selectedShelterType === 'library' && (
                              <span className="flex items-center gap-0.5 text-cyan-400">
                                <span style={{ transform: `rotate(${getBearing(userPos.lat, userPos.lng, nearestLibrary.lat, nearestLibrary.lng)}deg)`, display: 'inline-block' }}>↑</span>
                                {bearingToCompass(getBearing(userPos.lat, userPos.lng, nearestLibrary.lat, nearestLibrary.lng))}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${nearestLibrary.lat},${nearestLibrary.lng}`, "_blank"); }}
                            className="text-green-400 hover:text-green-200 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-green-400/15 hover:shadow-[0_0_10px_rgba(74,222,128,0.5)] transition-all duration-200"
                          >
                            
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>
                              Directions
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-[11px] text-neutral-500 mt-0.5">Detect location to calculate</div>
                    )}
                  </div>

                  {/* ── Sensor Log button — desktop sidebar ── */}
                  <button
                    type="button"
                    onClick={() => setLogOpen(true)}
                    className="hidden md:flex flex-col gap-1 border rounded-xl p-3 cursor-pointer transition-all bg-[#0d1a1f]/40 border-cyan-500/20 hover:border-cyan-400/40 text-left w-full"
                  >
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      Sensor Log
                    </div>
                    <div className="text-[11px] text-neutral-500">View readings & alerts</div>
                  </button>

              </div>
           </div>
           
           {/*   Right Area: Map Visualization   */}
           <div id="map-area" className="flex-1 min-h-[420px] relative bg-[#050505] overflow-hidden flex flex-col">
              {/*  Actual Map Container  */}
              <div id="map" className="absolute inset-0 z-0"></div>
              {/* 🧪 Test buttons */}
              <div
                className="absolute top-4 left-4 z-[1000] flex items-center pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                {/* Test Controls Group */}
                <div className="flex bg-[#111]/85 backdrop-blur-md border border-white/10 rounded-lg p-1 gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)] items-center h-[34px]">
                  <div className="px-2 text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center border-r border-white/10 mr-1 h-full">Test</div>
                  <button type="button" onClick={() => triggerTestTemp(30)} className="text-[11px] px-2.5 py-1 rounded-md bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-400 font-medium transition-colors">30°C</button>
                  <button type="button" onClick={() => triggerTestTemp(36)} className="text-[11px] px-2.5 py-1 rounded-md bg-orange-500/15 hover:bg-orange-500/30 text-orange-400 font-medium transition-colors">36°C</button>
                  <button type="button" onClick={() => triggerTestTemp(41)} className="text-[11px] px-2.5 py-1 rounded-md bg-red-500/15 hover:bg-red-500/30 text-red-400 font-medium transition-colors">41°C</button>
                  <div className="w-px h-3.5 bg-white/10 self-center mx-1"></div>
                  <button type="button" onClick={() => { setSimulatedTemp(null); setSensorTemp(20.0); if (fetchSensorRef.current) fetchSensorRef.current(); }} className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/15 text-neutral-300 font-medium transition-colors">Reset</button>
                </div>
              </div>

              {/* 🌍 Zone & Direction info (Bottom-Left on Mobile, Top-Left on Desktop) */}
              <div
                className="absolute bottom-6 left-4 md:bottom-auto md:top-4 md:left-[300px] z-[1000] flex flex-row items-center gap-2 pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >

                {/* Heat zone level indicator */}
                {userPos && currentZone && (
                  <div className="bg-[#111]/85 backdrop-blur-md border border-white/10 rounded-lg px-3 flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.5)] h-[34px]">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Zone</span>
                    <span className={`text-[11px] font-bold uppercase ${currentZone === 'high' ? 'text-red-400' : currentZone === 'medium' ? 'text-orange-400' : 'text-yellow-400'}`}>
                      {currentZone}
                    </span>
                    <span className="text-[12px]">{currentZone === 'high' ? '🔴' : currentZone === 'medium' ? '🟠' : '🟡'}</span>
                  </div>
                )}

                {/* Direction arrow synced with selected shelter */}
                {(() => {
                  const sel = selectedShelterType === 'cooling' ? nearestCooling : selectedShelterType === 'library' ? nearestLibrary : null;
                  if (!userPos || !sel) return null;
                  const bearing = getBearing(userPos.lat, userPos.lng, sel.lat, sel.lng);
                  return (
                    <div className="bg-[#111]/85 backdrop-blur-md border border-white/10 rounded-lg px-3 flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.5)] h-[34px]">
                      <span style={{ transform: `rotate(${bearing}deg)`, display: 'inline-block', lineHeight: 1 }} className="text-[14px]">↑</span>
                      <span className="text-[11px] font-bold text-cyan-400 tracking-wider">{bearingToCompass(bearing)}</span>
                      <span className="text-neutral-600 mx-0.5 text-[10px]">•</span>
                      <span className="text-[11px] text-neutral-300">{sel.type === 'cooling' ? '❄️ Cooling' : '📚 Library'}</span>
                      <span className="text-[11px] font-medium text-white ml-1">{sel.distance.toFixed(2)} km</span>
                    </div>
                  );
                })()}
              </div>

              {/* 🗺️ Horizontal Map Legend Floating Overlay — desktop only */}
              <div className="hidden md:flex absolute bottom-3 left-3 z-[1000] bg-[#111]/85 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 items-center gap-4 text-[11px] text-neutral-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col border-r border-white/10 pr-2">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Heat Island</span>
                  <span className="text-[9px] text-neutral-600">Historically hot zones</span>
                </div>

                {/* Heat island intensity levels */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-[#dc2626]/85 border border-red-500/50 shrink-0"></div>
                    <span>Extreme</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-[#f97316]/65 border border-orange-500/50 shrink-0"></div>
                    <span>Moderate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-[#facc15]/45 border border-yellow-500/50 shrink-0"></div>
                    <span>Mild</span>
                  </div>
                </div>

                <div className="h-3 w-px bg-white/10"></div>

                {/* Symbols */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#111] border border-blue-500/30 flex items-center justify-center text-blue-400 text-[8px] shrink-0">❄️</div>
                    <span>Cooling</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[8px] shrink-0">📚</div>
                    <span>Library</span>
                  </div>
                </div>
              </div>
           </div>

           {/* Mobile-only shelter cards: below map */}
           <div className="md:hidden border-t border-white/5 bg-[#111111]/90 p-4 flex flex-col gap-3">
             {/* Cooling */}
             <div
               className={`border rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all ${selectedShelterType === 'cooling' ? 'bg-[#141824]/80 border-blue-400/60 ring-1 ring-blue-400/30' : 'bg-[#141824]/40 border-blue-500/20'}`}
               onClick={() => userPos && nearestCooling && setSelectedShelterType('cooling')}
             >
               <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between gap-1">
                 <span>❄️ Nearest Cooling Centre</span>
                 {selectedShelterType === 'cooling' && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">Selected</span>}
               </div>
               {userPos && nearestCooling ? (
                 <>
                   <div className="text-[13px] font-semibold text-white truncate mt-1">{nearestCooling.name}</div>
                   <div className="flex items-center justify-between mt-1 text-[11px]">
                     <div className="flex items-center gap-2">
                       <span className="font-semibold text-blue-400">{nearestCooling.distance.toFixed(2)} km</span>
                       {selectedShelterType === 'cooling' && (
                         <span className="flex items-center gap-0.5 text-cyan-400">
                           <span style={{ transform: `rotate(${getBearing(userPos.lat, userPos.lng, nearestCooling.lat, nearestCooling.lng)}deg)`, display: 'inline-block' }}>↑</span>
                           {bearingToCompass(getBearing(userPos.lat, userPos.lng, nearestCooling.lat, nearestCooling.lng))}
                         </span>
                       )}
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${nearestCooling.lat},${nearestCooling.lng}`, "_blank"); }} className="text-blue-400 hover:text-blue-200 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-400/15 hover:shadow-[0_0_10px_rgba(96,165,250,0.5)] transition-all duration-200">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                              Directions</button>
                   </div>
                 </>
               ) : <div className="text-[11px] text-neutral-500 mt-0.5">Detect location to calculate</div>}
             </div>
             {/* Library */}
             <div
               className={`border rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all ${selectedShelterType === 'library' ? 'bg-[#121c17]/80 border-green-400/60 ring-1 ring-green-400/30' : 'bg-[#121c17]/40 border-green-500/20'}`}
               onClick={() => userPos && nearestLibrary && setSelectedShelterType('library')}
             >
               <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center justify-between gap-1">
                 <span>📚 Nearest Library</span>
                 {selectedShelterType === 'library' && <span className="text-[9px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full">Selected</span>}
               </div>
               {userPos && nearestLibrary ? (
                 <>
                   <div className="text-[13px] font-semibold text-white truncate mt-1">{nearestLibrary.name}</div>
                   <div className="flex items-center justify-between mt-1 text-[11px]">
                     <div className="flex items-center gap-2">
                       <span className="font-semibold text-green-400">{nearestLibrary.distance.toFixed(2)} km</span>
                       {selectedShelterType === 'library' && (
                         <span className="flex items-center gap-0.5 text-cyan-400">
                           <span style={{ transform: `rotate(${getBearing(userPos.lat, userPos.lng, nearestLibrary.lat, nearestLibrary.lng)}deg)`, display: 'inline-block' }}>↑</span>
                           {bearingToCompass(getBearing(userPos.lat, userPos.lng, nearestLibrary.lat, nearestLibrary.lng))}
                         </span>
                       )}
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${nearestLibrary.lat},${nearestLibrary.lng}`, "_blank"); }} className="text-green-400 hover:text-green-200 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-green-400/15 hover:shadow-[0_0_10px_rgba(74,222,128,0.5)] transition-all duration-200">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                              Directions</button>
                   </div>
                 </>
               ) : <div className="text-[11px] text-neutral-500 mt-0.5">Detect location to calculate</div>}
             </div>
             {/* Sensor Log button — mobile only */}
             <button
               type="button"
               onClick={() => setLogOpen(true)}
               className="flex flex-col gap-1 border rounded-xl p-3 cursor-pointer transition-all bg-[#0d1a1f]/40 border-cyan-500/20 hover:border-cyan-400/40 text-left w-full"
             >
               <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                 <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                 Sensor Log
               </div>
               <div className="text-[11px] text-neutral-500">View readings & alerts</div>
             </button>
           </div>
        </div>
      </section>


      {/* ── Log modal ── */}
      <LogViewer isOpen={logOpen} onClose={() => setLogOpen(false)} />

      {/*  GitHub Integration  */}
      <section id="open-source" className="w-full relative py-32 border-b border-white/[0.05] scroll-mt-24 overflow-hidden">
        
        {/*  Video Background with Mask  */}
        <div className="absolute inset-0 w-full h-full z-0 flex justify-center items-center pointer-events-none">
          <video autoPlay loop muted playsInline disablePictureInPicture disableRemotePlayback className="min-w-full min-h-full object-cover">
            <source src="https://static.linear.app/assets/hero/INTAKE-v4.output.h264.crf18.mp4" type="video/mp4" />
          </video>
          {/*  Gradient Masks to softly darken the background for readability  */}
          <div className="absolute inset-0 bg-[#000000]/10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#000000] via-transparent to-[#000000]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-[#000000]"></div>
        </div>

        {/*  Content Container  */}
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-[40px] font-medium tracking-tight text-white mb-6 drop-shadow-lg">Open Source & Ready</h2>
            <p className="text-[17px] text-neutral-300 leading-relaxed mb-8 drop-shadow-md font-medium">
              Explore the complete SafeSpot architecture. From Raspberry Pi sensor scripts to the FastAPI backend and Next.js frontend—everything is available for review and contribution.
            </p>
            <a href="https://github.com/codexperts2024/SafeSpot_codeXperts" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white bg-black/40 hover:bg-black/60 border border-white/20 px-6 py-3 rounded-full text-sm font-medium transition-colors backdrop-blur-md shadow-lg">
              <i data-lucide="github" className="w-4 h-4"></i>
              View on GitHub
              <span className="text-neutral-400 ml-1">→</span>
            </a>
          </div>
          <div className="flex-1 w-full relative">
            <div className="spotlight-card relative w-full max-w-[500px] ml-auto rounded-xl border border-white/10 bg-[#0d0d0d]/70 backdrop-blur-xl shadow-[0_0_50px_rgba(255,255,255,0.05)] overflow-hidden group">
              <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-10 mix-blend-screen" style={{"background":"radial-gradient(400px circle at var(--x, 0) var(--y, 0), rgba(255,255,255,0.08), transparent 40%)"}}></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div className="relative z-20 h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-white/[0.02]">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                <div className="ml-2 text-[11px] text-neutral-500 font-mono tracking-wider">main.py</div>
              </div>
              <div className="p-6 text-[13px] font-mono leading-relaxed text-neutral-300 overflow-x-auto whitespace-pre">
<div className="flex"><span className="text-neutral-600 mr-4 select-none">1</span><span className="text-pink-400">@app</span><span className="text-white">.post(</span><span className="text-green-400">"/api/sensor-data"</span><span className="text-white">)</span></div>
<div className="flex"><span className="text-neutral-600 mr-4 select-none">2</span><span className="text-purple-400">async def</span> <span className="text-blue-400">receive_data</span><span className="text-white">(data: SensorData):</span></div>
<div className="flex bg-white/[0.04] -mx-6 px-6 border-l-2 border-green-400"><span className="text-neutral-600 mr-4 select-none">3</span><span>    </span><span className="text-pink-400">if</span> <span className="text-white">data.temperature &gt; </span><span className="text-orange-400">35.0</span><span className="text-white">:</span></div>
<div className="flex bg-white/[0.04] -mx-6 px-6 border-l-2 border-green-400"><span className="text-neutral-600 mr-4 select-none">4</span><span>        </span><span className="text-blue-400">trigger_alert</span><span className="text-white">(</span><span className="text-green-400">"Extreme Heat Warning"</span><span className="text-white">)</span></div>
<div className="flex"><span className="text-neutral-600 mr-4 select-none">5</span><span>    </span><span className="text-purple-400">return</span> <span className="text-white">{"{"}</span><span className="text-green-400">"status"</span><span className="text-white">: </span><span className="text-green-400">"success"</span><span className="text-white">{"}"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*  The Team Section  */}
      <div id="team-sponsors"></div>
      <section id="team" className="w-full max-w-[1200px] mx-auto py-20 px-6 border-b border-white/[0.05] scroll-mt-16">
        <div className="text-center mb-20">
          <p className="text-sm uppercase tracking-widest text-purple-400 mb-4">Behind SafeSpot</p>
          <h2 className="text-3xl md:text-[40px] font-medium tracking-tight text-white mb-4">Meet the codeXperts</h2>
          <p className="text-[17px] text-neutral-400">The engineers and designers behind the project.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 lg:gap-14 max-w-[1200px] mx-auto">
           {/*  Gary  */}
           <a href="https://github.com/GarySkywalker-droid" className="flex flex-col items-center group w-[140px] cursor-pointer">
              <div className="spotlight-card w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 mb-5 group-hover:border-white/40 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 relative">
                 <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-20 mix-blend-screen" style={{"background":"radial-gradient(200px circle at var(--x, 0) var(--y, 0), rgba(255,255,255,0.15), transparent 40%)"}}></div>
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none"></div>
                 <img src="../images/team/gary.jpg" alt="Gary" className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              </div>
              <div className="font-medium text-white text-[16px] mb-1">Gary</div>
              <div className="text-neutral-500 text-[13px] text-center uppercase tracking-wide">Hardware</div>
           </a>
           
           {/*  Marcos  */}
           <a href="https://github.com/markeenmelo" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group w-[140px] cursor-pointer">
              <div className="spotlight-card w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 mb-5 group-hover:border-white/40 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 relative">
                 <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-20 mix-blend-screen" style={{"background":"radial-gradient(200px circle at var(--x, 0) var(--y, 0), rgba(255,255,255,0.15), transparent 40%)"}}></div>
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none"></div>
                 <img src="../images/team/marcos.png" alt="Marcos" className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              </div>
              <div className="font-medium text-white text-[16px] mb-1">Marcos</div>
              <div className="text-neutral-500 text-[13px] text-center uppercase tracking-wide">Backend</div>
           </a>
           
           {/*  Paul  */}
           <a href="https://github.com/minsikpaul92" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group w-[140px] cursor-pointer">
              <div className="spotlight-card w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 mb-5 group-hover:border-white/40 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 relative">
                 <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-20 mix-blend-screen" style={{"background":"radial-gradient(200px circle at var(--x, 0) var(--y, 0), rgba(255,255,255,0.15), transparent 40%)"}}></div>
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none"></div>
                 <img src="../images/team/paul.jpg" alt="Paul" className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              </div>
              <div className="font-medium text-white text-[16px] mb-1">Paul</div>
              <div className="text-neutral-500 text-[13px] text-center uppercase tracking-wide">Frontend</div>
           </a>
           
           {/*  Seulgi  */}
           <a href="https://github.com/seulgi-dev" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group w-[140px] cursor-pointer">
              <div className="spotlight-card w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 mb-5 group-hover:border-white/40 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 relative">
                 <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-20 mix-blend-screen" style={{"background":"radial-gradient(200px circle at var(--x, 0) var(--y, 0), rgba(255,255,255,0.15), transparent 40%)"}}></div>
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none"></div>
                 <img src="../images/team/seulgi.jpg" alt="Seulgi" className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              </div>
              <div className="font-medium text-white text-[16px] mb-1">Seulgi</div>
              <div className="text-neutral-500 text-[13px] text-center uppercase tracking-wide">UI/UX</div>
           </a>
           
           {/*  Arun  */}
           <a href="https://github.com/arunrajea" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group w-[140px] cursor-pointer">
              <div className="spotlight-card w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 mb-5 group-hover:border-white/40 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-500 relative">
                 <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-20 mix-blend-screen" style={{"background":"radial-gradient(200px circle at var(--x, 0) var(--y, 0), rgba(255,255,255,0.15), transparent 40%)"}}></div>
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none"></div>
                 <img src="../images/team/arun.jpg" alt="Arun" className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              </div>
              <div className="font-medium text-white text-[16px] mb-1">Arun</div>
              <div className="text-neutral-500 text-[13px] text-center uppercase tracking-wide">GPS & Routing</div>
           </a>
        </div>
      </section>

      <section id="sponsors" className="w-full max-w-[1200px] mx-auto py-16 overflow-hidden relative border-t border-white/[0.05]">
        <div className="text-center mb-10">
           <p className="text-sm uppercase tracking-widest text-neutral-500 font-semibold">Our Partners</p>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
.leaflet-scroll::-webkit-scrollbar {
  width: 4px;
}
.leaflet-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.leaflet-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
.leaflet-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            display: flex;
            width: max-content;
            animation: marquee 30s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
          .sponsor-logo {
            height: 100px;
            max-width: 280px;
            object-fit: contain;
            transition: all 0.3s ease;
          }
          .sponsor-logo:hover {
            transform: scale(1.05);
          }
          .sponsor-logo.ssf-large {
            transform: scale(1.6);
          }
          .sponsor-logo.ssf-large:hover {
            transform: scale(1.65);
          }
        `}} />

        <div className="relative w-full flex overflow-hidden">
          {/*  Fade masks  */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>
          
          <div className="animate-marquee gap-16 items-center px-8">
            {/*  Set 1  */}
            <a href="https://www.alectra.com" target="_blank" rel="noopener noreferrer"><img src="../logo/Alectra.png" alt="Alectra" className="sponsor-logo" /></a>
            <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer"><img src="../logo/ESRI.png" alt="Esri" className="sponsor-logo" style={{"filter":"brightness(0) invert(1)"}} /></a>
            <a href="https://ssfinc.ca" target="_blank" rel="noopener noreferrer"><img src="../logo/SSF.png" alt="SSF" className="sponsor-logo ssf-large" /></a>
            <a href="https://learnatocto.com" target="_blank" rel="noopener noreferrer"><img src="../logo/Octo.png" alt="Octo" className="sponsor-logo" /></a>
            <a href="https://www.torontotechweek.com" target="_blank" rel="noopener noreferrer"><img src="../logo/TTW.png" alt="TorontoTechWeek" className="sponsor-logo" /></a>
            <a href="https://www.comunitycanada.ca" target="_blank" rel="noopener noreferrer"><img src="../logo/ComUnity.jpeg" alt="ComUnity" className="sponsor-logo" /></a>
            <a href="https://gdg.community.dev" target="_blank" rel="noopener noreferrer"><img src="../logo/GDG.png" alt="GDG" className="sponsor-logo" style={{"height":"80px","objectFit":"cover","objectPosition":"center"}} /></a>
            {/*  Duplicate for infinite scroll  */}
            <a href="https://www.alectra.com" target="_blank" rel="noopener noreferrer"><img src="../logo/Alectra.png" alt="Alectra" className="sponsor-logo" /></a>
            <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer"><img src="../logo/ESRI.png" alt="Esri" className="sponsor-logo" style={{"filter":"brightness(0) invert(1)"}} /></a>
            <a href="https://ssfinc.ca" target="_blank" rel="noopener noreferrer"><img src="../logo/SSF.png" alt="SSF" className="sponsor-logo ssf-large" /></a>
            <a href="https://learnatocto.com" target="_blank" rel="noopener noreferrer"><img src="../logo/Octo.png" alt="Octo" className="sponsor-logo" /></a>
            <a href="https://www.torontotechweek.com" target="_blank" rel="noopener noreferrer"><img src="../logo/TTW.png" alt="TorontoTechWeek" className="sponsor-logo" /></a>
            <a href="https://www.comunitycanada.ca" target="_blank" rel="noopener noreferrer"><img src="../logo/ComUnity.jpeg" alt="ComUnity" className="sponsor-logo" /></a>
            <a href="https://gdg.community.dev" target="_blank" rel="noopener noreferrer"><img src="../logo/GDG.png" alt="GDG" className="sponsor-logo" style={{"height":"80px","objectFit":"cover","objectPosition":"center"}} /></a>
          </div>
        </div>
      </section>

      {/*   Footer   */}
      <footer className="w-full border-t border-white/[0.05] bg-[#000000] pt-16 pb-12 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <div className="w-5 h-5 rounded-full border-[3px] border-white relative before:absolute before:inset-0 before:m-auto before:w-2 before:h-2 before:bg-white before:rounded-full mix-blend-screen opacity-90 -ml-1"></div>
              <span className="text-white font-medium text-lg tracking-tight">SafeSpot Toronto</span>
            </div>
            <p className="text-neutral-500 text-[14px]">Real-time heat risk mapping & cooling centre routing</p>
          </div>
          
          <div className="text-neutral-500 text-[13px] md:text-right flex flex-col gap-1.5">
             <p className="text-white/70">Built for Seneca Polytechnic Hackathon 2026</p>
             <p>Theme 3: Community Energy, Equity and Sustainability</p>
          </div>
          
        </div>
      </footer>
    </div>
  

  {/*  Floating Back to Top Button  */}
  <button id="backToTop" className="fixed bottom-8 right-8 z-[100] p-4 bg-white/15 hover:bg-white/25 border border-white/20 rounded-full text-white backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] translate-y-4" aria-label="Back to top">
    <i data-lucide="arrow-up" className="w-6 h-6"></i>
  </button>


    </>
  );
}

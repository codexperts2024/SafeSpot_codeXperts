const fs = require('fs');
let c = fs.readFileSync('app/page.js', 'utf8');

// 1. Relocate test buttons from right-2 to left-2
c = c.replace(
  'className="absolute top-2 right-2 z-[1000] flex flex-col gap-1"',
  'className="absolute top-2 left-2 z-[1000] flex flex-col gap-1"'
);

// 2. Add cached location parsing to requestUserLocation
const oldCacheBlock = `      if (!forceRefresh) {
        const cached = localStorage.getItem('safespot_location');
        if (cached) {
          setLocationText(cached);
          return;
        }
      }`;

const newCacheBlock = `      if (!forceRefresh) {
        const cached = localStorage.getItem('safespot_location');
        if (cached) {
          setLocationText(cached);
          const parts = cached.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              setUserPos({ lat, lng });
            }
          }
          return;
        }
      }`;

c = c.replace(oldCacheBlock, newCacheBlock);

// 3. Update map initiation to check cache
const oldMapInit = `      if(document.getElementById('map') && typeof L !== 'undefined') {
        const map = L.map('map', { zoomControl: false }).setView([43.7, -79.42], 11);
        mapRef.current = map;`;

const newMapInit = `      if(document.getElementById('map') && typeof L !== 'undefined') {
        const cached = localStorage.getItem('safespot_location');
        let initialLat = 43.7, initialLng = -79.42;
        if (cached) {
            const parts = cached.split(',');
            if (parts.length === 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    initialLat = lat;
                    initialLng = lng;
                }
            }
        }

        const map = L.map('map', { zoomControl: false }).setView([initialLat, initialLng], 14);
        mapRef.current = map;`;

c = c.replace(oldMapInit, newMapInit);

// 4. Update markers & window listener inside vanilla Leaflet setup
const oldUserMarker = `        const userIcon = L.divIcon({
            html: \`<div class="relative flex items-center justify-center w-6 h-6"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60"></span><div class="w-3.5 h-3.5 bg-green-500 rounded-full border-[2px] border-black shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div></div>\`,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        L.marker([43.7, -79.42], {icon: userIcon}).addTo(map).bindTooltip("<b>You are here</b>", {direction: 'top', offset: [0, -10]});

        // Add "Go to My Location" Control
        const MyLocationControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function (map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = \`<button style="background-color: #161616; border: none; color: #fff; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#262626'" onmouseout="this.style.background='#161616'" title="Go to My Location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
                </button>\`;
                container.style.border = "1px solid rgba(255,255,255,0.1)";
                container.style.overflow = "hidden";
                container.style.borderRadius = "4px";
                
                // Prevent click events from propagating to the map
                L.DomEvent.disableClickPropagation(container);
                
                container.onclick = function(e){
                    e.preventDefault();
                    map.flyTo([43.7, -79.42], 14, { duration: 1.2 });
                };
                return container;
            }
        });
        map.addControl(new MyLocationControl());`;

const newUserMarker = `        const userIcon = L.divIcon({
            html: \`<div class="relative flex items-center justify-center w-6 h-6"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60"></span><div class="w-3.5 h-3.5 bg-green-500 rounded-full border-[2px] border-black shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div></div>\`,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        const userMarker = L.marker([initialLat, initialLng], {icon: userIcon}).addTo(map).bindTooltip("<b>You are here</b>", {direction: 'top', offset: [0, -10]});

        window.addEventListener('safespot-gps-updated', (e) => {
            const { lat, lng } = e.detail;
            userMarker.setLatLng([lat, lng]);
            map.flyTo([lat, lng], 14, { duration: 1.2 });
        });

        // Add "Go to My Location" Control
        const MyLocationControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function (map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.innerHTML = \`<button style="background-color: #161616; border: none; color: #fff; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#262626'" onmouseout="this.style.background='#161616'" title="Go to My Location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
                </button>\`;
                container.style.border = "1px solid rgba(255,255,255,0.1)";
                container.style.overflow = "hidden";
                container.style.borderRadius = "4px";
                
                // Prevent click events from propagating to the map
                L.DomEvent.disableClickPropagation(container);
                
                container.onclick = function(e){
                    e.preventDefault();
                    const latlng = userMarker.getLatLng();
                    map.flyTo([latlng.lat, latlng.lng], 14, { duration: 1.2 });
                };
                return container;
            }
        });
        map.addControl(new MyLocationControl());`;

c = c.replace(oldUserMarker, newUserMarker);

// 5. Update userPos state hook inside requestUserLocation coordinates dispatch
c = c.replace(
  'setUserPos({ lat: latitude, lng: longitude });',
  'setUserPos({ lat: latitude, lng: longitude });\n          window.dispatchEvent(new CustomEvent("safespot-gps-updated", { detail: { lat: latitude, lng: longitude } }));'
);

fs.writeFileSync('app/page.js', c);
console.log("Map positioning and controls fixes successfully applied!");

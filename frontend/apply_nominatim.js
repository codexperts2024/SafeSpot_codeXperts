const fs = require('fs');
let c = fs.readFileSync('app/page.js', 'utf8');

// 1. Rewrite requestUserLocation to fetch Nominatim and separate localStorage keys
const oldRequestLocationBlock = `  const requestUserLocation = (forceRefresh) => {
      setLocationText('Locating...');

      if (!forceRefresh) {
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
      }

      if (!navigator.geolocation) {
        setLocationText('Detect location');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserPos({ lat: latitude, lng: longitude });
          window.dispatchEvent(new CustomEvent("safespot-gps-updated", { detail: { lat: latitude, lng: longitude } }));
          const label = \`\${latitude.toFixed(5)}, \${longitude.toFixed(5)}\`;
              setLocationText(label);
              localStorage.setItem('safespot_location', label);
        },
        () => {
          setLocationText('Detect location');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
  };`;

const newRequestLocationBlock = `  const requestUserLocation = (forceRefresh) => {
      setLocationText('Locating...');

      if (!forceRefresh) {
        const cachedCoords = localStorage.getItem('safespot_coords');
        const cachedLoc = localStorage.getItem('safespot_location');
        if (cachedCoords && cachedLoc) {
          try {
            setUserPos(JSON.parse(cachedCoords));
            setLocationText(cachedLoc);
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
          
          fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${latitude}&lon=\${longitude}&zoom=10&addressdetails=1\`)
            .then(res => res.json())
            .then(data => {
              const address = data.address || {};
              const city = address.city || address.town || address.village || address.suburb || '';
              const state = address.state || '';
              const label = city && state ? \`\${city}, \${state}\` : \`\${latitude.toFixed(5)}, \${longitude.toFixed(5)}\`;
              setLocationText(label);
              localStorage.setItem('safespot_location', label);
            })
            .catch(() => {
              const label = \`\${latitude.toFixed(5)}, \${longitude.toFixed(5)}\`;
              setLocationText(label);
              localStorage.setItem('safespot_location', label);
            });
        },
        () => {
          setLocationText('Detect location');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
  };`;

c = c.replace(oldRequestLocationBlock, newRequestLocationBlock);

// 2. Update Map Initialization to read safespot_coords
const oldMapCachedBlock = `        const cached = localStorage.getItem('safespot_location');
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
        }`;

const newMapCachedBlock = `        const cached = localStorage.getItem('safespot_coords');
        let initialLat = 43.7, initialLng = -79.42;
        if (cached) {
            try {
                const coords = JSON.parse(cached);
                if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
                    initialLat = coords.lat;
                    initialLng = coords.lng;
                }
            } catch(e) {}
        }`;

c = c.replace(oldMapCachedBlock, newMapCachedBlock);

fs.writeFileSync('app/page.js', c);
console.log("Nominatim reverse geocoding integration successfully completed.");

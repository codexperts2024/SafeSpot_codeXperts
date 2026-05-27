const fs = require('fs');
let content = fs.readFileSync('app/page.js', 'utf8');

// 1. Add state variables below `const [locationText...`
const stateInjection = `
  const [sensorTemp, setSensorTemp] = useState(null);
  const [weatherTemp, setWeatherTemp] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [sheltersList, setSheltersList] = useState([]);
  const [nearestShelter, setNearestShelter] = useState(null);

  // Poll Sensor Data
  useEffect(() => {
    async function fetchSensor() {
      try {
        const res = await fetch(\`\${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/sensor-latest\`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.temperature != null) setSensorTemp(data.temperature);
      } catch {}
    }
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
        const URL = \`https://api.openweathermap.org/data/2.5/weather?q=Toronto,CA&appid=\${key}&units=metric\`;
        const res = await fetch(URL);
        const data = await res.json();
        if (data.main?.temp != null) setWeatherTemp(data.main.temp);
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
    withDist.sort((a, b) => a.distance - b.distance);
    setNearestShelter(withDist[0]);
  }, [userPos, sheltersList]);
`;

content = content.replace("const [locationText, setLocationText] = useState('Toronto, ON');", "const [locationText, setLocationText] = useState('Toronto, ON');\n" + stateInjection);

// 2. Add setUserPos
content = content.replace(
  "const { latitude, longitude } = pos.coords;",
  "const { latitude, longitude } = pos.coords;\n          setUserPos({ lat: latitude, lng: longitude });"
);

// 3. Inject shelter extracting logic
const shelterFetchInjection = `
  useEffect(() => {
    async function loadShelters() {
      try {
        const r1 = await fetch("https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/Air_Conditioned_and_Cool_Spaces_v2/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson");
        const d1 = await r1.json();
        const cooling = d1.features.map(f => ({
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          name: f.properties.LocationName || 'Cooling Center',
          type: 'cooling'
        }));
        const r2 = await fetch("https://services6.arcgis.com/gEBDQzUF4BVGW25i/arcgis/rest/services/tpl_branch_general_information___4326/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson");
        const d2 = await r2.json();
        const libs = d2.features.map(f => ({
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          name: f.properties.BranchName || 'Library',
          type: 'library'
        }));
        setSheltersList([...cooling, ...libs]);
      } catch(e) {}
    }
    loadShelters();
  }, []);
`;
content = content.replace("const requestUserLocation = (forceRefresh)", shelterFetchInjection + "\n  const requestUserLocation = (forceRefresh)");

// 4. Update the UI markup
content = content.replace(
  '<span className="text-red-300/80 font-mono">36.5°C</span>',
  '<span className="text-red-300/80 font-mono">{sensorTemp !== null ? sensorTemp.toFixed(1) : "36.5"}°C</span>'
);

content = content.replace(
  '<div className="text-3xl font-semibold text-white tracking-tight mt-1">36.5<span className="text-lg text-neutral-500 font-normal ml-0.5">°C</span></div>',
  '<div className="text-3xl font-semibold text-white tracking-tight mt-1">{sensorTemp !== null ? sensorTemp.toFixed(1) : "36.5"}<span className="text-lg text-neutral-500 font-normal ml-0.5">°C</span></div>'
);

content = content.replace(
  '<div className="text-3xl font-semibold text-white tracking-tight mt-1">34.0<span className="text-lg text-neutral-500 font-normal ml-0.5">°C</span></div>',
  '<div className="text-3xl font-semibold text-white tracking-tight mt-1">{weatherTemp !== null ? weatherTemp.toFixed(1) : "34.0"}<span className="text-lg text-neutral-500 font-normal ml-0.5">°C</span></div>'
);

content = content.replace(
  /Central Library/g,
  '{nearestShelter ? nearestShelter.name : "Central Library"}'
);

content = content.replace(
  '<i data-lucide="navigation" className="w-3.5 h-3.5 text-blue-400"></i> 0.8 km away',
  '<i data-lucide="navigation" className="w-3.5 h-3.5 text-blue-400"></i> {nearestShelter ? nearestShelter.distance.toFixed(1) : "0.8"} km away'
);

content = content.replace(
  '<button className="w-full py-2.5 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(255,255,255,0.1)]">',
  '<button onClick={() => { if(nearestShelter && userPos) window.open(\`https://www.google.com/maps/dir/?api=1&origin=\${userPos.lat},\${userPos.lng}&destination=\${nearestShelter.lat},\${nearestShelter.lng}\`, "_blank"); else alert("Please detect your location first (click the map pin icon at the top right)."); }} className="w-full py-2.5 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(255,255,255,0.1)]">'
);

fs.writeFileSync('app/page.js', content);
console.log("Successfully injected dynamic logic.");

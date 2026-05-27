const fs = require('fs');
let c = fs.readFileSync('app/page.js', 'utf8');

// 1. Add new state variables
c = c.replace(
  'const [weatherTemp, setWeatherTemp] = useState(null);',
  'const [weatherTemp, setWeatherTemp] = useState(null);\n  const [weatherDesc, setWeatherDesc] = useState(null);\n  const [weatherLoc, setWeatherLoc] = useState(null);\n  const mapRef = useRef(null);'
);
// Also need to import useRef if not imported
if (!c.includes('useRef')) {
  c = c.replace('import { useEffect, useState } from', 'import { useEffect, useState, useRef } from');
}

// 2. Weather Fetch update
c = c.replace(
  /if \(data\.main\?\.temp != null\) setWeatherTemp\(data\.main\.temp\);/g,
  'if (data.main?.temp != null) { setWeatherTemp(data.main.temp); setWeatherDesc(data.weather?.[0]?.description || ""); setWeatherLoc(data.name || ""); }'
);

// 3. Location Text updates
c = c.replace(/useState\('Toronto, ON'\)/g, "useState('Detect location')");
c = c.replace(/setLocationText\('Toronto, ON'\)/g, "setLocationText('Detect location')");

// 4. Reverse Geocoding removal - just use coords
const geoCodeBlockRegex = /fetch\(`https:\/\/nominatim\.openstreetmap\.org\/reverse\?format=json&lat=\${latitude}&lon=\${longitude}&zoom=10&addressdetails=1`\)[\s\S]*?\.catch\(\(\) => \{([\s\S]*?)\}\);/m;
const geoReplacement = `const label = \`\${latitude.toFixed(5)}, \${longitude.toFixed(5)}\`;
              setLocationText(label);
              localStorage.setItem('safespot_location', label);`;
c = c.replace(geoCodeBlockRegex, geoReplacement);

// 5. Alert Status replacements
// Helper function for alert level
const alertHelper = `function getAlertLevel(temp) {
  if (temp === null) return "Extreme";
  if (temp >= 35) return "Extreme";
  if (temp >= 30) return "Caution";
  return "Safe";
}`;

if(!c.includes('function getAlertLevel')) {
  c = c.replace('export default function Home() {', alertHelper + '\n\nexport default function Home() {');
}

c = c.replace(
  /<span className="font-semibold">Extreme<\/span>/g,
  '<span className="font-semibold">{getAlertLevel(sensorTemp)}</span>'
);
c = c.replace(
  /<span className="bg-red-500\/20 text-red-400 px-2 py-0.5 rounded flex items-center gap-1 font-medium"><i data-lucide="alert-triangle" className="w-3 h-3"><\/i> Extreme<\/span>/g,
  '<span className={`px-2 py-0.5 rounded flex items-center gap-1 font-medium ${sensorTemp === null || sensorTemp >= 35 ? "bg-red-500/20 text-red-400" : sensorTemp >= 30 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}><i data-lucide={sensorTemp === null || sensorTemp >= 35 ? "alert-triangle" : "check-circle"} className="w-3 h-3"></i> {getAlertLevel(sensorTemp)}</span>'
);

// 6. Weather Card hardcoded text replacements
c = c.replace(
  /<span className="text-neutral-300 font-medium">Vancouver, BC<\/span>/g,
  '<span className="text-neutral-300 font-medium" style={{textTransform:"capitalize"}}>{weatherLoc ? weatherLoc : "Toronto"}</span>'
);
c = c.replace(
  /<span className="text-neutral-500">Sunny<\/span>/g,
  '<span className="text-neutral-500" style={{textTransform:"capitalize"}}>{weatherDesc ? weatherDesc : "--"}</span>'
);

// 7. Map centering logic
c = c.replace(
  "const map = L.map('map', { zoomControl: false }).setView([43.7, -79.42], 14);",
  "const map = L.map('map', { zoomControl: false }).setView([43.7, -79.42], 11);\n        mapRef.current = map;"
);

// Add useEffect for userPos map updating
const mapPosUpdate = `
  useEffect(() => {
    if (mapRef.current && userPos) {
      mapRef.current.setView([userPos.lat, userPos.lng], 14);
      // Optional: Add a marker for user
      if (typeof L !== 'undefined') {
        L.marker([userPos.lat, userPos.lng]).addTo(mapRef.current)
          .bindPopup("You are here").openPopup();
      }
    }
  }, [userPos]);
`;
c = c.replace("return () => clearInterval(interval);\n  }, []);", "return () => clearInterval(interval);\n  }, []);\n" + mapPosUpdate);

fs.writeFileSync('app/page.js', c);
console.log("Applied user fixes!");

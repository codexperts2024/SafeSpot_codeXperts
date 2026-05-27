const fs = require('fs');

let html = fs.readFileSync('./public/html/index.html', 'utf8');

// 1. Extract Head scripts and styles
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  let styles = styleMatch[1];
  let globals = fs.readFileSync('./app/globals.css', 'utf8');
  if (!globals.includes('hero-gradient-flow')) {
    fs.writeFileSync('./app/globals.css', globals + '\n' + styles);
  }
}

// Extract script
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>[\s\S]*?<\/body>/);
let scripts = '';
if (scriptMatch) {
    scripts = scriptMatch[1];
}

// Remove doctype, html, head, body tags
html = html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '');
html = html.replace(/<script>[\s\S]*?<\/script>/g, '');
html = html.replace(/<\/body>[\s\S]*?<\/html>/, '');

// Self close tags
html = html.replace(/<img([^>]*[^/])>/g, '<img$1 />');
html = html.replace(/<br>/g, '<br />');
html = html.replace(/<hr([^>]*[^/])>/g, '<hr$1 />');
html = html.replace(/<input([^>]*[^/])>/g, '<input$1 />');

// Attributes
html = html.replace(/class=/g, 'className=');
html = html.replace(/for=/g, 'htmlFor=');
html = html.replace(/onclick="([^"]+)"/g, 'onClick={() => {$1}}');

// Convert inline styles
// e.g. style="opacity:1;" -> style={{opacity: '1'}}
html = html.replace(/style="([^"]+)"/g, (match, p1) => {
    const styleObj = {};
    p1.split(';').forEach(rule => {
        if (!rule.trim()) return;
        const [key, value] = rule.split(':');
        if (key && value) {
            const camelKey = key.trim().replace(/-([a-z])/g, (m, p1) => p1.toUpperCase());
            styleObj[camelKey] = value.trim();
        }
    });
    return `style={${JSON.stringify(styleObj)}}`;
});

// Fix some specific Next.js/React things
// replace comments
html = html.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');


const jsx = `
'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function Home() {
  const [locationText, setLocationText] = useState('Toronto, ON');

  useEffect(() => {
    // Lucide icons
    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }

${scripts}

  }, []);

  const requestUserLocation = (forceRefresh) => {
      setLocationText('Locating...');

      if (!forceRefresh) {
        const cached = localStorage.getItem('safespot_location');
        if (cached) {
          setLocationText(cached);
          return;
        }
      }

      if (!navigator.geolocation) {
        setLocationText('Toronto, ON');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${latitude}&lon=\${longitude}&zoom=10&addressdetails=1\`)
            .then(r => r.json())
            .then(data => {
              const addr = data.address || {};
              const city = addr.city || addr.town || addr.village || addr.county || 'Unknown';
              const state = addr.state_code || addr.state || '';
              const label = state ? \`\${city}, \${state.toUpperCase().slice(0,2)}\` : city;
              setLocationText(label);
              localStorage.setItem('safespot_location', label);
            })
            .catch(() => {
              const label = \`\${latitude.toFixed(2)}, \${longitude.toFixed(2)}\`;
              setLocationText(label);
              localStorage.setItem('safespot_location', label);
            });
        },
        () => {
          setLocationText('Toronto, ON');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
  };

  useEffect(() => {
    requestUserLocation(false);
  }, []);

  return (
    <>
      <Script src="https://unpkg.com/lucide@latest" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="beforeInteractive" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      ${html.replace(/<span id="location-text"[^>]*>.*?<\/span>/, '<span id="location-text" className="text-neutral-300 text-[12px]">{locationText}</span>').replace(/onClick=\{\(\) => \{requestUserLocation\((.*?)\)\}\}/, 'onClick={() => requestUserLocation($1)}')}
    </>
  );
}
`;

fs.writeFileSync('./app/page.js', jsx);
console.log('Conversion done.');

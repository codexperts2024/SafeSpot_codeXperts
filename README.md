
# 🌡️ SafeSpot Toronto

> **Seneca Polytechnic Hackathon 2026**
> Theme 3 — Community Energy, Equity and Sustainability | Problem Statement 2

A real-time web app that helps Toronto communities stay safe during extreme heat events — combining live Raspberry Pi sensor data, urban heat island mapping, GPS-based routing, and cross-checked risk alerts.

**Live Demo:** [https://safe-spot-seneca-hackathon.vercel.app](https://safe-spot-seneca-hackathon.vercel.app)

<img width="800" height="496" alt="ScreenRecording2026-05-26at10 54 55PM-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/61e139aa-5ca2-4739-b6bf-bbd86bcee525" />

---

## 🧩 The Problem

In June 2021, a heat dome killed [570 people in British Columbia](https://www.cbc.ca/news/canada/british-columbia/bc-heat-dome-sudden-deaths-570-1.6122316). Many victims lived near cooling centres — but had no way of knowing. Climate impacts like heatwaves disproportionately affect vulnerable populations, and there's no simple way to see where climate risk and limited shelter access overlap.

---

## 💡 Our Solution

SafeSpot Toronto deploys a **Raspberry Pi temperature sensor in a high-risk heat island zone**, cross-checks live sensor readings against urban heat island data, and guides users to the nearest safe space when conditions become dangerous.

Unlike weather apps that report a city-wide average, SafeSpot measures the **actual temperature where you are**.

---

## 👥 Team codeXperts

| Name       | Role                                             |
| ---------- | ------------------------------------------------ |
| **Gary**   | Hardware — Raspberry Pi & Temperature Sensor     |
| **Marcos** | Backend — Node.js (Hono + Drizzle + PostgreSQL)  |
| **Paul**   | Frontend — Next.js, Leaflet.js Map Integration   |
| **Seulgi** | Frontend — UI/UX Design, Alert System            |
| **Arun**   | Frontend — GPS Location, Nearest Shelter Routing |

---

## ⚙️ Tech Stack

| Layer        | Technology                                       |
| ------------ | ------------------------------------------------ |
| Frontend     | Next.js 16, React 19, Tailwind CSS v4, Leaflet.js |
| Backend      | Hono.js (Node.js) + Drizzle ORM + PostgreSQL     |
| Deployment   | Vercel (frontend) · Render (backend)             |
| Hardware     | Raspberry Pi + Temperature/Humidity Sensor       |
| Map Library  | Leaflet.js with CartoDB Dark Matter tiles        |
| Data Sources | ArcGIS REST API, City of Toronto Open Data       |

---

## ✨ Core Features

### 🍓 1. Real-Time Hardware Temperature

- Raspberry Pi sensor **physically deployed in a heat island zone**
- Captures actual ground-level temperature — not a city-wide average
- Sensor readings POSTed to Hono backend at regular intervals
- Frontend polls `GET /api/sensors` every 5 seconds (near real-time)
- Source badge: distinguishes live sensor data (`sensor`) from test overrides (`test`)
- Smart storage: danger/extreme readings stored immediately; caution throttled to 1 min; safe throttled to 5 min

### 🗺️ 2. Urban Heat Island Map

- Interactive Leaflet map with Toronto's urban heat island layer
- Colour-coded risk areas: 🔴 High (≥30°C surface) / 🟠 Medium (≥25°C) / 🟡 Low
- Data from ArcGIS: *Impervious Surface and Urban Heat Island Effect in Toronto*
- Historical surface temperature averages (not real-time — this is where the Pi matters)

### 🔬 3. Heat Island Cross-Check

- User's GPS location is checked against heat island GeoJSON polygons using **ray-casting point-in-polygon** (no external dependencies)
- Combined risk from zone + sensor temperature:

  | Sensor Temp | Risk Level            |
  | ----------- | --------------------- |
  | < 30°C      | Safe (no alert)       |
  | 30–35°C     | ⚠️ Caution             |
  | 35–40°C     | 🚨 Danger              |
  | ≥ 40°C      | 🔴 Extreme             |

- Alert fires only at **caution or above** — no false warnings on safe-temperature days

### 🌤️ 4. City Weather Card

- Displays Toronto's current temperature from OpenWeather API (`data.main.temp`)
- Refreshes every 60 minutes
- Shows city name and weather description alongside actual temperature

### 🚨 5. Danger Threshold Alerts

- Full-screen alert banner when sensor reads **35°C or above**
- Web Audio API siren sound:
  - Extreme (≥40°C): fast wailing siren (600→1400 Hz, 2s)
  - Danger (35–40°C): slow wailing siren (500→1100 Hz, 1.6s)
  - Caution (30–35°C): morse-style beep pattern (880 Hz sine)
- Browser push notifications on alert level change

### 📍 6. Nearest Safe Space Routing

- Browser GPS detects the user's current location (cached to localStorage)
- Haversine formula calculates distance to all cooling centres and libraries
- Shows nearest cooling centre + nearest library with compass direction (N, NE, E…)
- **Google Maps directions** link with one tap

---

## 🔌 API Endpoints

| Method | Endpoint           | Description                                           |
| ------ | ------------------ | ----------------------------------------------------- |
| `GET`  | `/health`          | Health check — returns `{ "status": "ok" }`           |
| `POST` | `/api/sensors`     | Receive temperature reading from Raspberry Pi         |
| `GET`  | `/api/sensors`     | Return latest sensor reading with alert level         |
| `GET`  | `/api/alerts`      | List alert logs (filterable by level, zone, date)     |
| `GET`  | `/api/logs/alerts` | Alias for `/api/alerts`                               |
| `GET`  | `/docs`            | Swagger UI (OpenAPI 3.1)                              |
| `GET`  | `/openapi.json`    | OpenAPI spec                                          |

### POST /api/sensors — Request Body

```json
{
  "temperature": 36.2,
  "humidity": 65,
  "source": "sensor",
  "lat": 43.7,
  "lng": -79.42,
  "zone": "high"
}
```

### GET /api/sensors — Response

```json
{
  "temperature": 36.2,
  "humidity": 65,
  "humidex": 38.5,
  "timestamp": "2026-05-30T15:23:42.123Z",
  "alert": {
    "level": "danger",
    "message": "Extreme Heat Warning - Find a Cool Space Now"
  }
}
```

---

## 🏗️ System Architecture

```
Raspberry Pi (Temperature/Humidity Sensor — deployed in heat island zone)
        │
        ▼  POST /api/sensors  {"temperature": 36.2, "humidity": 65}
Hono Backend (Node.js + Drizzle + PostgreSQL) — deployed on Render
        │  stores reading · calculates humidex · logs alert events
        ▼  GET /api/sensors (every 5s)
Next.js Frontend — deployed on Vercel
        │
        ├─ Sensor Card      — live Pi humidex + alert level
        ├─ City Weather     — Toronto actual temp (OpenWeather API)
        ├─ Leaflet Map      — heat island polygons + shelter markers
        └─ Nearest Shelter  — GPS cross-check + Haversine routing
                │
                ▼
        User Browser (GPS + push notifications + audio alerts)
```

---

## 📡 Data Sources

| Dataset                       | Source                    | Format        |
| ----------------------------- | ------------------------- | ------------- |
| Urban Heat Island Effect      | ArcGIS REST API           | GeoJSON       |
| Air Conditioned & Cool Spaces | City of Toronto Open Data | GeoJSON       |
| Library Branch Locations      | City of Toronto Open Data | GeoJSON       |
| Live Temperature + Humidity   | Raspberry Pi Sensor       | POST via Hono |
| City Weather                  | OpenWeather API           | JSON          |
| Reverse Geocoding             | OpenStreetMap Nominatim   | JSON          |

---

## 📁 Project Structure

```
SafeSpot/
├── frontend/                   # Next.js 16 app
│   ├── app/
│   │   ├── page.js             # Main page (Story · How It Works · Dashboard)
│   │   └── layout.js           # Root layout + metadata
│   ├── components/
│   │   ├── AlertBanner.js      # Full-screen heat warning banner
│   │   ├── SensorCard.js       # Live Pi humidex + alert indicator
│   │   ├── WeatherCard.js      # OpenWeather city temperature
│   │   ├── NearestShelter.js   # GPS + heat zone cross-check + routing
│   │   ├── ShelterMarkers.js   # Leaflet map + heat island + shelter pins
│   │   ├── UserLocation.js     # GPS marker on map
│   │   ├── LogViewer.js        # Sensor & alert log viewer
│   │   ├── SmoothScroll.js     # Lenis smooth scroll wrapper
│   │   ├── Navbar.js
│   │   └── Footer.js
│   └── .env.local              # API keys (see Setup)
└── backend/                    # Hono.js API server
    ├── src/
    │   ├── index.js            # Server entry point (port from env)
    │   ├── app.js              # Hono app + CORS + Swagger UI
    │   ├── db.js               # PostgreSQL pool + table init
    │   ├── schema.js           # Drizzle ORM schema
    │   ├── humidex.js          # Canadian humidex formula
    │   ├── alerts.js           # getAlertLevel() thresholds
    │   ├── sensor-store.js     # sensor_readings DB read/write
    │   ├── alerts-store.js     # alert_logs DB read/write
    │   └── routes/
    │       └── sensor.js       # All API route definitions
    └── tests/                  # Vitest test suite
```

---

## 🚀 Setup

### Backend (Local)

```bash
cd backend
npm install
# Create .env with your PostgreSQL connection string:
# PG_URL=postgresql://user:password@host:port/dbname
npm run dev
# → http://localhost:8000
# → Swagger docs: http://localhost:8000/docs
```

### Backend (Deployed)

The backend is live on Render:
```
https://safespot-backend-bbn6.onrender.com
```

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after idle may take 30–60 seconds to respond.

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### `.env.local` (frontend)

```env
NEXT_PUBLIC_BACKEND_URL=https://safespot-backend-bbn6.onrender.com
NEXT_PUBLIC_OPENWEATHER_KEY=your_openweathermap_api_key
```

### Raspberry Pi Script

```python
import requests
import time

BACKEND_URL = "https://safespot-backend-bbn6.onrender.com"

while True:
    temp, humidity = read_sensor()  # DHT22 / DS18B20
    requests.post(f"{BACKEND_URL}/api/sensors", json={
        "temperature": temp,
        "humidity": humidity,
        "source": "sensor"
    })
    time.sleep(5)
```

---

## 🎬 Demo Scenario

1. Web app opens — Toronto map loads with **heat island risk areas**
2. Browser GPS detects user location — marked on map with pulsing green dot
3. App checks if user is inside a heat island polygon (**point-in-polygon**)
4. Raspberry Pi sensor reading arrives above **35°C**
5. App cross-checks: dangerous temperature → **🚨 Danger alert fires**
6. Full-screen banner + siren sound + push notification
7. App displays: **"Nearest Cooling Centre: [Name], 0.3 km NE → Get Directions"**

---

## ✅ How We Address Problem Statement 2

| PS2 Requirement                 | Our Solution                                                           |
| ------------------------------- | ---------------------------------------------------------------------- |
| Visualize climate risk areas    | Urban heat island layer (High / Medium / Low heat areas on map)        |
| Identify vulnerable communities | Heat zone colour coding by risk level                                  |
| Show proximity to safe shelter  | Cooling centres & libraries with GPS routing + Google Maps directions  |
| Help communities prepare        | Real-time alerts + nearest safe space guidance                         |
| Innovative data approach        | Raspberry Pi sensor cross-checked with heat island map for actual risk |

---

## 🔑 Why Raspberry Pi?

Weather APIs report a **city-wide average**. Urban heat islands mean a specific block can be **5–10°C hotter** than the official city temperature. SafeSpot deploys the Pi **inside a heat island zone** to measure the actual ground-level temperature — then cross-checks that reading against the historical heat map to calculate your real exposure risk.

> *"Official forecast: 28°C. Your heat island zone: 36°C. That difference can be life or death."*

---

<div align="center">
  <sub>Built with ❤️ by Team codeXperts · Seneca Polytechnic Hackathon 2026</sub>
</div>

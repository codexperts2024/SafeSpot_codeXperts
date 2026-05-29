# SafeSpot - Frontend

This is the frontend repository for the SafeSpot project. Built with Next.js and Tailwind CSS, it features a premium dark theme landing page and a live map dashboard for our hackathon presentation and demo.

## 🛠 Tech Stack
- **Framework**: Next.js 16, React 19
- **Styling**: Tailwind CSS v4
- **Map Integration**: Leaflet, React-Leaflet
- **Animation & UX**: Lenis (Smooth Scroll)

## ✨ Key Features

### 1. Landing Page & UI/UX Design
- **Hero Section**: An impactful presentation entry point highlighting our theme "Community Energy, Equity and Sustainability" and our solution "SafeSpot".
- **Premium Dark Theme**: A modern, Linear-inspired dark interface with glassmorphism component designs.
- **Responsive Web Design**: Mobile-friendly layouts optimized for all device screen sizes.
- **Partner Logo Marquee**: Smooth, continuous logo animations (rendered as inline SVGs to fix display issues).

### 2. Live Map Dashboard
- **Interactive Leaflet Map**: Embedded interactive map using React-Leaflet.
- **ArcGIS REST API Integration**: Real-time data fetching to visualize heat maps, cooling centers, and library locations.
- **UX Improvements**: 
  - Moved the map legend to the sidebar to keep the map clean.
  - Adjusted the default map zoom level for the best viewing experience.
- **Live Sensor & Weather Data**: Intuitive grid layout displaying real-time sensor (`SensorCard`) and weather (`WeatherCard`) information next to the map.
- **GPS Tracking**: User location marker (`UserLocation`) and nearest shelter guide (`NearestShelter`).

## 📁 Component Structure
- `AlertBanner.js`: Emergency alert banner at the top.
- `Navbar.js` / `Footer.js`: Global navigation and footer.
- `NearestShelter.js`: Guide to the closest shelter based on the current location.
- `SensorCard.js` / `WeatherCard.js`: Real-time environment and weather data cards.
- `ShelterMarkers.js`: Renders shelter and cooling center markers on the map.
- `SmoothScroll.js`: Lenis-based smooth scrolling.
- `UserLocation.js`: Visualizes the user's GPS location.

---

## 🚀 Getting Started

How to run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

# seneca_hackathon_2026

SafeSpot Toronto
Hackathon Project Plan — Theme 3, Problem Statement 2
Team codeXperts | Seneca Polytechnic

Overview
Project Name: SafeSpot Toronto
Theme: Community Energy, Equity and Sustainability
Problem Statement: Climate impacts such as heatwaves and flooding disproportionately affect vulnerable populations. Many communities rely on public facilities like libraries, schools, and community centers as warming or cooling spaces during extreme weather. Utilities and municipalities need simple ways to visualize where climate risks and limited access to safe shelter spaces overlap.
Solution: A conceptual web app that helps Toronto communities prepare for extreme weather by combining real-time temperature sensor data, urban heat island mapping, and smart routing to the nearest cooling centre or library.

Team
Name
Role
Gary
Hardware — Raspberry Pi & Temperature Sensor
Marcos
Backend — FastAPI (Python)
Paul
Frontend — Next.js, Leaflet.js Map Integration
Seulgi
Frontend — UI/UX Design, Alert System
Arun
Frontend — GPS Location, Nearest Shelter Routing


Tech Stack
Layer
Technology
Frontend
Next.js, Leaflet.js
Backend
FastAPI (Python)
Hardware
Raspberry Pi + Temperature Sensor
Data Sources
ArcGIS REST API (Urban Heat Island, Cooling Centres, Libraries)
Map Library
Leaflet.js with GeoJSON layers


Core Features
1. Heat Risk Map
Display Toronto's urban heat island layer on an interactive Leaflet map
Colour-coded zones showing high, medium, and low heat risk areas
Data sourced from ArcGIS: Impervious Surface and Urban Heat Island Effect in Toronto
2. Real-Time Temperature Monitoring
Raspberry Pi temperature sensor deployed in a high-risk heat zone
Sensor data sent to FastAPI backend at regular intervals
Live sensor reading displayed on the map as a data point
3. Danger Threshold Alert
When sensor temperature exceeds 35°C, the app triggers a warning alert
Alert banner displayed to the user with current temperature and risk level
Cooling centres and libraries are highlighted on the map
4. Nearest Safe Space Routing
Browser GPS used to detect the user's current location
App calculates the closest cooling centre or library
Distance and name of the nearest safe space displayed to the user

Data Sources
Dataset
Source
Format
Urban Heat Island Effect
ArcGIS REST API (Seneca account)
GeoJSON
Air Conditioned & Cool Spaces
City of Toronto Open Data
GeoJSON
Library Branch Locations
City of Toronto Open Data
GeoJSON
Flood Events (Toronto)
ArcGIS REST API
GeoJSON
Live Temperature
Raspberry Pi Sensor
POST via FastAPI


API Endpoints (FastAPI)
Method
Endpoint
Description
GET
/api/heat-data
Returns heat island GeoJSON
GET
/api/cooling-centres
Returns cooling centre locations
GET
/api/libraries
Returns library branch locations
POST
/api/sensor-data
Receives temperature data from Raspberry Pi
GET
/api/sensor-latest
Returns most recent sensor reading


System Architecture
Raspberry Pi (Temperature Sensor)
        ↓ POST /api/sensor-data
FastAPI Backend
        ↓ Serves processed GeoJSON + sensor data
Next.js Frontend
        ↓ Renders interactive Leaflet map
User Browser (with GPS)


Development Plan
Day 1 (Today)
Task
Owner
Goal
FastAPI project setup
Marcos
Server running locally
ArcGIS heat data fetch
Marcos
GET /api/heat-data working
Cooling centres + libraries fetch
Marcos
GET endpoints working
Next.js project setup
Paul
App running locally
Leaflet map rendering
Paul
Toronto map displayed
Heat island layer on map
Paul
GeoJSON rendered as coloured zones
Raspberry Pi sensor setup
Gary
Temperature readings confirmed
UI wireframe
Seulgi
Screen layout designed

Day 2 (Tomorrow)
Task
Owner
Goal
Cooling centre + library pins on map
Arun
Markers visible on map
GPS location detection
Arun
Browser location API working
Nearest safe space calculation
Arun
Distance logic implemented
Alert banner UI
Seulgi
Warning shown on threshold
Sensor POST to FastAPI
Gary
Live data flowing to backend
Sensor data point on map
Paul
Live marker on map
Full integration test
All
Demo scenario runs end to end


Demo Scenario (For Presentation)
Open the web app — Toronto map loads with heat island risk zones displayed
Browser GPS detects the user's current location and marks it on the map
Raspberry Pi sensor temperature is manually raised above 35°C to simulate a heatwave
App triggers an alert banner: "Extreme Heat Warning — Find a Cool Space Now"
Cooling centres and libraries are highlighted on the map
App displays: "Nearest Cooling Centre: [Name], 0.3 km away"

How This Addresses Problem Statement 2
PS2 Requirement
Our Solution
Visualize climate risk areas
Urban heat island layer on interactive map
Identify vulnerable communities
Heat zone colour coding by risk level
Show proximity to safe shelter spaces
Cooling centres and libraries mapped with GPS routing
Help communities prepare for extreme weather
Real-time alerts and nearest safe space guidance
Innovative data approach
Live Raspberry Pi sensor adds real-world hardware dimension


Project built for Seneca Polytechnic Hackathon — Theme 3: Community Energy, Equity and Sustainability

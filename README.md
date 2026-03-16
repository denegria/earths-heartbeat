# 🌍 Earth's Heartbeat

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tech](https://img.shields.io/badge/tech-Vite%20%7C%20Three.js%20%7C%20Globe.gl-black.svg)

An immersive, real-time 3D visualization of global seismic activity. **Earth's Heartbeat** pulls live earthquake data from the USGS API and maps it onto a beautiful, interactive digital globe. It's designed to give you a mesmerizing, yet educational macroscopic view of our planet's tectonic activity.

---

<p align="center">
  <!-- TODO: Replace with actual screenshot paths -->
  <img src="https://via.placeholder.com/800x450.png?text=Earths+Heartbeat+3D+Globe+View" width="800" />
</p>

## ✨ Features

- **🔴 Live Global Data:** Fetches the last 30 days of earthquakes (magnitude 2.5+) worldwide using the USGS API.
- **🌐 Interactive 3D Globe:** Smoothly pan, zoom, and rotate a 3D Earth rendered via `globe.gl` and `Three.js`.
- **💥 Magnitude Visualizer:** Earthquakes are represented dynamically — the higher the magnitude, the larger and redder the pulse.
- **🌌 Premium Space Aesthetic:** A sleek, glassmorphism UI set against a dark starry void, designed for absolute immersion.
- **🌍 Regional Filtering:** Quickly snap the camera to North America, Asia, South America, or Europe.

## 🚀 Quick Start

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd earths-heartbeat
   ```

2. Install the necessary dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser and watch the Earth pulse!

## 🛠️ Tech Stack

- **Frontend Build Tool:** [Vite](https://vitejs.dev/)
- **3D Rendering:** [Globe.gl](https://globe.gl/) (built on [Three.js](https://threejs.org/))
- **Styling:** Custom Vanilla CSS with modern Glassmorphism techniques
- **Data Source:** United States Geological Survey ([USGS API](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php))

---

*Feel the pulse of the planet.*

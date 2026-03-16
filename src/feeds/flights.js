/**
 * Flights Feed — OpenSky Network (civilian) + adsb.lol (all aircraft + military filter)
 *
 * Uses two sources for maximum density:
 * 1. OpenSky Network for civilian aircraft (~5,000+)
 * 2. adsb.lol military endpoint for dedicated military tracking
 */
import * as Cesium from 'cesium';

const OPENSKY_URL = '/api/opensky/api/states/all';
const ADSB_MIL_URL = '/api/adsb/v2/mil';
const POLL_INTERVAL = 15000; // 15 seconds

let viewer = null;
let flightEntities = new Map();
let militaryEntities = new Map();
let civilianTimer = null;
let militaryTimer = null;

export function initFlights(cesiumViewer) {
    viewer = cesiumViewer;
    fetchCivilianFlights();
    fetchMilitaryFlights();
    civilianTimer = setInterval(fetchCivilianFlights, POLL_INTERVAL);
    militaryTimer = setInterval(fetchMilitaryFlights, POLL_INTERVAL);
}

export function stopFlights() {
    clearInterval(civilianTimer);
    clearInterval(militaryTimer);
}

export function getFlightCounts() {
    return {
        civilian: flightEntities.size,
        military: militaryEntities.size,
        total: flightEntities.size + militaryEntities.size,
    };
}

// ── Civilian Flights (OpenSky via proxy) ──

async function fetchCivilianFlights() {
    try {
        const res = await fetch(OPENSKY_URL);
        if (!res.ok) {
            console.warn('[Flights] OpenSky returned', res.status);
            return;
        }
        const data = await res.json();
        const states = data.states || [];
        const seen = new Set();

        for (const s of states) {
            const icao = s[0];
            const callsign = (s[1] || '').trim();
            const lon = s[5];
            const lat = s[6];
            const alt = s[7] || s[13] || 0;
            const velocity = s[9] || 0;
            const heading = s[10] || 0;
            const onGround = s[8];

            if (!lon || !lat || onGround) continue;

            // Skip if already tracked as military
            if (militaryEntities.has(icao)) continue;

            seen.add(icao);

            if (flightEntities.has(icao)) {
                const entity = flightEntities.get(icao);
                entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
                entity.billboard.rotation = Cesium.Math.toRadians(-heading);
            } else {
                const entity = viewer.entities.add({
                    id: `flight-${icao}`,
                    name: callsign || icao,
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
                    billboard: {
                        image: buildPlaneIcon('#00d4ff'),
                        scale: 0.4,
                        rotation: Cesium.Math.toRadians(-heading),
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                        translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 1e7, 0.2),
                        scaleByDistance: new Cesium.NearFarScalar(1e4, 0.8, 5e6, 0.15),
                    },
                    label: {
                        text: callsign || '',
                        font: '10px JetBrains Mono',
                        fillColor: Cesium.Color.fromCssColorString('#00d4ff'),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, -16),
                        scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 3e6, 0.0),
                        translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 2e6, 0.0),
                    },
                    description: buildFlightDesc(callsign, lat, lon, alt, velocity, heading, false),
                    properties: { type: 'civilian', icao, callsign },
                });
                flightEntities.set(icao, entity);
            }
        }

        // Remove stale
        for (const [icao, entity] of flightEntities) {
            if (!seen.has(icao)) {
                viewer.entities.remove(entity);
                flightEntities.delete(icao);
            }
        }
    } catch (e) {
        console.warn('[Flights] OpenSky error:', e.message);
    }
}

// ── Military Flights (adsb.lol) ──

async function fetchMilitaryFlights() {
    try {
        const res = await fetch(ADSB_MIL_URL);
        if (!res.ok) return;
        const data = await res.json();
        const aircraft = data.ac || [];
        const seen = new Set();

        for (const ac of aircraft) {
            const hex = ac.hex;
            const callsign = (ac.flight || ac.r || '').trim();
            const lat = ac.lat;
            const lon = ac.lon;
            const alt = ac.alt_baro === 'ground' ? 0 : (ac.alt_baro || 0) * 0.3048;
            const speed = (ac.gs || 0) * 0.514444;
            const heading = ac.track || 0;
            const type = ac.t || 'Unknown';

            if (!lat || !lon || alt === 0) continue;
            seen.add(hex);

            if (militaryEntities.has(hex)) {
                const entity = militaryEntities.get(hex);
                entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
                entity.billboard.rotation = Cesium.Math.toRadians(-heading);
            } else {
                const entity = viewer.entities.add({
                    id: `mil-${hex}`,
                    name: `🔴 ${callsign || hex}`,
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
                    billboard: {
                        image: buildPlaneIcon('#ff3b3b'),
                        scale: 0.5,
                        rotation: Cesium.Math.toRadians(-heading),
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                        translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 1e7, 0.3),
                        scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.25),
                    },
                    label: {
                        text: callsign || hex,
                        font: 'bold 11px JetBrains Mono',
                        fillColor: Cesium.Color.fromCssColorString('#ff3b3b'),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, -20),
                        scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 4e6, 0.0),
                        translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 3e6, 0.0),
                    },
                    // Pulsing threat ring
                    ellipse: {
                        semiMajorAxis: 15000,
                        semiMinorAxis: 15000,
                        material: Cesium.Color.fromCssColorString('#ff3b3b').withAlpha(0.06),
                        outline: true,
                        outlineColor: Cesium.Color.fromCssColorString('#ff3b3b').withAlpha(0.25),
                        height: alt,
                    },
                    description: buildFlightDesc(callsign, lat, lon, alt, speed, heading, true, type),
                    properties: { type: 'military', hex, callsign, aircraftType: type },
                });
                militaryEntities.set(hex, entity);
            }
        }

        // Remove stale
        for (const [hex, entity] of militaryEntities) {
            if (!seen.has(hex)) {
                viewer.entities.remove(entity);
                militaryEntities.delete(hex);
            }
        }
    } catch (e) {
        console.warn('[Flights] adsb.lol mil error:', e.message);
    }
}

// ── Helpers ──

function buildFlightDesc(callsign, lat, lon, alt, speed, heading, isMilitary, acType = '') {
    const badge = isMilitary
        ? '<span style="color:#ff3b3b;font-weight:bold;">⚠ MILITARY</span>'
        : '<span style="color:#00d4ff;">CIVILIAN</span>';
    return `
    <div style="font-family:monospace;font-size:12px;color:#e0e8f0;">
      <div style="margin-bottom:8px;">${badge}${acType ? ` — ${acType}` : ''}</div>
      <b>Callsign:</b> ${callsign || 'N/A'}<br/>
      <b>Position:</b> ${lat.toFixed(4)}°, ${lon.toFixed(4)}°<br/>
      <b>Altitude:</b> ${Math.round(alt)} m (${Math.round(alt * 3.281)} ft)<br/>
      <b>Speed:</b> ${Math.round(speed)} m/s (${Math.round(speed * 1.944)} kt)<br/>
      <b>Heading:</b> ${Math.round(heading)}°
    </div>
  `;
}

function buildPlaneIcon(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M12 2 L15 10 L22 12 L15 14 L12 22 L9 14 L2 12 L9 10 Z"
          fill="${color}" fill-opacity="0.9" stroke="rgba(0,0,0,0.4)" stroke-width="0.5"/>
  </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

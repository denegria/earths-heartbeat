/**
 * Satellites Feed — CelesTrak TLE + satellite.js SGP4 propagation
 */
import * as Cesium from 'cesium';
import * as satellite from 'satellite.js';

const TLE_URL = '/api/celestrak/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const TLE_STATIONS_URL = '/api/celestrak/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';
const MAX_SATS = 200; // Limit for performance

let viewer = null;
let satEntities = new Map();
let tleRecords = [];
let animationFrame = null;

export function initSatellites(cesiumViewer) {
    viewer = cesiumViewer;
    fetchTLE();
}

export function stopSatellites() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
}

export function getSatCount() {
    return satEntities.size;
}

async function fetchTLE() {
    try {
        // Fetch space stations (ISS etc.) + active satellites
        const [stationsRes, activeRes] = await Promise.allSettled([
            fetch(TLE_STATIONS_URL),
            fetch(TLE_URL),
        ]);

        let raw = '';
        if (stationsRes.status === 'fulfilled' && stationsRes.value.ok) {
            raw += await stationsRes.value.text() + '\n';
        }
        if (activeRes.status === 'fulfilled' && activeRes.value.ok) {
            raw += await activeRes.value.text();
        }

        if (!raw) {
            console.warn('[Satellites] No TLE data received');
            return;
        }

        tleRecords = parseTLE(raw).slice(0, MAX_SATS);
        createSatelliteEntities();
        startPropagation();
    } catch (e) {
        console.warn('[Satellites] TLE fetch error:', e.message);
    }
}

function parseTLE(text) {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const records = [];

    const seen = new Set();
    for (let i = 0; i < lines.length - 2; i++) {
        if (lines[i + 1]?.startsWith('1 ') && lines[i + 2]?.startsWith('2 ')) {
            const name = lines[i].replace(/^0 /, '');
            if (seen.has(name)) { i += 2; continue; } // Skip duplicates
            seen.add(name);
            const tle1 = lines[i + 1];
            const tle2 = lines[i + 2];
            try {
                const satrec = satellite.twoline2satrec(tle1, tle2);
                records.push({ name, tle1, tle2, satrec });
            } catch {
                // Skip invalid TLEs
            }
            i += 2;
        }
    }
    return records;
}

function createSatelliteEntities() {
    for (const rec of tleRecords) {
        const isStation = rec.name.includes('ISS') || rec.name.includes('TIANGONG') || rec.name.includes('CSS');
        const color = isStation ? '#ffd60a' : '#a0c4ff';
        const scale = isStation ? 0.7 : 0.35;

        const entity = viewer.entities.add({
            id: `sat-${rec.name}`,
            name: rec.name,
            position: Cesium.Cartesian3.fromDegrees(0, 0, 400000),
            point: {
                pixelSize: isStation ? 8 : 4,
                color: Cesium.Color.fromCssColorString(color),
                outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.4),
                outlineWidth: isStation ? 3 : 1,
                scaleByDistance: new Cesium.NearFarScalar(1e6, 1.0, 5e7, 0.3),
                translucencyByDistance: new Cesium.NearFarScalar(1e6, 1.0, 8e7, 0.2),
            },
            label: isStation ? {
                text: rec.name,
                font: 'bold 11px JetBrains Mono',
                fillColor: Cesium.Color.fromCssColorString('#ffd60a'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -16),
                scaleByDistance: new Cesium.NearFarScalar(1e6, 1.0, 5e7, 0.0),
            } : undefined,
            description: buildSatDesc(rec.name),
            properties: { type: 'satellite', name: rec.name },
        });

        satEntities.set(rec.name, { entity, satrec: rec.satrec });
    }
}

function startPropagation() {
    function update() {
        const now = new Date();

        for (const [name, { entity, satrec }] of satEntities) {
            try {
                const posVel = satellite.propagate(satrec, now);
                if (!posVel.position) continue;

                const gmst = satellite.gstime(now);
                const geo = satellite.eciToGeodetic(posVel.position, gmst);

                const lon = satellite.degreesLong(geo.longitude);
                const lat = satellite.degreesLat(geo.latitude);
                const alt = geo.height * 1000; // km to m

                entity.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
            } catch {
                // Skip propagation errors
            }
        }

        animationFrame = requestAnimationFrame(update);
    }

    update();
}

function buildSatDesc(name) {
    return `
    <div style="font-family:monospace;font-size:12px;color:#e0e8f0;">
      <span style="color:#ffd60a;font-weight:bold;">🛰 SATELLITE</span><br/><br/>
      <b>Name:</b> ${name}<br/>
      <b>Source:</b> CelesTrak/NORAD<br/>
      <b>Tracking:</b> SGP4 Propagation
    </div>
  `;
}

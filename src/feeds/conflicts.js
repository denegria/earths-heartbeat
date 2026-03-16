/**
 * Conflicts Feed — GDELT GEO API for real-time global events
 */
import * as Cesium from 'cesium';

// GDELT GEO API — returns georeferenced events
const GDELT_GEO_URL = '/api/gdelt/api/v2/geo/geo';
const POLL_INTERVAL = 300000; // 5 minutes

// CAMEO root codes for military/conflict events
const MILITARY_CODES = [
    '17', // Coerce
    '18', // Assault
    '19', // Fight
    '20', // Use unconventional mass violence
    '15', // Exhibit force posture
    '13', // Threaten
    '14', // Protest
];

let viewer = null;
let eventEntities = new Map();
let eventHistory = []; // For timeline replay
let pollTimer = null;

export function initConflicts(cesiumViewer) {
    viewer = cesiumViewer;
    fetchConflictEvents();
    pollTimer = setInterval(fetchConflictEvents, POLL_INTERVAL);
}

export function stopConflicts() {
    clearInterval(pollTimer);
}

export function getEventCount() {
    return eventEntities.size;
}

export function getEventHistory() {
    return eventHistory;
}

async function fetchConflictEvents() {
    try {
        // Query GDELT for recent military/conflict events in GeoJSON
        const params = new URLSearchParams({
            query: 'conflict OR military OR attack OR airstrike OR missile OR troops OR battle',
            mode: 'PointData',
            format: 'GeoJSON',
            maxpoints: '250',
            timespan: '24h',
        });

        const res = await fetch(`${GDELT_GEO_URL}?${params}`);
        if (!res.ok) return;

        const geojson = await res.json();
        const features = geojson.features || [];

        const seen = new Set();

        for (const feature of features) {
            const coords = feature.geometry?.coordinates;
            if (!coords || coords.length < 2) continue;

            const [lon, lat] = coords;
            const props = feature.properties || {};
            const name = props.name || props.html || 'Unknown Event';
            const url = props.url || props.shareimage || '';
            const eventId = `evt-${lat.toFixed(3)}-${lon.toFixed(3)}-${name.slice(0, 20)}`;

            seen.add(eventId);

            // Determine severity from title keywords
            const severity = classifyThreat(name);

            // Store for timeline
            eventHistory.push({
                id: eventId,
                lat,
                lon,
                name,
                url,
                severity,
                timestamp: Date.now(),
            });

            if (eventEntities.has(eventId)) continue; // Already on globe

            const color = severity === 'critical' ? '#ff3b3b'
                : severity === 'warning' ? '#ff9500'
                    : '#ffd60a';

            const entity = viewer.entities.add({
                id: eventId,
                name: truncate(stripHtml(name), 80),
                position: Cesium.Cartesian3.fromDegrees(lon, lat, 1000),
                billboard: {
                    image: buildEventIcon(color),
                    scale: severity === 'critical' ? 0.6 : 0.45,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 5e6, 0.3),
                    translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 1e7, 0.4),
                },
                // Threat ring
                ellipse: {
                    semiMajorAxis: severity === 'critical' ? 50000 : 30000,
                    semiMinorAxis: severity === 'critical' ? 50000 : 30000,
                    material: Cesium.Color.fromCssColorString(color).withAlpha(0.06),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString(color).withAlpha(0.2),
                    height: 500,
                },
                label: {
                    text: truncate(stripHtml(name), 30),
                    font: '10px JetBrains Mono',
                    fillColor: Cesium.Color.fromCssColorString(color),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 2e6, 0.0),
                    translucencyByDistance: new Cesium.NearFarScalar(5e4, 1.0, 2e6, 0.0),
                },
                description: buildEventDesc(name, lat, lon, severity, url),
                properties: { type: 'event', severity, name },
            });

            eventEntities.set(eventId, entity);
        }

        // Trim history to last 24h
        const cutoff = Date.now() - 86400000;
        eventHistory = eventHistory.filter((e) => e.timestamp > cutoff);

    } catch (e) {
        console.warn('[Conflicts] GDELT fetch error:', e.message);
    }
}

function classifyThreat(text) {
    const lower = text.toLowerCase();
    if (/airstrike|missile|bomb|explosion|attack|killed|casualt|war\b|invasion/i.test(lower)) {
        return 'critical';
    }
    if (/military|troops|deploy|threat|tension|sanction|warship|fighter jet/i.test(lower)) {
        return 'warning';
    }
    return 'info';
}

function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}

function stripHtml(str) {
    return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function buildEventIcon(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <polygon points="12,2 22,20 2,20" fill="${color}" fill-opacity="0.8"
             stroke="${color}" stroke-width="1"/>
    <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold"
          fill="black" font-family="sans-serif">!</text>
  </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function buildEventDesc(name, lat, lon, severity, url) {
    const badge = severity === 'critical'
        ? '<span style="color:#ff3b3b;font-weight:bold;">⚠ CRITICAL</span>'
        : severity === 'warning'
            ? '<span style="color:#ff9500;font-weight:bold;">⚡ WARNING</span>'
            : '<span style="color:#ffd60a;">ℹ INFO</span>';

    return `
    <div style="font-family:monospace;font-size:12px;color:#e0e8f0;max-width:300px;">
      <div style="margin-bottom:8px;">${badge}</div>
      <b>Event:</b> ${stripHtml(name)}<br/>
      <b>Location:</b> ${lat.toFixed(4)}°, ${lon.toFixed(4)}°<br/>
      <b>Source:</b> GDELT Global Event Database<br/>
      ${url ? `<br/><a href="${url}" target="_blank" style="color:#00d4ff;">Read more →</a>` : ''}
    </div>
  `;
}

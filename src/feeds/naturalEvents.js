/**
 * Natural Events Feed — NASA EONET API
 * Tracks earthquakes, wildfires, volcanic eruptions, storms, etc.
 */
import * as Cesium from 'cesium';

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50';
const POLL_INTERVAL = 600000; // 10 minutes

const CATEGORY_ICONS = {
    wildfires: { icon: '🔥', color: '#ff6600', label: 'WILDFIRE' },
    severeStorms: { icon: '🌀', color: '#9b59b6', label: 'STORM' },
    volcanoes: { icon: '🌋', color: '#e74c3c', label: 'VOLCANO' },
    earthquakes: { icon: '💥', color: '#f39c12', label: 'EARTHQUAKE' },
    floods: { icon: '🌊', color: '#3498db', label: 'FLOOD' },
    landslides: { icon: '⛰', color: '#8B4513', label: 'LANDSLIDE' },
    seaLakeIce: { icon: '❄', color: '#00bcd4', label: 'ICE' },
    dustHaze: { icon: '💨', color: '#95a5a6', label: 'DUST/HAZE' },
    tempExtremes: { icon: '🌡', color: '#e91e63', label: 'EXTREME TEMP' },
};

let viewer = null;
let naturalEntities = new Map();
let pollTimer = null;

export function initNaturalEvents(cesiumViewer) {
    viewer = cesiumViewer;
    fetchEvents();
    pollTimer = setInterval(fetchEvents, POLL_INTERVAL);
}

export function stopNaturalEvents() {
    clearInterval(pollTimer);
}

export function getNaturalCount() {
    return naturalEntities.size;
}

async function fetchEvents() {
    try {
        const res = await fetch(EONET_URL);
        if (!res.ok) return;
        const data = await res.json();
        const events = data.events || [];

        for (const event of events) {
            const id = `nat-${event.id}`;
            if (naturalEntities.has(id)) continue;

            const category = event.categories?.[0]?.id || 'unknown';
            const config = CATEGORY_ICONS[category] || { icon: '⚡', color: '#ffcc00', label: 'NATURAL EVENT' };

            // Get latest geometry
            const geo = event.geometry?.[event.geometry.length - 1];
            if (!geo?.coordinates) continue;

            const [lon, lat] = geo.coordinates;
            const title = event.title || 'Unknown Event';
            const date = geo.date ? new Date(geo.date).toLocaleString() : 'Unknown';

            const entity = viewer.entities.add({
                id,
                name: `${config.icon} ${title}`,
                position: Cesium.Cartesian3.fromDegrees(lon, lat, 500),
                billboard: {
                    image: buildNaturalIcon(config.color, config.icon),
                    scale: 0.55,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 5e6, 0.3),
                    translucencyByDistance: new Cesium.NearFarScalar(1e4, 1.0, 8e6, 0.4),
                },
                label: {
                    text: title.length > 25 ? title.slice(0, 25) + '…' : title,
                    font: '10px JetBrains Mono',
                    fillColor: Cesium.Color.fromCssColorString(config.color),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -22),
                    scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 2e6, 0.0),
                },
                ellipse: {
                    semiMajorAxis: 40000,
                    semiMinorAxis: 40000,
                    material: Cesium.Color.fromCssColorString(config.color).withAlpha(0.06),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString(config.color).withAlpha(0.2),
                    height: 200,
                },
                description: buildNaturalDesc(title, category, config, lat, lon, date, event.sources),
                properties: { type: 'natural', category, title },
            });

            naturalEntities.set(id, entity);
        }
    } catch (e) {
        console.warn('[Natural] EONET fetch error:', e.message);
    }
}

function buildNaturalIcon(color, emoji) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="12" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="1.5"/>
    <text x="14" y="18" text-anchor="middle" font-size="14">${emoji}</text>
  </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function buildNaturalDesc(title, category, config, lat, lon, date, sources) {
    const sourceLinks = (sources || [])
        .map((s) => `<a href="${s.url}" target="_blank" style="color:#00d4ff;">${s.id}</a>`)
        .join(', ');
    return `
    <div style="font-family:monospace;font-size:12px;color:#e0e8f0;">
      <span style="color:${config.color};font-weight:bold;">${config.icon} ${config.label}</span><br/><br/>
      <b>Event:</b> ${title}<br/>
      <b>Location:</b> ${lat.toFixed(4)}°, ${lon.toFixed(4)}°<br/>
      <b>Date:</b> ${date}<br/>
      <b>Source:</b> NASA EONET<br/>
      ${sourceLinks ? `<b>Links:</b> ${sourceLinks}` : ''}
    </div>
  `;
}

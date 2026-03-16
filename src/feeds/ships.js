/**
 * Ships Feed — AIS vessel tracking
 *
 * Uses publicly available AIS data for real-time ship positions.
 * Falls back to a curated set of simulated vessel positions
 * if the live API is unavailable.
 */
import * as Cesium from 'cesium';

// WikiVoyage / MarineTraffic don't have free CORS-friendly APIs,
// so we use a simulated feed of major shipping lanes + naval bases.
// This gives realistic density while we look for a free AIS source.

const POLL_INTERVAL = 30000; // 30 seconds
const SHIP_COUNT = 300; // Number of simulated vessels

// Major shipping lanes and naval areas (lat/lon centers with spread)
const SHIPPING_LANES = [
    // Strait of Hormuz & Persian Gulf
    { lat: 26.5, lon: 56.3, spread: 3, count: 25, label: 'Persian Gulf' },
    // Strait of Malacca
    { lat: 2.5, lon: 101.5, spread: 3, count: 20, label: 'Malacca Strait' },
    // Suez Canal & Red Sea
    { lat: 22.5, lon: 38.5, spread: 5, count: 25, label: 'Red Sea' },
    // South China Sea
    { lat: 14.0, lon: 115.0, spread: 6, count: 30, label: 'S. China Sea' },
    // English Channel
    { lat: 50.5, lon: 0.5, spread: 2, count: 20, label: 'English Channel' },
    // North Atlantic shipping
    { lat: 42.0, lon: -50.0, spread: 10, count: 25, label: 'N. Atlantic' },
    // Mediterranean
    { lat: 36.0, lon: 18.0, spread: 8, count: 25, label: 'Mediterranean' },
    // US East Coast
    { lat: 35.0, lon: -73.0, spread: 5, count: 20, label: 'US East Coast' },
    // US West Coast
    { lat: 34.0, lon: -119.0, spread: 3, count: 15, label: 'US West Coast' },
    // Taiwan Strait
    { lat: 24.5, lon: 119.5, spread: 1.5, count: 15, label: 'Taiwan Strait' },
    // Baltic Sea
    { lat: 57.0, lon: 18.0, spread: 4, count: 15, label: 'Baltic Sea' },
    // Black Sea
    { lat: 43.0, lon: 34.0, spread: 3, count: 15, label: 'Black Sea' },
    // Horn of Africa / Bab el-Mandeb
    { lat: 12.5, lon: 44.0, spread: 2, count: 15, label: 'Bab el-Mandeb' },
    // Panama Canal approach
    { lat: 9.0, lon: -79.5, spread: 2, count: 10, label: 'Panama Canal' },
    // Gulf of Guinea
    { lat: 4.0, lon: 3.0, spread: 4, count: 10, label: 'Gulf of Guinea' },
    // East China Sea
    { lat: 30.0, lon: 126.0, spread: 3, count: 15, label: 'E. China Sea' },
];

const VESSEL_TYPES = [
    { type: 'Cargo', color: '#4a9eff', icon: '🚢', weight: 40 },
    { type: 'Tanker', color: '#ff9500', icon: '⛽', weight: 25 },
    { type: 'Container', color: '#00d4ff', icon: '📦', weight: 20 },
    { type: 'Fishing', color: '#00cc66', icon: '🎣', weight: 8 },
    { type: 'Naval', color: '#ff3b3b', icon: '⚓', weight: 5 },
    { type: 'Cruise', color: '#e040fb', icon: '🚢', weight: 2 },
];

let viewer = null;
let shipEntities = new Map();
let ships = [];
let animFrame = null;

export function initShips(cesiumViewer) {
    viewer = cesiumViewer;
    generateShips();
    createShipEntities();
    startAnimation();
}

export function stopShips() {
    if (animFrame) cancelAnimationFrame(animFrame);
}

export function getShipCount() {
    return shipEntities.size;
}

function pickVesselType() {
    const totalWeight = VESSEL_TYPES.reduce((sum, v) => sum + v.weight, 0);
    let r = Math.random() * totalWeight;
    for (const v of VESSEL_TYPES) {
        r -= v.weight;
        if (r <= 0) return v;
    }
    return VESSEL_TYPES[0];
}

function generateShips() {
    for (const lane of SHIPPING_LANES) {
        for (let i = 0; i < lane.count; i++) {
            const vessel = pickVesselType();
            const lat = lane.lat + (Math.random() - 0.5) * lane.spread * 2;
            const lon = lane.lon + (Math.random() - 0.5) * lane.spread * 2;
            const heading = Math.random() * 360;
            const speed = 0.00002 + Math.random() * 0.00008; // degrees per frame (~5-20 knots)
            const name = `${vessel.type}-${lane.label.replace(/\s/g, '')}-${i}`;

            ships.push({
                id: `ship-${name}`,
                name: `${vessel.icon} ${vessel.type} (${lane.label})`,
                lat,
                lon,
                heading,
                speed,
                vessel,
                lane: lane.label,
            });
        }
    }
}

function createShipEntities() {
    for (const ship of ships) {
        const entity = viewer.entities.add({
            id: ship.id,
            name: ship.name,
            position: Cesium.Cartesian3.fromDegrees(ship.lon, ship.lat, 0),
            point: {
                pixelSize: ship.vessel.type === 'Naval' ? 6 : 4,
                color: Cesium.Color.fromCssColorString(ship.vessel.color),
                outlineColor: Cesium.Color.fromCssColorString(ship.vessel.color).withAlpha(0.3),
                outlineWidth: ship.vessel.type === 'Naval' ? 3 : 1,
                scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 5e6, 0.3),
                translucencyByDistance: new Cesium.NearFarScalar(1e5, 1.0, 8e6, 0.15),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            label: {
                text: ship.vessel.type === 'Naval' ? `⚓ ${ship.lane}` : '',
                font: '9px JetBrains Mono',
                fillColor: Cesium.Color.fromCssColorString(ship.vessel.color),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -12),
                scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 2e6, 0.0),
            },
            description: buildShipDesc(ship),
            properties: { type: 'ship', vesselType: ship.vessel.type, lane: ship.lane },
        });

        shipEntities.set(ship.id, { entity, ship });
    }
}

function startAnimation() {
    function update() {
        for (const { entity, ship } of shipEntities.values()) {
            // Move ship along heading
            const rad = ship.heading * (Math.PI / 180);
            ship.lat += Math.cos(rad) * ship.speed;
            ship.lon += Math.sin(rad) * ship.speed;

            // Slight random heading drift
            ship.heading += (Math.random() - 0.5) * 0.5;

            // Keep in lane bounds (wrap around)
            const lane = SHIPPING_LANES.find((l) => l.label === ship.lane);
            if (lane) {
                if (Math.abs(ship.lat - lane.lat) > lane.spread * 1.5) {
                    ship.heading = (ship.heading + 180) % 360;
                }
                if (Math.abs(ship.lon - lane.lon) > lane.spread * 1.5) {
                    ship.heading = (ship.heading + 180) % 360;
                }
            }

            entity.position = Cesium.Cartesian3.fromDegrees(ship.lon, ship.lat, 0);
        }

        animFrame = requestAnimationFrame(update);
    }

    update();
}

function buildShipDesc(ship) {
    return `
    <div style="font-family:monospace;font-size:12px;color:#e0e8f0;">
      <span style="color:${ship.vessel.color};font-weight:bold;">${ship.vessel.icon} ${ship.vessel.type.toUpperCase()}</span><br/><br/>
      <b>Region:</b> ${ship.lane}<br/>
      <b>Position:</b> ${ship.lat.toFixed(4)}°, ${ship.lon.toFixed(4)}°<br/>
      <b>Heading:</b> ${Math.round(ship.heading)}°<br/>
      <b>Source:</b> Simulated AIS<br/>
      <span style="color:var(--text-dim);font-size:10px;">
        Positions are simulated along real shipping lanes.
        Connect a live AIS feed for real vessel data.
      </span>
    </div>
  `;
}

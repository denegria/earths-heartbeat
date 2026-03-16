/**
 * Geographic Labels — Country names, major cities, and region labels
 * Uses CesiumJS entities for placing text labels at known coordinates.
 */
import * as Cesium from 'cesium';

let viewer = null;
let labelEntities = [];
let labelsVisible = false;

// Major countries + capitals + military-relevant locations
const LABELS = [
    // North America
    { name: 'UNITED STATES', lat: 39.8, lon: -98.5, size: 'country' },
    { name: 'CANADA', lat: 56.0, lon: -96.0, size: 'country' },
    { name: 'MEXICO', lat: 23.6, lon: -102.5, size: 'country' },
    { name: 'Washington D.C.', lat: 38.9, lon: -77.0, size: 'city' },
    { name: 'New York', lat: 40.7, lon: -74.0, size: 'city' },
    { name: 'Los Angeles', lat: 34.0, lon: -118.2, size: 'city' },

    // Europe
    { name: 'UNITED KINGDOM', lat: 53.5, lon: -2.5, size: 'country' },
    { name: 'FRANCE', lat: 46.6, lon: 2.2, size: 'country' },
    { name: 'GERMANY', lat: 51.2, lon: 10.4, size: 'country' },
    { name: 'ITALY', lat: 42.5, lon: 12.5, size: 'country' },
    { name: 'SPAIN', lat: 40.0, lon: -3.7, size: 'country' },
    { name: 'POLAND', lat: 52.0, lon: 19.4, size: 'country' },
    { name: 'UKRAINE', lat: 48.4, lon: 31.2, size: 'country' },
    { name: 'ROMANIA', lat: 45.9, lon: 25.0, size: 'country' },
    { name: 'NORWAY', lat: 64.0, lon: 12.0, size: 'country' },
    { name: 'SWEDEN', lat: 62.0, lon: 16.0, size: 'country' },
    { name: 'FINLAND', lat: 64.0, lon: 26.0, size: 'country' },
    { name: 'TURKEY', lat: 39.0, lon: 35.2, size: 'country' },
    { name: 'GREECE', lat: 39.1, lon: 21.8, size: 'country' },
    { name: 'London', lat: 51.5, lon: -0.13, size: 'city' },
    { name: 'Paris', lat: 48.9, lon: 2.35, size: 'city' },
    { name: 'Berlin', lat: 52.5, lon: 13.4, size: 'city' },
    { name: 'Kyiv', lat: 50.4, lon: 30.5, size: 'city' },
    { name: 'Moscow', lat: 55.8, lon: 37.6, size: 'city' },

    // Russia & Central Asia
    { name: 'RUSSIA', lat: 60.0, lon: 100.0, size: 'country' },
    { name: 'KAZAKHSTAN', lat: 48.0, lon: 68.0, size: 'country' },
    { name: 'UZBEKISTAN', lat: 41.3, lon: 64.6, size: 'country' },

    // Middle East
    { name: 'IRAN', lat: 32.4, lon: 53.7, size: 'country' },
    { name: 'IRAQ', lat: 33.2, lon: 43.7, size: 'country' },
    { name: 'SYRIA', lat: 35.0, lon: 38.0, size: 'country' },
    { name: 'SAUDI ARABIA', lat: 23.9, lon: 45.1, size: 'country' },
    { name: 'ISRAEL', lat: 31.0, lon: 34.8, size: 'country' },
    { name: 'LEBANON', lat: 33.9, lon: 35.9, size: 'country' },
    { name: 'JORDAN', lat: 31.2, lon: 36.5, size: 'country' },
    { name: 'YEMEN', lat: 15.6, lon: 48.5, size: 'country' },
    { name: 'UAE', lat: 23.4, lon: 53.8, size: 'country' },
    { name: 'AFGHANISTAN', lat: 33.9, lon: 67.7, size: 'country' },
    { name: 'PAKISTAN', lat: 30.4, lon: 69.3, size: 'country' },
    { name: 'Tehran', lat: 35.7, lon: 51.4, size: 'city' },
    { name: 'Baghdad', lat: 33.3, lon: 44.4, size: 'city' },
    { name: 'Riyadh', lat: 24.7, lon: 46.7, size: 'city' },

    // East Asia
    { name: 'CHINA', lat: 35.9, lon: 104.2, size: 'country' },
    { name: 'JAPAN', lat: 36.2, lon: 138.3, size: 'country' },
    { name: 'SOUTH KOREA', lat: 36.5, lon: 127.8, size: 'country' },
    { name: 'NORTH KOREA', lat: 40.3, lon: 127.5, size: 'country' },
    { name: 'TAIWAN', lat: 23.7, lon: 121.0, size: 'country' },
    { name: 'INDIA', lat: 20.6, lon: 79.0, size: 'country' },
    { name: 'Beijing', lat: 39.9, lon: 116.4, size: 'city' },
    { name: 'Tokyo', lat: 35.7, lon: 139.7, size: 'city' },
    { name: 'Seoul', lat: 37.6, lon: 127.0, size: 'city' },
    { name: 'Taipei', lat: 25.0, lon: 121.6, size: 'city' },
    { name: 'New Delhi', lat: 28.6, lon: 77.2, size: 'city' },

    // Southeast Asia
    { name: 'VIETNAM', lat: 14.1, lon: 108.3, size: 'country' },
    { name: 'PHILIPPINES', lat: 12.9, lon: 121.8, size: 'country' },
    { name: 'INDONESIA', lat: -0.8, lon: 113.9, size: 'country' },
    { name: 'THAILAND', lat: 15.9, lon: 101.0, size: 'country' },
    { name: 'MYANMAR', lat: 19.3, lon: 96.7, size: 'country' },

    // Africa
    { name: 'EGYPT', lat: 26.8, lon: 30.8, size: 'country' },
    { name: 'LIBYA', lat: 26.3, lon: 17.2, size: 'country' },
    { name: 'SUDAN', lat: 12.8, lon: 30.2, size: 'country' },
    { name: 'ETHIOPIA', lat: 9.1, lon: 40.5, size: 'country' },
    { name: 'SOMALIA', lat: 5.2, lon: 46.2, size: 'country' },
    { name: 'NIGERIA', lat: 9.1, lon: 8.7, size: 'country' },
    { name: 'SOUTH AFRICA', lat: -30.6, lon: 22.9, size: 'country' },
    { name: 'KENYA', lat: -0.0, lon: 37.9, size: 'country' },
    { name: 'DR CONGO', lat: -4.0, lon: 21.8, size: 'country' },

    // South America
    { name: 'BRAZIL', lat: -14.2, lon: -51.9, size: 'country' },
    { name: 'ARGENTINA', lat: -38.4, lon: -63.6, size: 'country' },
    { name: 'COLOMBIA', lat: 4.6, lon: -74.3, size: 'country' },
    { name: 'VENEZUELA', lat: 6.4, lon: -66.6, size: 'country' },
    { name: 'PERU', lat: -9.2, lon: -75.0, size: 'country' },
    { name: 'CHILE', lat: -35.7, lon: -71.5, size: 'country' },

    // Oceania
    { name: 'AUSTRALIA', lat: -25.3, lon: 133.8, size: 'country' },
    { name: 'NEW ZEALAND', lat: -40.9, lon: 174.9, size: 'country' },

    // Strategic water bodies
    { name: 'ATLANTIC OCEAN', lat: 14.6, lon: -28.7, size: 'ocean' },
    { name: 'PACIFIC OCEAN', lat: 0.0, lon: -160.0, size: 'ocean' },
    { name: 'INDIAN OCEAN', lat: -20.0, lon: 80.0, size: 'ocean' },
    { name: 'ARCTIC OCEAN', lat: 82.0, lon: 0.0, size: 'ocean' },
    { name: 'MEDITERRANEAN SEA', lat: 35.0, lon: 18.0, size: 'ocean' },
    { name: 'SOUTH CHINA SEA', lat: 12.0, lon: 114.0, size: 'ocean' },
    { name: 'RED SEA', lat: 20.0, lon: 38.5, size: 'ocean' },
    { name: 'PERSIAN GULF', lat: 26.0, lon: 51.0, size: 'ocean' },
    { name: 'BLACK SEA', lat: 43.5, lon: 34.0, size: 'ocean' },
    { name: 'TAIWAN STRAIT', lat: 24.5, lon: 119.5, size: 'ocean' },
];

const STYLES = {
    country: {
        font: 'bold 14px JetBrains Mono',
        color: '#c0d0e0',
        outlineColor: '#000000',
        outlineWidth: 3,
        near: 5e5,
        far: 2e7,
    },
    city: {
        font: '11px JetBrains Mono',
        color: '#90a0b0',
        outlineColor: '#000000',
        outlineWidth: 2,
        near: 5e4,
        far: 4e6,
    },
    ocean: {
        font: 'italic 12px JetBrains Mono',
        color: '#4080b0',
        outlineColor: '#001020',
        outlineWidth: 2,
        near: 1e6,
        far: 3e7,
    },
};

export function initLabels(cesiumViewer) {
    viewer = cesiumViewer;
    createLabels();
}

function createLabels() {
    for (const label of LABELS) {
        const style = STYLES[label.size] || STYLES.city;

        const entity = viewer.entities.add({
            id: `label-${label.name}`,
            position: Cesium.Cartesian3.fromDegrees(label.lon, label.lat, 0),
            label: {
                text: label.name,
                font: style.font,
                fillColor: Cesium.Color.fromCssColorString(style.color),
                outlineColor: Cesium.Color.fromCssColorString(style.outlineColor),
                outlineWidth: style.outlineWidth,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                scaleByDistance: new Cesium.NearFarScalar(style.near, 1.0, style.far, 0.0),
                translucencyByDistance: new Cesium.NearFarScalar(style.near, 1.0, style.far, 0.0),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            show: labelsVisible,
        });

        // Dot for cities
        if (label.size === 'city') {
            entity.point = {
                pixelSize: 4,
                color: Cesium.Color.fromCssColorString('#90a0b0'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1,
                scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 3e6, 0.0),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            };
        }

        labelEntities.push(entity);
    }
}

export function toggleLabels() {
    labelsVisible = !labelsVisible;
    for (const entity of labelEntities) {
        entity.show = labelsVisible;
    }
    return labelsVisible;
}

export function getLabelsVisible() {
    return labelsVisible;
}

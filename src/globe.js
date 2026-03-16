/**
 * Globe — CesiumJS viewer initialization and configuration
 */
import * as Cesium from 'cesium';
import 'cesium/Build/CesiumUnminified/Widgets/widgets.css';

let viewer = null;

export function initGlobe() {
    const token = import.meta.env.VITE_CESIUM_TOKEN;
    if (token) {
        Cesium.Ion.defaultAccessToken = token;
    }

    viewer = new Cesium.Viewer('cesiumContainer', {
        // Disable all default UI
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        creditContainer: document.createElement('div'),

        // Terrain — only use world terrain if we have a token
        terrain: token
            ? Cesium.Terrain.fromWorldTerrain()
            : undefined,

        // CesiumJS creates a default starfield skybox when not specified

        // Performance
        requestRenderMode: false,
        maximumRenderTimeChange: Infinity,
        msaaSamples: 1,
    });

    // Scene settings
    const scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.globe.atmosphereLightIntensity = 10.0;
    scene.fog.enabled = true;
    scene.fog.density = 0.0003;
    scene.skyAtmosphere.show = true;

    // Dark ground color when no imagery
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0a1a');

    // Enable depth testing against terrain
    scene.globe.depthTestAgainstTerrain = true;

    // Start looking at Earth from space
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-40, 30, 20000000),
        orientation: {
            heading: 0,
            pitch: -Math.PI / 2,
            roll: 0,
        },
    });

    return viewer;
}

export function getViewer() {
    return viewer;
}

export function flyTo(lon, lat, height = 500000) {
    if (!viewer) return;
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        orientation: {
            heading: 0,
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
        },
        duration: 2.0,
    });
}

/**
 * Returns current camera position as { lat, lon, alt }
 */
export function getCameraPosition() {
    if (!viewer) return null;
    const pos = viewer.camera.positionCartographic;
    return {
        lat: Cesium.Math.toDegrees(pos.latitude).toFixed(4),
        lon: Cesium.Math.toDegrees(pos.longitude).toFixed(4),
        alt: (pos.height / 1000).toFixed(1) + ' km',
    };
}

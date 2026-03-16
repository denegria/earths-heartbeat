/**
 * Earth's Heartbeat — Main Entry Point
 *
 * Wires up the globe, data feeds, shaders, HUD, keyboard shortcuts,
 * reverse geocoding, compass, quick nav, and layer toggles.
 */
import { initGlobe, getViewer, getCameraPosition, flyTo } from './globe.js';
import { initFlights, getFlightCounts } from './feeds/flights.js';
import { initSatellites, getSatCount } from './feeds/satellites.js';
import { initConflicts, getEventCount } from './feeds/conflicts.js';
import { initNaturalEvents, getNaturalCount } from './feeds/naturalEvents.js';
import { initShips, getShipCount } from './feeds/ships.js';
import { initModes, setMode } from './modes.js';
import { initLabels, toggleLabels, getLabelsVisible } from './labels.js';
import * as Cesium from 'cesium';

// ──────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────

async function boot() {
  updateLoadingStatus('Initializing 3D globe…');
  const viewer = initGlobe();

  updateLoadingStatus('Loading terrain data…');
  await sleep(500);

  updateLoadingStatus('Starting visual modes…');
  initModes(viewer);

  updateLoadingStatus('Loading geographic labels…');
  initLabels(viewer);
  // Enable labels by default
  toggleLabels();
  document.querySelector('[data-layer="labels"]').classList.add('active');

  updateLoadingStatus('Connecting to flight feeds…');
  initFlights(viewer);

  updateLoadingStatus('Loading satellite orbits…');
  initSatellites(viewer);

  updateLoadingStatus('Fetching global events…');
  initConflicts(viewer);

  updateLoadingStatus('Loading natural events…');
  initNaturalEvents(viewer);

  updateLoadingStatus('Loading ship traffic…');
  initShips(viewer);

  // Set up HUD
  initClock();
  initCameraInfo(viewer);
  initLocationIndicator(viewer);
  initCompass(viewer);
  initStats();
  initSearch(viewer);
  initEntityClick(viewer);
  initTimeline();
  initQuickNav();
  initLayerToggles(viewer);
  initKeyboardShortcuts(viewer);
  initShortcutsHelp();

  // Dismiss loading screen
  await sleep(1200);
  const loadingScreen = document.getElementById('loadingScreen');
  loadingScreen.classList.add('fade-out');
  setTimeout(() => loadingScreen.remove(), 1000);

  // Show timeline toggle
  document.getElementById('timeline').classList.remove('hidden');

  console.log('[Earth\'s Heartbeat] ◉ All systems online');
}

// ──────────────────────────────────────────────
// HUD: UTC Clock
// ──────────────────────────────────────────────

function initClock() {
  const el = document.getElementById('utcTime');
  function update() {
    const now = new Date();
    const utc = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    el.textContent = utc;
  }
  update();
  setInterval(update, 1000);
}

// ──────────────────────────────────────────────
// HUD: Camera Position
// ──────────────────────────────────────────────

function initCameraInfo(viewer) {
  const latEl = document.getElementById('camLat');
  const lonEl = document.getElementById('camLon');
  const altEl = document.getElementById('camAlt');

  viewer.scene.postRender.addEventListener(() => {
    const pos = getCameraPosition();
    if (pos) {
      latEl.textContent = `LAT ${pos.lat}°`;
      lonEl.textContent = `LON ${pos.lon}°`;
      altEl.textContent = `ALT ${pos.alt}`;
    }
  });
}

// ──────────────────────────────────────────────
// HUD: Location Indicator (reverse geocode)
// ──────────────────────────────────────────────

function initLocationIndicator(viewer) {
  const nameEl = document.getElementById('locationName');
  let lastLat = null;
  let lastLon = null;
  let fetching = false;

  // Update location every 3 seconds when camera moves
  setInterval(async () => {
    const pos = getCameraPosition();
    if (!pos || fetching) return;

    const lat = parseFloat(pos.lat);
    const lon = parseFloat(pos.lon);

    // Only update if moved significantly
    if (lastLat !== null && Math.abs(lat - lastLat) < 0.5 && Math.abs(lon - lastLon) < 0.5) return;

    lastLat = lat;
    lastLon = lon;
    fetching = true;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();

      if (data.address) {
        const parts = [];
        if (data.address.state || data.address.region) parts.push(data.address.state || data.address.region);
        if (data.address.country) parts.push(data.address.country);
        nameEl.textContent = parts.length ? parts.join(', ') : data.display_name?.split(',').slice(-2).join(',').trim() || '—';
      } else {
        // Over ocean
        nameEl.textContent = getOceanName(lat, lon);
      }
    } catch {
      nameEl.textContent = getOceanName(lat, lon);
    }
    fetching = false;
  }, 3000);
}

function getOceanName(lat, lon) {
  if (lat > 60) return 'Arctic Region';
  if (lat < -60) return 'Antarctic Region';
  if (lon > -80 && lon < 0 && lat > 0 && lat < 60) return 'North Atlantic Ocean';
  if (lon > -80 && lon < 20 && lat < 0) return 'South Atlantic Ocean';
  if (lon > 20 && lon < 100) return 'Indian Ocean';
  if ((lon > 100 || lon < -80) && lat > 0) return 'North Pacific Ocean';
  if ((lon > 100 || lon < -80) && lat < 0) return 'South Pacific Ocean';
  return 'Open Ocean';
}

// ──────────────────────────────────────────────
// HUD: Compass
// ──────────────────────────────────────────────

function initCompass(viewer) {
  const arrow = document.getElementById('compassArrow');

  viewer.scene.postRender.addEventListener(() => {
    const heading = Cesium.Math.toDegrees(viewer.camera.heading);
    arrow.style.transform = `rotate(${heading}deg)`;
  });
}

// ──────────────────────────────────────────────
// HUD: Stats
// ──────────────────────────────────────────────

function initStats() {
  const flightEl = document.getElementById('flightCount');
  const milEl = document.getElementById('militaryCount');
  const satEl = document.getElementById('satCount');
  const evtEl = document.getElementById('eventCount');
  const shipEl = document.getElementById('shipCount');
  const natEl = document.getElementById('naturalCount');

  setInterval(() => {
    const counts = getFlightCounts();
    flightEl.textContent = counts.total.toLocaleString();
    milEl.textContent = counts.military.toLocaleString();
    satEl.textContent = getSatCount().toLocaleString();
    evtEl.textContent = getEventCount().toLocaleString();
    shipEl.textContent = getShipCount().toLocaleString();
    natEl.textContent = getNaturalCount().toLocaleString();

    // Color code military count
    milEl.style.color = counts.military > 50 ? '#ff3b3b' : counts.military > 20 ? '#ff9500' : '#00d4ff';
  }, 2000);
}

// ──────────────────────────────────────────────
// HUD: Search
// ──────────────────────────────────────────────

function initSearch() {
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  let debounce = null;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const query = input.value.trim();
    if (query.length < 3) {
      results.classList.add('hidden');
      return;
    }
    debounce = setTimeout(() => searchLocation(query), 400);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      results.classList.add('hidden');
      input.blur();
    }
  });

  async function searchLocation(query) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();

      if (!data.length) {
        results.classList.add('hidden');
        return;
      }

      results.innerHTML = '';
      results.classList.remove('hidden');

      for (const place of data) {
        const div = document.createElement('div');
        div.className = 'search-result';
        div.textContent = place.display_name;
        div.addEventListener('click', () => {
          flyTo(parseFloat(place.lon), parseFloat(place.lat), 100000);
          input.value = place.display_name;
          results.classList.add('hidden');
        });
        results.appendChild(div);
      }
    } catch (e) {
      console.warn('[Search] Error:', e.message);
    }
  }
}

// ──────────────────────────────────────────────
// Entity Click → Info Panel
// ──────────────────────────────────────────────

function initEntityClick(viewer) {
  const panel = document.getElementById('infoPanel');
  const panelTitle = document.getElementById('panelTitle');
  const panelContent = document.getElementById('panelContent');
  const panelClose = document.getElementById('panelClose');

  panelClose.addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    if (!picked || !picked.id) {
      panel.classList.add('hidden');
      return;
    }

    const entity = picked.id;
    const props = entity.properties;
    if (!props) return;

    const type = props.type?.getValue();
    const typeMap = {
      civilian: '✈ AIRCRAFT',
      military: '⚠ MILITARY AIRCRAFT',
      satellite: '🛰 SATELLITE',
      event: '📡 CONFLICT EVENT',
      natural: '🌍 NATURAL EVENT',
    };

    if (typeMap[type]) {
      panelTitle.textContent = typeMap[type];
      panelContent.innerHTML = entity.description?.getValue() || '';
      panel.classList.remove('hidden');
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// ──────────────────────────────────────────────
// Quick Nav — Hotspot Buttons
// ──────────────────────────────────────────────

function initQuickNav() {
  const buttons = document.querySelectorAll('.qnav-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lon = parseFloat(btn.dataset.lon);
      const lat = parseFloat(btn.dataset.lat);
      const alt = parseFloat(btn.dataset.alt);
      flyTo(lon, lat, alt);
    });
  });
}

// ──────────────────────────────────────────────
// Layer Toggles
// ──────────────────────────────────────────────

function initLayerToggles(viewer) {
  const buttons = document.querySelectorAll('.layer-btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const layer = btn.dataset.layer;
      btn.classList.toggle('active');
      const visible = btn.classList.contains('active');

      if (layer === 'labels') {
        toggleLabels();
      } else {
        toggleEntityLayer(viewer, layer, visible);
      }
    });
  });
}

function toggleEntityLayer(viewer, layerType, visible) {
  const prefixMap = {
    flights: 'flight-',
    military: 'mil-',
    satellites: 'sat-',
    ships: 'ship-',
    events: 'evt-',
  };

  const prefix = prefixMap[layerType];
  if (!prefix) return;

  for (let i = 0; i < viewer.entities.values.length; i++) {
    const entity = viewer.entities.values[i];
    if (entity.id?.startsWith(prefix)) {
      entity.show = visible;
    }
  }
}

// ──────────────────────────────────────────────
// Keyboard Shortcuts
// ──────────────────────────────────────────────

function initKeyboardShortcuts(viewer) {
  const modeButtons = document.querySelectorAll('.mode-btn');
  const shortcutsPanel = document.getElementById('shortcutsHelp');

  document.addEventListener('keydown', (e) => {
    // Don't capture when typing in search
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case '1':
        activateMode('normal', modeButtons);
        break;
      case '2':
        activateMode('nvg', modeButtons);
        break;
      case '3':
        activateMode('flir', modeButtons);
        break;
      case '4':
        activateMode('crt', modeButtons);
        break;
      case '/':
        e.preventDefault();
        document.getElementById('searchInput').focus();
        break;
      case 'l':
      case 'L':
        toggleLabels();
        document.querySelector('[data-layer="labels"]').classList.toggle('active');
        break;
      case 'f':
      case 'F':
        toggleLayerByKey(viewer, 'flights');
        break;
      case 'm':
      case 'M':
        toggleLayerByKey(viewer, 'military');
        break;
      case 's':
      case 'S':
        toggleLayerByKey(viewer, 'satellites');
        break;
      case 'h':
      case 'H':
        flyTo(-40, 30, 20000000);
        break;
      case '?':
        shortcutsPanel.classList.toggle('hidden');
        break;
      case 'Escape':
        document.getElementById('infoPanel').classList.add('hidden');
        shortcutsPanel.classList.add('hidden');
        document.getElementById('searchInput').blur();
        break;
    }
  });
}

function activateMode(mode, buttons) {
  setMode(mode);
  buttons.forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

function toggleLayerByKey(viewer, layer) {
  const btn = document.querySelector(`[data-layer="${layer}"]`);
  if (btn) {
    btn.classList.toggle('active');
    toggleEntityLayer(viewer, layer, btn.classList.contains('active'));
  }
}

// ──────────────────────────────────────────────
// Shortcuts Help Panel
// ──────────────────────────────────────────────

function initShortcutsHelp() {
  const closeBtn = document.getElementById('shortcutsClose');
  const panel = document.getElementById('shortcutsHelp');
  closeBtn.addEventListener('click', () => panel.classList.add('hidden'));
}

// ──────────────────────────────────────────────
// Timeline Replay
// ──────────────────────────────────────────────

function initTimeline() {
  const toggle = document.getElementById('timelineToggle');
  const controls = document.getElementById('timelineControls');

  toggle.addEventListener('click', () => {
    controls.classList.toggle('hidden');
    toggle.textContent = controls.classList.contains('hidden') ? '▶ REPLAY' : '✕ CLOSE';
  });

  const jumpLive = document.getElementById('jumpLive');
  const timeSlider = document.getElementById('timeSlider');
  const timeLabel = document.getElementById('timeLabel');

  timeSlider.addEventListener('input', () => {
    const minutes = parseInt(timeSlider.value);
    if (minutes >= 1440) {
      timeLabel.textContent = 'LIVE';
      timeLabel.style.color = '#00ff88';
    } else {
      const hoursAgo = ((1440 - minutes) / 60).toFixed(1);
      timeLabel.textContent = `-${hoursAgo}h`;
      timeLabel.style.color = '#ff9500';
    }
  });

  jumpLive.addEventListener('click', () => {
    timeSlider.value = 1440;
    timeLabel.textContent = 'LIVE';
    timeLabel.style.color = '#00ff88';
  });
}

// ──────────────────────────────────────────────
// Alerts
// ──────────────────────────────────────────────

export function showAlert(title, subtitle, type = 'info', onClick = null) {
  const container = document.getElementById('alertsContainer');
  const toast = document.createElement('div');
  toast.className = `alert-toast ${type}`;
  toast.innerHTML = `
    <span class="alert-icon">${type === 'threat' ? '⚠' : type === 'warning' ? '⚡' : 'ℹ'}</span>
    <div class="alert-body">
      <div class="alert-title">${title}</div>
      <div class="alert-sub">${subtitle}</div>
    </div>
  `;

  if (onClick) toast.addEventListener('click', onClick);

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function updateLoadingStatus(text) {
  const el = document.getElementById('loadingStatus');
  if (el) el.textContent = text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────

boot().catch((err) => {
  console.error('[Earth\'s Heartbeat] Boot failed:', err);
  updateLoadingStatus(`Error: ${err.message}`);
});

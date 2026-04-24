/* ─── Cemetery Sprawl — Chicago Interactive Map ──────────────────────────── */

// Map init centered on Chicago
const map = L.map('map', {
  center: [41.84, -87.70],
  zoom: 11,
  zoomControl: true,
  preferCanvas: true,
});

// Base tile layer (CartoDB Dark)
L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }
).addTo(map);

/* ── Layer references ────────────────────────────────────── */
let cemeteryLayer = null;
let transitLayer  = null;
let raceLayer     = null;
let communityLayer= null;

/* ── Color helpers ───────────────────────────────────────── */
function raceColor(pct) {
  if (pct == null) return '#1e2535';
  if (pct < 10)  return '#f0f4f8';
  if (pct < 30)  return '#a8c8e8';
  if (pct < 50)  return '#5a9fd4';
  if (pct < 70)  return '#1d6fa4';
  return '#0a3d62';
}

function raceTextColor(pct) {
  if (pct == null || pct < 30) return '#111';
  return '#fff';
}

/* ── Format helpers ──────────────────────────────────────── */
function fmt(n, decimals = 0) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals });
}

/* ── Update info panel ───────────────────────────────────── */
function showCemeteryInfo(props) {
  const div = document.getElementById('info-content');
  const name = props.name || 'Unnamed Cemetery';
  const acres = fmt(props.area_acres, 1);
  const units = fmt(props.est_housing_units);
  const km    = props.dist_to_cta_km != null ? props.dist_to_cta_km + ' km' : '—';
  const near  = props.near_transit
    ? '<span class="transit-badge badge-yes">Within 800m</span>'
    : '<span class="transit-badge badge-no">Over 800m</span>';

  div.innerHTML = `
    <div class="info-name">${name}</div>
    <div class="info-row"><span class="lbl">Area</span><span class="val">${acres} acres</span></div>
    <div class="info-row"><span class="lbl">Est. Housing Units*</span><span class="val">${units}</span></div>
    <div class="info-row"><span class="lbl">Nearest CTA Rail</span><span class="val">${km}</span></div>
    <div class="info-row"><span class="lbl">Near Transit (&lt;800m)</span><span class="val">${near}</span></div>
  `;
}

/* ── Aggregate stats ─────────────────────────────────────── */
function updateStats(features) {
  const count  = features.length;
  const acres  = features.reduce((s, f) => s + (f.properties.area_acres || 0), 0);
  const units  = features.reduce((s, f) => s + (f.properties.est_housing_units || 0), 0);
  const near   = features.filter(f => f.properties.near_transit).length;

  document.getElementById('stat-count').textContent  = count;
  document.getElementById('stat-acres').textContent  = fmt(acres, 0);
  document.getElementById('stat-units').textContent  = fmt(units);
  document.getElementById('stat-transit').textContent = near + ' of ' + count;
}

/* ── Load Census Racial Composition ─────────────────────── */
// The tract geometries and the race stats live in separate files
// (census_tracts.geojson + census_race.csv) and must be joined by GEOID
// before the choropleth has anything to color.
Promise.all([
  fetch('data/census_tracts.geojson').then(r => r.json()),
  fetch('data/census_race.csv').then(r => r.text()),
])
  .then(([geo, csv]) => {
    const lines = csv.trim().split(/\r?\n/);
    const header = lines.shift().split(',');
    const idx = {
      GEOID: header.indexOf('GEOID'),
      total_pop: header.indexOf('total_pop'),
      pct_white: header.indexOf('pct_white'),
      pct_black: header.indexOf('pct_black'),
      pct_hispanic: header.indexOf('pct_hispanic'),
    };
    const byGeoid = new Map();
    for (const line of lines) {
      const cols = line.split(',');
      const geoid = cols[idx.GEOID];
      if (!geoid) continue;
      const num = i => {
        const v = parseFloat(cols[i]);
        return Number.isFinite(v) ? v : null;
      };
      byGeoid.set(geoid, {
        total_pop: num(idx.total_pop),
        pct_white: num(idx.pct_white),
        pct_black: num(idx.pct_black),
        pct_hispanic: num(idx.pct_hispanic),
      });
    }

    for (const f of geo.features) {
      const stats = byGeoid.get(f.properties.GEOID);
      if (stats) Object.assign(f.properties, stats);
    }

    raceLayer = L.geoJSON(geo, {
      style: feature => ({
        fillColor: raceColor(feature.properties.pct_black),
        fillOpacity: 0.55,
        color: '#2a3345',
        weight: 0.4,
      }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindTooltip(
          `<b>${p.NAME || 'Tract'}</b><br>
           Black: ${fmt(p.pct_black, 1)}%<br>
           White: ${fmt(p.pct_white, 1)}%<br>
           Hispanic: ${fmt(p.pct_hispanic, 1)}%<br>
           Population: ${fmt(p.total_pop)}`,
          { sticky: true, className: 'tract-tooltip' }
        );
      },
    }).addTo(map);
    raceLayer.bringToBack();
    if (cemeteryLayer) cemeteryLayer.bringToFront();
    document.getElementById('legend').classList.add('visible');
  })
  .catch(e => console.warn('Census tracts not loaded:', e));

/* ── Load Community Areas ────────────────────────────────── */
fetch('data/community_areas.geojson')
  .then(r => r.json())
  .then(data => {
    communityLayer = L.geoJSON(data, {
      style: {
        color: '#8a93a8',
        weight: 1.5,
        fillOpacity: 0,
        dashArray: '4 4',
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.community || feature.properties.COMMUNITY || '';
        if (name) layer.bindTooltip(name, { sticky: true });
      },
    });
  })
  .catch(e => console.warn('Community areas not loaded:', e));

/* ── Load CTA Stations ───────────────────────────────────── */
fetch('data/cta_stations.geojson')
  .then(r => r.json())
  .then(data => {
    const icon = L.circleMarker([0,0], { radius: 4, color: '#e63946', fillColor: '#e63946', fillOpacity: 0.9, weight: 1.5 });
    transitLayer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 4,
          color: '#e63946',
          fillColor: '#ff6b6b',
          fillOpacity: 0.9,
          weight: 1.5,
        }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const name = p.station_name || p.STATION_NAME || p.name || 'CTA Station';
        layer.bindTooltip(`<b>${name}</b><br>CTA Rail Station`, { sticky: true });
      },
    });
  })
  .catch(e => console.warn('CTA stations not loaded:', e));

/* ── Load Cemeteries ─────────────────────────────────────── */
// Keep a handle to each cemetery's Leaflet sublayer so the sidebar's
// Largest-Cemeteries list can pan/zoom/highlight a specific feature.
const cemeterySublayers = [];

function focusCemetery(sublayer) {
  if (!sublayer) return;
  const bounds = sublayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
  showCemeteryInfo(sublayer.feature.properties);
  sublayer.openTooltip && sublayer.openTooltip();
}

function renderTopCemeteries(features) {
  const list = document.getElementById('top-cemeteries-list');
  if (!list) return;
  const top = features
    .map((f, i) => ({ f, i, acres: f.properties.area_acres || 0 }))
    .sort((a, b) => b.acres - a.acres)
    .slice(0, 10);

  list.innerHTML = '';
  for (const { f, i, acres } of top) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="cem-name">${f.properties.name || 'Unnamed Cemetery'}</span>
      <span class="cem-acres">${fmt(acres, 1)} ac</span>
    `;
    li.addEventListener('click', () => focusCemetery(cemeterySublayers[i]));
    list.appendChild(li);
  }
}

fetch('data/cemeteries.geojson')
  .then(r => r.json())
  .then(data => {
    const features = data.features || [];
    updateStats(features);

    cemeteryLayer = L.geoJSON(data, {
      style: feature => {
        const acres = feature.properties.area_acres || 0;
        // Bigger parcels look more solid; floor keeps small ones legible on the dark basemap.
        const opacity = Math.min(0.95, 0.75 + acres / 600);
        return {
          fillColor: '#74c69d',
          fillOpacity: opacity,
          color: '#b7e4c7',
          weight: 1.4,
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const name = p.name || 'Unnamed Cemetery';
        layer.bindTooltip(`<b>${name}</b><br>${fmt(p.area_acres, 1)} acres`, { sticky: true });
        layer.on('click', () => showCemeteryInfo(p));
        // Match sublayer order to feature order so the top-N list can index into it.
        cemeterySublayers.push(layer);
      },
    }).addTo(map);

    renderTopCemeteries(features);

    // Fit to cemetery bounds on load
    if (features.length) {
      map.fitBounds(cemeteryLayer.getBounds(), { padding: [40, 40] });
    }
  })
  .catch(e => console.error('Cemeteries not loaded:', e));

/* ── HOLC Layer (optional, if user provides file) ────────── */
fetch('data/holc_chicago.geojson')
  .then(r => {
    if (!r.ok) throw new Error('HOLC file not found');
    return r.json();
  })
  .then(data => {
    const gradeColors = { A: '#76c893', B: '#457b9d', C: '#f4a261', D: '#e63946' };
    const holcLayer = L.geoJSON(data, {
      style: feature => {
        const grade = (feature.properties.holc_grade || feature.properties.grade || '').toUpperCase();
        return {
          fillColor: gradeColors[grade] || '#aaa',
          fillOpacity: 0.35,
          color: gradeColors[grade] || '#aaa',
          weight: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const grade = p.holc_grade || p.grade || '?';
        const gradeNames = { A: 'Best', B: 'Still Desirable', C: 'Declining', D: 'Hazardous' };
        layer.bindTooltip(`<b>HOLC Grade ${grade}</b><br>${gradeNames[grade.toUpperCase()] || ''}`, { sticky: true });
      },
    });

    // Add HOLC toggle button dynamically
    const controls = document.getElementById('layer-controls');
    const label = document.createElement('label');
    label.className = 'layer-toggle';
    label.id = 'toggle-holc';
    label.innerHTML = `
      <span class="swatch" style="background: linear-gradient(90deg,#76c893 25%,#457b9d 25%,#457b9d 50%,#f4a261 50%,#f4a261 75%,#e63946 75%);"></span>
      <input type="checkbox" id="cb-holc" /> HOLC Redlining Grades
    `;
    controls.appendChild(label);
    label.addEventListener('click', () => {
      const cb = document.getElementById('cb-holc');
      cb.checked = !cb.checked;
      if (cb.checked) { holcLayer.addTo(map); label.classList.add('active'); }
      else            { map.removeLayer(holcLayer); label.classList.remove('active'); }
    });

    console.log('HOLC layer loaded');
  })
  .catch(() => {
    // HOLC file not present — silently skip (note shown in sidebar)
  });

/* ── Layer toggle handlers ───────────────────────────────── */
function setupToggle(cbId, labelId, getLayer, addedByDefault = false) {
  let added = addedByDefault;
  document.getElementById(labelId).addEventListener('click', () => {
    const cb = document.getElementById(cbId);
    cb.checked = !cb.checked;
    const layer = getLayer();
    if (!layer) return;
    if (cb.checked) {
      layer.addTo(map);
      document.getElementById(labelId).classList.add('active');
    } else {
      map.removeLayer(layer);
      document.getElementById(labelId).classList.remove('active');
    }
  });
}

// Cemetery toggle (added by default)
document.getElementById('toggle-cemeteries').addEventListener('click', () => {
  const cb = document.getElementById('cb-cemeteries');
  cb.checked = !cb.checked;
  if (!cemeteryLayer) return;
  if (cb.checked) { cemeteryLayer.addTo(map); document.getElementById('toggle-cemeteries').classList.add('active'); }
  else            { map.removeLayer(cemeteryLayer); document.getElementById('toggle-cemeteries').classList.remove('active'); }
});

document.getElementById('toggle-transit').addEventListener('click', () => {
  const cb = document.getElementById('cb-transit');
  cb.checked = !cb.checked;
  if (!transitLayer) return;
  if (cb.checked) { transitLayer.addTo(map); document.getElementById('toggle-transit').classList.add('active'); }
  else            { map.removeLayer(transitLayer); document.getElementById('toggle-transit').classList.remove('active'); }
});

document.getElementById('toggle-race').addEventListener('click', () => {
  const cb = document.getElementById('cb-race');
  cb.checked = !cb.checked;
  if (!raceLayer) return;
  if (cb.checked) {
    raceLayer.addTo(map);
    raceLayer.bringToBack();
    if (cemeteryLayer) cemeteryLayer.bringToFront();
    document.getElementById('toggle-race').classList.add('active');
    document.getElementById('legend').classList.add('visible');
  } else {
    map.removeLayer(raceLayer);
    document.getElementById('toggle-race').classList.remove('active');
    document.getElementById('legend').classList.remove('visible');
  }
});

document.getElementById('toggle-community').addEventListener('click', () => {
  const cb = document.getElementById('cb-community');
  cb.checked = !cb.checked;
  if (!communityLayer) return;
  if (cb.checked) { communityLayer.addTo(map); document.getElementById('toggle-community').classList.add('active'); }
  else            { map.removeLayer(communityLayer); document.getElementById('toggle-community').classList.remove('active'); }
});

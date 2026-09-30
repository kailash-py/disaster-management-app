/**
 * SANKATMOCHAN — Application Controller & GIS Map Coordinator
 * SIH 2026 Problem Statement SIH26191
 *
 * Implements complete reactive functionality for:
 * 1. Role-based Routing (Resident vs Authority Command Center)
 * 2. Dynamic Leaflet GIS Map with Layer Toggles and Timeline Scrubbing
 * 3. 10-Step Deterministic Relocation Mission Generation
 * 4. Multi-Site Carrying Capacity Allocation
 * 5. Time-Feasible Route Comparison (R1 vs R2)
 * 6. Scenario Lab What-If Simulator with Live Recomputation
 * 7. All-Roads-Blocked Failure Mode & Emergency Helicopter Assessment
 * 8. Rapid Drone Verification Workflow
 * 9. Authority Department Action Workflow (Requested -> Assigned -> In Progress -> Completed)
 * 10. Live Headcount Progress Tracker & Automated 30s Demo Stepper
 * 11. Zero Dead Buttons — Complete User Interaction
 */

// Global Application Reactive State
const APP_STATE = {
  currentRole: "authority", // "authority" | "ndrf" | "resident"
  currentView: "command-center", // "command-center" | "habitations" | "red-zones" | "relocation" | "safe-sites" | "routes" | "aerial-verification" | "ndrf" | "alerts" | "scenario-lab" | "status" | "methodology"

  // Active Village Selection
  activeVillageId: "VIL-01",

  // Relocation Plan State
  planStatus: "DRAFT", // "DRAFT" | "GENERATED" | "ACKNOWLEDGED" | "APPROVED" | "EXECUTING" | "COMPLETED"
  activePlan: null,
  isPlanAModified: false,
  planAChoice: "PLAN_A", // "PLAN_A" | "PLAN_B"

  // Route Timeline Scrubbing (T0, T4, T8, T10, T12, T18)
  activeTimeline: "T0",

  // Scenario Lab Simulation Parameters
  simulations: {
    rainfallLevel: 140, // mm
    relocationWindowHours: 18,
    r1Blocked: false,
    r2Blocked: false,
    siteAUnavailable: false,
    capacityReduced: false,
    allRoadsBlocked: false,
    weatherRiskImpact: false
  },

  // Live Relocation Headcount Execution State
  liveRelocation: {
    totalPlanned: 1800,
    moved: 1240,
    inTransit: 420,
    arrived: 820,
    remaining: 560,
    stageIndex: 2, // 0: Plan, 1: Approved, 2: Moving, 3: Safe
    isAutoRunning: false,
    autoTimer: null
  },

  // Authority Alert State
  authorityAlertStatus: "PENDING_REVIEW", // "PENDING_REVIEW" | "ACKNOWLEDGED" | "APPROVED"

  // Network and Alert Provider State
  networkMode: "NORMAL", // "NORMAL" | "DEGRADED" | "CELLULAR_OUTAGE"
  offlineQueue: [],

  // Real-Time Open-Meteo Weather State
  weather: {
    isDemoMode: false,
    cache: {},
    current: null,
    riskSignal: "NORMAL",
    lastUpdated: null,
    isAvailable: true,
    deteriorationDetected: false
  },

  // Automated 30s Demo Sequence State
  demoMode: {
    isRunning: false,
    currentStepIndex: 0,
    timer: null,
    secondsElapsed: 0
  },

  // Layer Toggles
  layers: {
    villages: true,
    redZones: true,
    safeSites: true,
    routes: true,
    hazardPolygon: true
  }
};

// Leaflet Map Reference
let gMap = null;
let gLayerGroups = {
  villages: null,
  redZones: null,
  safeSites: null,
  routes: null,
  hazardPolygon: null
};

// DOM Content Loaded Handler
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Map
  initLeafletMap();

  // 2. Generate initial plan for Village A
  APP_STATE.activePlan = RakshaEngine.generateRelocationMission(APP_STATE.activeVillageId, APP_STATE.simulations);

  // 3. Render all views and components
  renderTopMetrics();
  renderResponsePriorities();
  renderShelterReadiness();
  renderScenarioSnapshot();
  renderHabitationsTable();
  renderAuthorityAlertsView();
  renderSafeSitesView();
  renderRoutesView();
  renderRelocationStatusView();
  renderEmergencyAccessView();
  renderAerialVerificationView();
  renderNdrfResponseView();
  renderResidentDashboard();

  // 4. Initialize Live Weather API for active village
  if (typeof RakshaWeather !== "undefined") {
    RakshaWeather.initWeather(APP_STATE.activeVillageId);
  }

  // 5. Bind events
  bindGlobalEvents();

  console.log("SANKATMOCHAN: System initialized successfully. Role:", APP_STATE.currentRole);
});

/* ==========================================================================
   1. MAP INITIALIZATION & GIS LAYERS
   ========================================================================== */
function initLeafletMap() {
  const mapEl = document.getElementById("gis-map");
  if (!mapEl || typeof L === "undefined") return;

  gMap = L.map("gis-map", {
    center: RAKSHA_DATA.mapConfig.center,
    zoom: RAKSHA_DATA.mapConfig.defaultZoom,
    zoomControl: false,
    minZoom: RAKSHA_DATA.mapConfig.minZoom,
    maxZoom: RAKSHA_DATA.mapConfig.maxZoom
  });

  const apiKey = localStorage.getItem('cartoApiKey') || '';
  const apiKeyParam = apiKey ? `?api_key=${apiKey}` : '';

  // CartoDB Voyager Map (Clean, high-legibility topography)
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${apiKeyParam}`, {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | SIH 2026 Chamoli Pilot',
    maxZoom: 18,
    subdomains: "abcd"
  }).addTo(gMap);

  L.control.zoom({ position: "bottomright" }).addTo(gMap);

  // Initialize Layer Groups
  gLayerGroups.villages = L.layerGroup().addTo(gMap);
  gLayerGroups.redZones = L.layerGroup().addTo(gMap);
  gLayerGroups.safeSites = L.layerGroup().addTo(gMap);
  gLayerGroups.routes = L.layerGroup().addTo(gMap);
  gLayerGroups.hazardPolygon = L.layerGroup().addTo(gMap);

  renderMapLayers();
}

/**
 * Render/Refresh all Map Layers dynamically
 */
function renderMapLayers() {
  if (!gMap) return;

  // Clear existing
  Object.values(gLayerGroups).forEach(group => group.clearLayers());

  const currentTimeline = RAKSHA_DATA.timelineStates[APP_STATE.activeTimeline] || RAKSHA_DATA.timelineStates["T0"];

  // 1. Hazard Red Zone Inundation Polygons (Alaknanda riverbed corridor)
  if (APP_STATE.layers.redZones) {
    const redZonePolygon = [
      [30.495, 79.595],
      [30.505, 79.570],
      [30.490, 79.540],
      [30.470, 79.500],
      [30.450, 79.460],
      [30.435, 79.420],
      [30.445, 79.410],
      [30.465, 79.450],
      [30.485, 79.510],
      [30.510, 79.550],
      [30.515, 79.585]
    ];

    L.polygon(redZonePolygon, {
      color: "#dc2626",
      fillColor: "#ef4444",
      fillOpacity: 0.22,
      weight: 2,
      dashArray: "6, 6"
    }).bindPopup(`
      <div class="map-popup-custom">
        <h4 style="color:#dc2626; margin-bottom:4px;">⚠️ High Hazard Red Zone</h4>
        <p style="font-size:11px; margin:0 0 6px 0;">Alaknanda River Catchment Surge Buffer</p>
        <div style="font-size:11px; color:#475569;">
          <div>• River Stage: +2.1m surge</div>
          <div>• Slopes: Collapsible scree (91% saturation)</div>
          <div>• Protocol: Relocation mandatory for low terraces</div>
        </div>
      </div>
    `).addTo(gLayerGroups.redZones);
  }

  // 2. Road Network Lines with dynamic Timeline styling
  if (APP_STATE.layers.routes) {
    RAKSHA_DATA.routes.forEach(route => {
      let strokeColor = "#16a34a"; // Green (Open)
      let dashArray = null;
      let weight = 4;
      let statusLabel = "OPEN";

      // Timeline logic
      if (route.code === "R1") {
        if (currentTimeline.r1Status === "AT RISK" || APP_STATE.simulations.r1Blocked) {
          strokeColor = APP_STATE.simulations.r1Blocked ? "#dc2626" : "#ea580c";
          statusLabel = APP_STATE.simulations.r1Blocked ? "BLOCKED" : "AT RISK";
          if (APP_STATE.simulations.r1Blocked) dashArray = "8, 6";
        } else if (currentTimeline.r1Status === "HIGH RISK") {
          strokeColor = "#dc2626";
          statusLabel = "HIGH CLOSURE RISK";
        } else if (currentTimeline.r1Status === "BLOCKED") {
          strokeColor = "#991b1b";
          dashArray = "6, 8";
          weight = 5;
          statusLabel = "BLOCKED";
        }
      } else if (route.code === "R2") {
        if (APP_STATE.simulations.r2Blocked) {
          strokeColor = "#dc2626";
          dashArray = "8, 6";
          statusLabel = "BLOCKED";
        } else {
          // Recommended Route is highlighted Blue with glow
          strokeColor = "#2563eb";
          weight = 6;
          statusLabel = "RECOMMENDED ROUTE (FEASIBLE)";
        }
      } else if (route.code === "R4") {
        if (currentTimeline.r4Status === "BLOCKED") {
          strokeColor = "#991b1b";
          dashArray = "4, 6";
          statusLabel = "BLOCKED";
        } else {
          strokeColor = "#dc2626";
          statusLabel = "HIGH CLOSURE RISK";
        }
      } else if (route.code === "R3") {
        strokeColor = "#059669"; // Green backup
        statusLabel = "OPEN (PLAN B CONTINGENCY)";
      }

      if (APP_STATE.simulations.allRoadsBlocked) {
        strokeColor = "#7f1d1d";
        dashArray = "6, 6";
        statusLabel = "ALL ROADS BLOCKED";
      }

      const polyline = L.polyline(route.coordinates, {
        color: strokeColor,
        weight: weight,
        opacity: 0.9,
        dashArray: dashArray
      }).addTo(gLayerGroups.routes);

      polyline.bindPopup(`
        <div class="map-popup-custom">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:${strokeColor}; font-size:13px;">${route.code} — ${route.name}</strong>
            <span class="badge-status ${statusLabel.includes('OPEN') ? 'badge-green' : (statusLabel.includes('RECOMMENDED') ? 'badge-blue' : 'badge-red')}">${statusLabel}</span>
          </div>
          <div style="font-size:11px; color:#475569; display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
            <div><strong>Distance:</strong> ${route.distanceKm} km</div>
            <div><strong>Est. Time:</strong> ${route.travelTimeMin} min</div>
            <div><strong>Closure Window:</strong> ${route.estimatedClosureWindowHours}h</div>
            <div><strong>Time Feasible:</strong> ${route.isTimeFeasibleForVillageA ? '✅ YES' : '❌ NO'}</div>
          </div>
          <p style="font-size:11px; margin:0 0 6px 0; background:#f1f5f9; padding:4px 6px; border-radius:4px;">
            ${route.reason}
          </p>
          <button class="btn-sm btn-primary-blue" onclick="switchView('routes'); selectRoute('${route.code}')">View Full Route Details</button>
        </div>
      `);
    });
  }

  // 3. Safe Sites (Purple shelter icons)
  if (APP_STATE.layers.safeSites) {
    RAKSHA_DATA.safeSites.forEach(site => {
      const isSiteAUnavailable = APP_STATE.simulations.siteAUnavailable && site.code === "A";
      const markerColor = isSiteAUnavailable ? "#64748b" : "#9333ea";
      const statusText = isSiteAUnavailable ? "UNAVAILABLE (FLOODED)" : site.readiness;

      const shelterIcon = L.divIcon({
        className: "custom-leaflet-icon",
        html: `
          <div class="shelter-map-pin ${isSiteAUnavailable ? 'disabled' : ''}" style="background-color:${markerColor};" title="${site.name}">
            <span>⛺</span>
            <span class="pin-badge">${site.code}</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32]
      });

      const marker = L.marker(site.coords, { icon: shelterIcon }).addTo(gLayerGroups.safeSites);

      marker.bindPopup(`
        <div class="map-popup-custom">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <h4 style="color:#9333ea; margin:0;">${site.name}</h4>
            <span class="badge-status ${isSiteAUnavailable ? 'badge-red' : 'badge-green'}">${statusText}</span>
          </div>
          <p style="font-size:11px; color:#64748b; margin:0 0 8px 0;">${site.facilityName}</p>
          <div style="background:#faf5ff; border:1px solid #f3e8ff; padding:6px 8px; border-radius:6px; font-size:11px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
              <span><strong>Operational Capacity:</strong></span>
              <strong style="color:#9333ea;">${site.operationalCapacity.toLocaleString()} people</strong>
            </div>
            <div style="color:#dc2626; font-size:10px;">⚠️ ${site.constrainedReason}</div>
          </div>
          <div style="font-size:11px; color:#334155; margin-bottom:8px;">
            <div>• Water: ${site.waterSupplyStatus}</div>
            <div>• Sanitation: ${site.sanitationStatus}</div>
            <div>• Healthcare: ${site.healthcareStatus}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-sm btn-secondary-white" onclick="openSafeSiteModal('${site.id}')">View Readiness</button>
            <button class="btn-sm btn-primary-blue" onclick="coordinateResourceModal('${site.id}', 'WATER')">Coordinate Water</button>
          </div>
        </div>
      `);
    });
  }

  // 4. Villages (Habitations)
  if (APP_STATE.layers.villages) {
    RAKSHA_DATA.villages.forEach(village => {
      let pinColor = "#16a34a"; // Green (Normal)
      if (village.status === "CRITICAL") pinColor = "#dc2626"; // Red
      else if (village.status === "HIGH") pinColor = "#ea580c"; // Orange
      else if (village.status === "MODERATE") pinColor = "#2563eb"; // Blue
      else if (village.status === "WATCH") pinColor = "#0d9488"; // Teal

      const isSelected = village.id === APP_STATE.activeVillageId;

      const villageIcon = L.divIcon({
        className: "custom-leaflet-icon",
        html: `
          <div class="village-map-pin ${isSelected ? 'selected' : ''}" style="background-color:${pinColor}; border-color:${isSelected ? '#ffffff' : pinColor};" title="${village.name}">
            <span>${village.code}</span>
            ${village.relocationPriority <= 3 ? `<span class="priority-sub-badge">P${village.relocationPriority}</span>` : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30]
      });

      const marker = L.marker(village.coords, { icon: villageIcon }).addTo(gLayerGroups.villages);

      marker.on("click", () => {
        selectVillage(village.id);
      });

      marker.bindPopup(`
        <div class="map-popup-custom">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <h4 style="margin:0; color:#0f172a;">${village.name} <small style="color:#64748b;">(${village.localName})</small></h4>
            <span class="badge-status ${village.status === 'CRITICAL' ? 'badge-red' : (village.status === 'HIGH' ? 'badge-orange' : 'badge-blue')}">
              ${village.status} • P#${village.relocationPriority}
            </span>
          </div>
          <div style="font-size:11px; color:#475569; margin-bottom:6px;">
            <div><strong>Population:</strong> ${village.population.toLocaleString()} (Priority: <strong style="color:#dc2626;">${village.priorityPopulation.toLocaleString()}</strong>)</div>
            <div><strong>Hazard:</strong> ${village.hazard}</div>
            <div><strong>Relocation Window:</strong> ${village.availableRelocationWindowHours}h available (Required: ${village.estimatedRelocationTimeHours}h)</div>
            <div><strong>Status:</strong> <span style="color:#16a34a; font-weight:600;">SAFE IN TIME (+${village.safetyBufferHours}h Buffer)</span></div>
          </div>
          <p style="font-size:10px; color:#64748b; margin:0 0 8px 0; background:#f8fafc; padding:4px; border-radius:4px;">
            ${village.dataBaseline}
          </p>
          <div style="display:flex; gap:6px;">
            <button class="btn-sm btn-primary-blue" onclick="openGeneratePlanModal('${village.id}')">Generate Plan</button>
            <button class="btn-sm btn-secondary-white" onclick="switchView('habitations'); selectVillageInTable('${village.id}')">View Details</button>
          </div>
        </div>
      `);
    });
  }
}

/* ==========================================================================
   2. TOP METRICS & SUMMARY CARDS
   ========================================================================== */
function renderTopMetrics() {
  const plan = APP_STATE.activePlan || RakshaEngine.generateRelocationMission(APP_STATE.activeVillageId, APP_STATE.simulations);

  // Relocation Window Metric
  const windowEl = document.getElementById("hero-window-hours");
  const windowSubEl = document.getElementById("hero-window-sub");
  if (windowEl && windowSubEl) {
    const effectiveWindow = APP_STATE.simulations.weatherRiskImpact
      ? Math.max(8, plan.effectiveWindow - 2)
      : plan.effectiveWindow;
    windowEl.textContent = `${effectiveWindow}h`;

    if (APP_STATE.simulations.weatherRiskImpact) {
      windowEl.style.color = "#dc2626";
      windowSubEl.textContent = `⚠️ CONSTRAINED BY WEATHER (${effectiveWindow}h vs ${plan.requiredTime}h req)`;
      windowSubEl.style.color = "#ea580c";
    } else if (plan.missionStatus === "SAFE IN TIME") {
      windowEl.style.color = "#16a34a";
      windowSubEl.textContent = `🟢 SAFE IN TIME (+${plan.safetyBuffer}h Buffer)`;
      windowSubEl.style.color = "#16a34a";
    } else if (plan.missionStatus === "CRITICAL ACCESS FAILURE") {
      windowEl.style.color = "#991b1b";
      windowSubEl.textContent = `🚨 CRITICAL ACCESS FAILURE`;
      windowSubEl.style.color = "#991b1b";
    } else {
      windowEl.style.color = "#dc2626";
      windowSubEl.textContent = `🔴 INSUFFICIENT WINDOW (${plan.safetyBuffer}h)`;
      windowSubEl.style.color = "#dc2626";
    }
  }

  // Priority Habitations (Red Zone Habitations)
  const prioHabEl = document.getElementById("metric-priority-habitations");
  if (prioHabEl) prioHabEl.textContent = RAKSHA_DATA.summaryMetrics.priorityHabitations;

  // People Exposed
  const expPeopleEl = document.getElementById("metric-people-exposed");
  if (expPeopleEl) expPeopleEl.textContent = RAKSHA_DATA.summaryMetrics.peopleExposed.toLocaleString();

  // Need Relocation Review / People Requiring Relocation
  const needReviewEl = document.getElementById("metric-need-review");
  if (needReviewEl) needReviewEl.textContent = RAKSHA_DATA.summaryMetrics.needRelocationReview.toLocaleString();

  // Available Safe Capacity
  const safeCapEl = document.getElementById("metric-safe-capacity");
  if (safeCapEl) {
    const totalCap = RAKSHA_DATA.safeSites
      .filter(s => !(APP_STATE.simulations.siteAUnavailable && s.code === "A"))
      .reduce((acc, s) => acc + s.operationalCapacity, 0);
    safeCapEl.textContent = totalCap.toLocaleString();
  }

  // Routes at Risk
  const routesRiskEl = document.getElementById("metric-routes-risk");
  if (routesRiskEl) {
    const riskCount = (APP_STATE.simulations.r1Blocked ? 1 : 0) +
      (APP_STATE.simulations.r2Blocked ? 1 : 0) +
      (APP_STATE.simulations.weatherRiskImpact ? 1 : 0) +
      (APP_STATE.simulations.allRoadsBlocked ? 5 : 2);
    routesRiskEl.textContent = `${Math.min(5, riskCount)} / 5`;
  }
}

/* ==========================================================================
   3. RESPONSE PRIORITIES (Right Panel List)
   ========================================================================== */
function renderResponsePriorities() {
  const container = document.getElementById("priorities-list-wrap");
  if (!container) return;

  const villagesSorted = [...RAKSHA_DATA.villages].sort((a, b) => a.relocationPriority - b.relocationPriority);

  container.innerHTML = villagesSorted.slice(0, 4).map(v => {
    const isSelected = v.id === APP_STATE.activeVillageId;
    const isP1 = v.relocationPriority === 1;
    const riskScore = v.riskScore;
    const riskLevelClass = riskScore >= 85 ? 'critical' : (riskScore >= 75 ? 'high' : (riskScore >= 60 ? 'moderate' : 'normal'));

    // Real Chamoli Habitation Names matching ground reality
    const displayName = v.id === 'VIL-01' ? 'Raini Gaon (Village A)' :
      (v.id === 'VIL-02' ? 'Tapovan Tok (Village B)' :
        (v.id === 'VIL-03' ? 'Bhyundar (Village C)' : 'Gauchar Khal (Village D)'));

    return `
      <div class="priority-item-card ${isSelected ? 'active' : ''}" onclick="selectVillage('${v.id}')">
        <div class="priority-card-top-row">
          <div class="priority-village-header">
            <span class="prio-rank-pill ${isP1 ? 'rank-1' : ''}">#${v.relocationPriority} ${isP1 ? 'P1' : 'P2'}</span>
            <div>
              <div class="prio-village-name">${displayName}</div>
              <div class="prio-hazard-sub">${v.hazard}</div>
            </div>
          </div>
          <div class="prio-risk-score ${riskLevelClass}">
            ${riskScore}% RISK
          </div>
        </div>

        <!-- Horizontal Risk Meter Bar -->
        <div class="prio-risk-bar-container">
          <div class="prio-risk-bar-fill ${riskLevelClass}" style="width: ${riskScore}%;"></div>
        </div>

        <div class="prio-quick-metrics">
          <span>👥 <strong>${v.priorityPopulation.toLocaleString()}</strong> people</span>
          <span>⏱️ Window: <strong>${v.availableRelocationWindowHours}h</strong> (Need ${v.estimatedRelocationTimeHours}h)</span>
          <span style="color:#10b981; font-weight:700;">+${v.safetyBufferHours}h Buffer</span>
        </div>

        ${isP1 ? `
          <div class="prio-action-alert">
            <span class="dot-red-pulse"></span>
            <span>R1 route closes in 10h. Immediate relocation via R2 recommended.</span>
          </div>
        ` : ''}

        <div class="prio-btn-row">
          <button class="btn-sm btn-secondary-white" style="flex:1;" onclick="event.stopPropagation(); selectVillage('${v.id}')">
            📍 View Map
          </button>
          <button class="btn-sm btn-primary-blue" style="flex:1;" onclick="event.stopPropagation(); openGeneratePlanModal('${v.id}')">
            ⚡ Plan Relocation
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   4. SHELTER READINESS & CARRYING CAPACITY (Bottom Row Card)
   ========================================================================== */
function renderShelterReadiness() {
  const container = document.getElementById("shelter-rows-list");
  if (!container) return;

  container.innerHTML = RAKSHA_DATA.safeSites.slice(0, 3).map(site => {
    const isSiteAUnavailable = APP_STATE.simulations.siteAUnavailable && site.code === "A";
    const opCap = isSiteAUnavailable ? 0 : site.operationalCapacity;

    return `
      <div class="shelter-summary-row ${isSiteAUnavailable ? 'opacity-50' : ''}">
        <div class="shelter-info-left">
          <div class="shelter-title-row">
            <strong>${site.name}</strong>
            <span class="shelter-sub">${site.facilityName.split(' ')[0]} • Elev ${site.elevation.split(' ')[0]}</span>
          </div>
          <div class="shelter-constrain-tag">
            ${isSiteAUnavailable ? '🔴 UNAVAILABLE (Scenario Flooded)' : `⚠️ Constrained by ${site.constrainedBy}: ${opCap.toLocaleString()} cap`}
          </div>
        </div>

        <div class="shelter-metrics-right">
          <div class="shelter-cap-badge">
            <strong>${opCap.toLocaleString()}</strong>
            <small>places</small>
          </div>
          <div class="shelter-actions-row">
            <button class="btn-icon-action" title="Coordinate Water Rations" onclick="coordinateResourceModal('${site.id}', 'WATER')">💧</button>
            <button class="btn-icon-action" title="Coordinate Medical Staff" onclick="coordinateResourceModal('${site.id}', 'HEALTHCARE')">🏥</button>
            <button class="btn-icon-action" title="View Full Site Readiness" onclick="openSafeSiteModal('${site.id}')">⛺</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   5. SCENARIO SNAPSHOT
   ========================================================================== */
function renderScenarioSnapshot() {
  const container = document.getElementById("snapshot-rows-list");
  if (!container) return;

  const currentTimeline = RAKSHA_DATA.timelineStates[APP_STATE.activeTimeline] || RAKSHA_DATA.timelineStates["T0"];

  container.innerHTML = `
    <div class="snapshot-row">
      <span class="snap-label">Scenario Model</span>
      <span class="snap-val font-semibold">${RAKSHA_DATA.scenario.name}</span>
    </div>
    <div class="snapshot-row">
      <span class="snap-label">24h Rainfall / Intensity</span>
      <span class="snap-val text-red font-semibold">${APP_STATE.simulations.rainfallLevel} mm (${RAKSHA_DATA.scenario.rainfallIntensity.split(' ')[0]})</span>
    </div>
    <div class="snapshot-row">
      <span class="snap-label">Alaknanda River Rise</span>
      <span class="snap-val text-red font-semibold">${RAKSHA_DATA.scenario.riverGaugeRise} (Warning +1.8m)</span>
    </div>
    <div class="snapshot-row">
      <span class="snap-label">Relocation Window</span>
      <span class="snap-val text-green font-semibold">${APP_STATE.simulations.relocationWindowHours}h available (11h required)</span>
    </div>
    <div class="snapshot-row">
      <span class="snap-label">Timeline Scrub (${currentTimeline.label})</span>
      <span class="snap-val font-mono text-blue font-semibold">${currentTimeline.r1Status === 'BLOCKED' ? 'R1 BLOCKED, R2 OPEN' : 'R1 ' + currentTimeline.r1Status + ', R2 ' + currentTimeline.r2Status}</span>
    </div>
    <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
      <span class="badge-status badge-blue" style="font-size:10px;">DEMO / SIMULATED SCENARIO</span>
      <button class="btn-sm btn-primary-blue" onclick="switchView('scenario-lab')">Open Scenario Lab ⚗️</button>
    </div>
  `;
}

/* ==========================================================================
   6. HABITATIONS INTELLIGENCE VIEW (Table & Detail Drawer)
   ========================================================================== */
function renderHabitationsTable() {
  const tbody = document.getElementById("habitations-tbody");
  if (!tbody) return;

  tbody.innerHTML = RAKSHA_DATA.villages.map(v => {
    const isSelected = v.id === APP_STATE.activeVillageId;
    return `
      <tr class="${isSelected ? 'row-selected' : ''}" onclick="selectVillage('${v.id}')">
        <td>
          <span class="badge-status ${v.relocationPriority <= 2 ? 'badge-red' : (v.relocationPriority <= 4 ? 'badge-orange' : 'badge-blue')}">
            #${v.relocationPriority}
          </span>
        </td>
        <td>
          <strong>${v.name}</strong><br>
          <small style="color:#64748b;">${v.localName}</small>
        </td>
        <td>${v.population.toLocaleString()}</td>
        <td><strong style="color:#dc2626;">${v.priorityPopulation.toLocaleString()}</strong></td>
        <td>
          <span class="risk-pill ${v.riskScore >= 80 ? 'risk-red' : (v.riskScore >= 65 ? 'risk-orange' : 'risk-green')}">
            ${v.riskScore}
          </span>
        </td>
        <td>${v.availableRelocationWindowHours}h</td>
        <td>${v.estimatedRelocationTimeHours}h</td>
        <td>
          <span class="badge-status badge-green">+${v.safetyBufferHours}h (SAFE)</span>
        </td>
        <td>
          <button class="btn-sm btn-secondary-white" onclick="event.stopPropagation(); openGeneratePlanModal('${v.id}')">Plan</button>
        </td>
      </tr>
    `;
  }).join("");

  renderHabitationDetailDrawer();
}

function renderHabitationDetailDrawer() {
  const drawer = document.getElementById("habitation-detail-drawer");
  if (!drawer) return;

  const v = RAKSHA_DATA.villages.find(vil => vil.id === APP_STATE.activeVillageId) || RAKSHA_DATA.villages[0];

  drawer.innerHTML = `
    <div class="drawer-header">
      <div>
        <h3 style="margin:0; font-size:16px;">${v.name} (${v.localName})</h3>
        <p style="font-size:11px; color:#64748b; margin:2px 0 0 0;">District Chamoli • Relocation Priority #${v.relocationPriority}</p>
      </div>
      <span class="badge-status ${v.status === 'CRITICAL' ? 'badge-red' : 'badge-orange'}">${v.status}</span>
    </div>

    <div class="drawer-body">
      <!-- Why Priority Score Breakdown -->
      <div class="drawer-section">
        <h4 class="drawer-section-title">Transparent Priority Score: ${v.riskScore} / 100</h4>
        <div class="score-breakdown-bar-grid">
          <div>
            <div class="breakdown-label">Hazard Factor (40%)</div>
            <div class="breakdown-bar"><div class="fill red" style="width: ${v.scoreBreakdown.hazardScore * 2.5}%;"></div></div>
            <div class="breakdown-num">${v.scoreBreakdown.hazardScore} / 40</div>
          </div>
          <div>
            <div class="breakdown-label">Exposure (25%)</div>
            <div class="breakdown-bar"><div class="fill orange" style="width: ${v.scoreBreakdown.populationFactor * 4}%;"></div></div>
            <div class="breakdown-num">${v.scoreBreakdown.populationFactor} / 25</div>
          </div>
          <div>
            <div class="breakdown-label">Vulnerability (15%)</div>
            <div class="breakdown-bar"><div class="fill purple" style="width: ${v.scoreBreakdown.vulnerability * 6.6}%;"></div></div>
            <div class="breakdown-num">${v.scoreBreakdown.vulnerability} / 15</div>
          </div>
          <div>
            <div class="breakdown-label">Route Fragility (20%)</div>
            <div class="breakdown-bar"><div class="fill blue" style="width: ${v.scoreBreakdown.routeFragility * 5}%;"></div></div>
            <div class="breakdown-num">${v.scoreBreakdown.routeFragility} / 20</div>
          </div>
        </div>
        <p style="font-size:11px; color:#475569; margin-top:8px; line-height:1.4;">
          <strong>Explainable Rationale:</strong> ${v.whyPriority1}
        </p>
      </div>

      <!-- Vulnerable Demographics -->
      <div class="drawer-section">
        <h4 class="drawer-section-title">Vulnerable Population Breakdown (${v.dataBaseline.split(':')[0]})</h4>
        <div class="vuln-badges-grid">
          <div class="vuln-pill">👶 Under 5: <strong>${v.vulnerableGroups.childrenUnder5}</strong></div>
          <div class="vuln-pill">👵 Above 65: <strong>${v.vulnerableGroups.elderlyAbove65}</strong></div>
          <div class="vuln-pill">♿ Differently-abled: <strong>${v.vulnerableGroups.differentlyAbled}</strong></div>
          <div class="vuln-pill">🤰 Pregnant: <strong>${v.vulnerableGroups.pregnantWomen}</strong></div>
          <div class="vuln-pill">💊 Medical Care: <strong>${v.vulnerableGroups.chronicMedicalCare}</strong></div>
        </div>
        <p style="font-size:10px; color:#64748b; margin-top:6px;">
          ${v.dataBaseline}
        </p>
      </div>

      <!-- Action Button -->
      <div style="margin-top:16px;">
        <button class="btn-primary-blue" style="width:100%;" onclick="openGeneratePlanModal('${v.id}')">
          Generate Relocation Plan for ${v.name} →
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   7. RELOCATION PLANNER MODAL & VISUALIZER (Main Core Demo Flow)
   ========================================================================== */
function openGeneratePlanModal(villageId = "VIL-01") {
  APP_STATE.activeVillageId = villageId;
  const plan = RakshaEngine.generateRelocationMission(villageId, APP_STATE.simulations);
  APP_STATE.activePlan = plan;
  APP_STATE.planStatus = "GENERATED";

  const modal = document.getElementById("modal-relocation-plan");
  const content = document.getElementById("modal-plan-content");
  if (!modal || !content) return;

  const v = plan.village;
  const alloc = plan.allocationResult;
  const route = plan.routeResult;

  content.innerHTML = `
    <!-- Top Mission Header Card -->
    <div class="plan-header-banner ${plan.isSafeInTime ? 'banner-safe' : 'banner-danger'}">
      <div class="banner-left">
        <span class="badge-status ${plan.isSafeInTime ? 'badge-green' : 'badge-red'}">${plan.missionStatus}</span>
        <h2 style="margin:4px 0 0 0; font-size:18px;">Relocation Mission: ${v.name} (${v.localName})</h2>
        <p style="margin:2px 0 0 0; font-size:12px; opacity:0.9;">
          Priority #${v.relocationPriority} • ${v.priorityPopulation.toLocaleString()} people designated for immediate pre-disaster movement
        </p>
      </div>
      <div class="banner-right-stats">
        <div class="stat-box-white">
          <small>Available Window</small>
          <strong>${plan.effectiveWindow}h</strong>
        </div>
        <div class="stat-box-white">
          <small>Required Time</small>
          <strong>${plan.requiredTime}h</strong>
        </div>
        <div class="stat-box-white">
          <small>Safety Buffer</small>
          <strong style="color:${plan.isSafeInTime ? '#16a34a' : '#dc2626'};">+${plan.safetyBuffer}h</strong>
        </div>
      </div>
    </div>

    <!-- 10-Step Deterministic Engine Progress Stepper -->
    <div class="plan-section-box">
      <h4 class="box-title">⚡ 10-Step Deterministic Relocation Engine Workflow</h4>
      <div class="ten-steps-timeline">
        ${plan.tenSteps.map(s => `
          <div class="ten-step-item">
            <div class="step-num-circle">${s.step}</div>
            <div class="step-content">
              <strong>${s.title}</strong>
              <p>${s.detail}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Multi-Site Capacity Allocation Breakdown -->
    <div class="plan-section-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h4 class="box-title" style="margin:0;">🏢 Multi-Site Carrying Capacity Allocation</h4>
        <span class="badge-status ${alloc.isMultiSite ? 'badge-blue' : 'badge-green'}">
          ${alloc.isMultiSite ? 'MULTI-SITE SPLIT ACTIVATED' : 'SINGLE SITE'}
        </span>
      </div>
      
      <div class="alert-info-pill" style="margin-bottom:12px;">
        ℹ️ <strong>${alloc.allocationMessage}</strong>
      </div>

      <div class="multi-site-cards-grid">
        ${alloc.allocations.map(a => `
          <div class="site-alloc-card">
            <div class="alloc-card-header">
              <div>
                <strong>${a.siteName}</strong>
                <div style="font-size:11px; color:#64748b;">${a.facilityName}</div>
              </div>
              <span class="alloc-count-badge">${a.assignedCount.toLocaleString()} persons</span>
            </div>
            
            <div class="alloc-progress-wrap">
              <div class="progress-bar-bg">
                <div class="progress-fill" style="width:${a.utilizationPercent}%;"></div>
              </div>
              <div class="progress-labels">
                <span>Utilization: ${a.utilizationPercent}% of operational cap</span>
                <span>Max: ${a.siteOperationalCapacity.toLocaleString()}</span>
              </div>
            </div>

            <div class="alloc-constrain-note">
              ⚠️ Operational cap constrained by <strong>${a.constrainedBy}</strong>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Route Feasibility Analysis (R1 vs R2) -->
    <div class="plan-section-box">
      <h4 class="box-title">🛣️ Route Intelligence & Feasibility Decision</h4>
      
      <div class="route-comparison-grid">
        <!-- Route R1 (Shorter but Fails) -->
        <div class="route-compare-card fails">
          <div class="compare-header">
            <strong>Route R1 (Helang River Gorge)</strong>
            <span class="badge-status badge-red">NOT TIME-FEASIBLE</span>
          </div>
          <div class="compare-stats">
            <div>Distance: 8.0 km</div>
            <div>Travel Time: 25 min</div>
            <div>Closure Window: <strong style="color:#dc2626;">10h</strong></div>
          </div>
          <div class="compare-verdict text-red">
            ❌ <strong>Fails Feasibility:</strong> 10h closure window < 11h required transit time. Risk of convoy entrapment at scree fall.
          </div>
        </div>

        <!-- Route R2 (Longer but Feasible - Selected) -->
        <div class="route-compare-card passes">
          <div class="compare-header">
            <strong>Route R2 (Upper Ridge via Pipalkoti)</strong>
            <span class="badge-status badge-green">RECOMMENDED (FEASIBLE)</span>
          </div>
          <div class="compare-stats">
            <div>Distance: 12.4 km</div>
            <div>Travel Time: 42 min</div>
            <div>Closure Window: <strong style="color:#16a34a;">16h</strong></div>
          </div>
          <div class="compare-verdict text-green">
            ✅ <strong>Selected:</strong> 16h closure window > 11h required transit. Upper terrace alignment ensures safe transit buffer (+5h).
          </div>
        </div>
      </div>

      <div class="route-decision-banner">
        💡 <strong>Decision Logic:</strong> "Recommended route is NOT the shortest route. It is the safer time-feasible route."
      </div>
    </div>

    <!-- Plan A vs Plan B Contingency -->
    <div class="plan-section-box">
      <div class="plan-ab-tabs">
        <button class="btn-tab ${APP_STATE.planAChoice === 'PLAN_A' ? 'active' : ''}" onclick="togglePlanAB('PLAN_A')">Plan A (Primary Mission)</button>
        <button class="btn-tab ${APP_STATE.planAChoice === 'PLAN_B' ? 'active' : ''}" onclick="togglePlanAB('PLAN_B')">Plan B (Contingency Fallback)</button>
      </div>

      <div style="font-size:12px; color:#475569; padding:8px 0;">
        ${APP_STATE.planAChoice === 'PLAN_A' ? `
          <strong>Primary Plan A:</strong> Route R2 (Pipalkoti bypass) to Safe Site A (1,100) + Safe Site B (750). Total 1,850 persons accommodated.
        ` : `
          <strong>Contingency Plan B:</strong> In case Route R2 is severed, redirect to Route R3 (South Hill Corridor) to Pipalkoti Transit Camp (Site C) & Emergency Extraction at Landing Site H1.
        `}
      </div>
    </div>

    <!-- Authority Approval & Action Footer -->
    <div class="modal-footer-actions">
      <div style="font-size:11px; color:#64748b;">
        Final operational execution directive requires District Magistrate / DEOC Command authorization.
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn-secondary-white" onclick="openModifyPlanModal()">
          ✏️ Modify Plan
        </button>
        <button class="btn-primary-blue" onclick="approvePlanAction()">
          ✅ Approve & Dispatch Relocation Plan
        </button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

function approvePlanAction() {
  APP_STATE.planStatus = "APPROVED";
  APP_STATE.authorityAlertStatus = "APPROVED";

  // Close plan modal
  closeAllModals();

  // Show notification
  showSystemToast("✅ Relocation Plan APPROVED by District Magistrate Chamoli. Directives dispatched to RTO & DEOC.");

  // Update metrics and views
  renderTopMetrics();
  renderAuthorityAlertsView();
  renderResidentDashboard();

  // If in demo mode, advance stepper
  if (APP_STATE.demoMode.isRunning) {
    advanceDemoStep();
  }
}

function openModifyPlanModal() {
  const modal = document.getElementById("modal-modify-plan");
  const content = document.getElementById("modal-modify-content");
  if (!modal || !content) return;

  const plan = APP_STATE.activePlan;
  const v = plan.village;

  content.innerHTML = `
    <div style="padding:16px;">
      <h3 style="margin-top:0;">Modify Relocation Parameters: ${v.name}</h3>
      <p style="font-size:12px; color:#64748b;">Adjust assigned quotas or allocate additional transport assets before final authorization:</p>

      <div style="display:flex; flex-direction:column; gap:12px; margin:16px 0;">
        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Safe Site A Assigned Quota (Max 1,100)</label>
          <input type="number" id="input-mod-site-a" value="1100" max="1100" min="500" class="input-clean" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>

        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Safe Site B Assigned Quota (Max 750)</label>
          <input type="number" id="input-mod-site-b" value="750" max="750" min="300" class="input-clean" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>

        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Primary Transit Route</label>
          <select id="select-mod-route" class="input-clean" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px;">
            <option value="R2" selected>Route R2 — Upper Ridge Bypass (Recommended - 16h window)</option>
            <option value="R3">Route R3 — South Hill Link (Contingency - 22h window)</option>
            <option value="R1">Route R1 — Gorge Highway (High Risk - 10h window)</option>
          </select>
        </div>

        <div>
          <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Transport Asset Requisition</label>
          <input type="text" value="48 UTC 32-Seater Buses + 20 Shuttle Jeeps" class="input-clean" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px;" readonly>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn-secondary-white" onclick="document.getElementById('modal-modify-plan').classList.remove('open')">Cancel</button>
        <button class="btn-primary-blue" onclick="saveModifiedPlan()">Save & Apply Changes</button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

function saveModifiedPlan() {
  APP_STATE.isPlanAModified = true;
  document.getElementById("modal-modify-plan").classList.remove("open");
  showSystemToast("Modified parameters saved. Plan refreshed.");
  openGeneratePlanModal(APP_STATE.activeVillageId);
}

function togglePlanAB(choice) {
  APP_STATE.planAChoice = choice;
  openGeneratePlanModal(APP_STATE.activeVillageId);
}

/* ==========================================================================
   8. SCENARIO LAB & FAILURE SIMULATION
   ========================================================================== */
function handleScenarioChange(scenarioType) {
  // Reset baseline
  APP_STATE.simulations = {
    rainfallLevel: 140,
    relocationWindowHours: 18,
    r1Blocked: false,
    r2Blocked: false,
    siteAUnavailable: false,
    capacityReduced: false,
    allRoadsBlocked: false
  };

  if (scenarioType === "baseline") {
    APP_STATE.simulations.rainfallLevel = 60;
    APP_STATE.simulations.relocationWindowHours = 24;
  } else if (scenarioType === "heavy-rain") {
    APP_STATE.simulations.rainfallLevel = 140;
    APP_STATE.simulations.relocationWindowHours = 18;
  } else if (scenarioType === "r1-blocked") {
    APP_STATE.simulations.r1Blocked = true;
  } else if (scenarioType === "r2-blocked") {
    APP_STATE.simulations.r2Blocked = true;
  } else if (scenarioType === "site-a-unavailable") {
    APP_STATE.simulations.siteAUnavailable = true;
  } else if (scenarioType === "capacity-reduced") {
    APP_STATE.simulations.capacityReduced = true;
  } else if (scenarioType === "window-reduced") {
    APP_STATE.simulations.relocationWindowHours = 6;
  } else if (scenarioType === "all-roads-blocked") {
    APP_STATE.simulations.allRoadsBlocked = true;
    APP_STATE.simulations.r1Blocked = true;
    APP_STATE.simulations.r2Blocked = true;
  }

  // Recompute plan with updated parameters
  APP_STATE.activePlan = RakshaEngine.generateRelocationMission(APP_STATE.activeVillageId, APP_STATE.simulations);

  // Update UI & Map
  renderTopMetrics();
  renderMapLayers();
  renderScenarioSnapshot();
  renderShelterReadiness();
  renderResponsePriorities();
  renderResidentDashboard();

  showSystemToast(`⚗️ Scenario Lab: Switched to '${scenarioType.toUpperCase()}'. Results recomputed.`);
}

function handleWindowSlider(hours) {
  APP_STATE.simulations.relocationWindowHours = parseInt(hours);
  document.getElementById("slider-window-val").textContent = `${hours}h`;

  APP_STATE.activePlan = RakshaEngine.generateRelocationMission(APP_STATE.activeVillageId, APP_STATE.simulations);

  renderTopMetrics();
  renderScenarioSnapshot();
  renderResidentDashboard();
}

/* ==========================================================================
   9. ROUTE TIMELINE SCRUBBING (NOW, +4h, +8h, +10h, +12h, +18h)
   ========================================================================== */
function setRouteTimeline(timelineCode) {
  APP_STATE.activeTimeline = timelineCode;

  // Update buttons active class
  document.querySelectorAll(".timeline-step-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.time === timelineCode);
  });

  const state = RAKSHA_DATA.timelineStates[timelineCode];
  const infoEl = document.getElementById("timeline-note-text");
  if (infoEl && state) {
    infoEl.innerHTML = `<strong>${state.label}:</strong> ${state.note} (R1: <span style="color:${state.r1Status === 'BLOCKED' ? '#dc2626' : '#ea580c'}">${state.r1Status}</span>, R2: <span style="color:#16a34a">${state.r2Status}</span>)`;
  }

  renderMapLayers();
  renderScenarioSnapshot();
}

/* ==========================================================================
   10. LIVE RELOCATION HEADCOUNT TRACKER
   ========================================================================== */
function renderRelocationStatusView() {
  const container = document.getElementById("status-view-container");
  if (!container) return;

  const lr = APP_STATE.liveRelocation;
  const isApproved = APP_STATE.planStatus === "APPROVED" || APP_STATE.planStatus === "EXECUTING";
  const isMoving = lr.moved > 0;
  const isAllSafe = lr.remaining === 0 && lr.arrived === lr.totalPlanned;
  const percentComplete = Math.min(100, Math.round((lr.arrived / lr.totalPlanned) * 100));

  container.innerHTML = `
    <div class="view-header-row">
      <div>
        <h2 style="margin:0;">Live Relocation Status</h2>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Execution Progress • Village A → Safe Sites A & B</p>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn-secondary-white" onclick="stepRelocationSimulation()">Step Forward ⏩</button>
        <button class="btn-primary-blue" onclick="toggleAutoRelocation()">${lr.isAutoRunning ? 'Pause Stream ⏸️' : 'Simulate Transit ▶️'}</button>
      </div>
    </div>

    <!-- Simplified 4-Stage Stepper: PLAN -> APPROVED -> MOVING -> SAFE -->
    <div class="card-white" style="margin-top:14px; padding:16px;">
      <h3 style="margin:0 0 12px 0; font-size:14px; color:#0f172a;">RELOCATION STATUS TIMELINE</h3>
      
      <div class="four-stage-stepper">
        
        <!-- Stage 1: PLAN -->
        <div class="four-stage-card completed">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#166534; font-size:13px;">PLAN ✓</strong>
            <span class="badge-status badge-green">IDENTIFIED</span>
          </div>
          <div style="font-size:12px; color:#334155; margin-top:6px; font-weight:600;">
            ${lr.totalPlanned.toLocaleString()} people identified
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">
            Village A Priority Population
          </div>
        </div>

        <!-- Stage 2: APPROVED -->
        <div class="four-stage-card ${isApproved ? 'completed' : 'active'}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:${isApproved ? '#166534' : '#1e40af'}; font-size:13px;">APPROVED ${isApproved ? '✓' : '●'}</strong>
            <span class="badge-status ${isApproved ? 'badge-green' : 'badge-blue'}">${isApproved ? 'APPROVED' : 'IN REVIEW'}</span>
          </div>
          <div style="font-size:12px; color:#334155; margin-top:6px; font-weight:600;">
            ${isApproved ? 'Authority approved' : 'Awaiting DM sign-off'}
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">
            District Magistrate Chamoli
          </div>
        </div>

        <!-- Stage 3: MOVING -->
        <div class="four-stage-card ${isAllSafe ? 'completed' : (isMoving ? 'active' : 'pending')}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:${isAllSafe ? '#166534' : (isMoving ? '#1e40af' : '#64748b')}; font-size:13px;">MOVING ${isAllSafe ? '✓' : '●'}</strong>
            <span class="badge-status ${isMoving ? 'badge-blue' : 'badge-orange'}">${isMoving ? 'EN ROUTE' : 'PENDING'}</span>
          </div>
          <div style="font-size:12px; color:#334155; margin-top:6px; font-weight:600;">
            ${lr.moved.toLocaleString()} moving / relocated
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">
            Convoys underway on Route R2 & R3
          </div>
        </div>

        <!-- Stage 4: SAFE -->
        <div class="four-stage-card ${isAllSafe ? 'completed' : 'pending'}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:${isAllSafe ? '#166534' : '#64748b'}; font-size:13px;">SAFE ${isAllSafe ? '✓' : '○'}</strong>
            <span class="badge-status ${isAllSafe ? 'badge-green' : 'badge-orange'}">${isAllSafe ? 'SAFE' : 'PENDING'}</span>
          </div>
          <div style="font-size:12px; color:#334155; margin-top:6px; font-weight:600;">
            ${isAllSafe ? `All ${lr.totalPlanned.toLocaleString()} people safe` : `${lr.remaining.toLocaleString()} remaining`}
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">
            ${isAllSafe ? 'All relocation conditions satisfied ✓' : 'Awaiting final arrivals'}
          </div>
        </div>

      </div>

      <!-- Completion Bar -->
      <div style="margin-top:16px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span><strong>Total Completion:</strong> ${percentComplete}% (${lr.arrived.toLocaleString()} safely sheltered)</span>
          <span style="color:#64748b;">${isAllSafe ? 'Relocation Complete ✓' : 'Execution in progress'}</span>
        </div>
        <div class="progress-bar-bg" style="height:10px; background:#e2e8f0; border-radius:5px; overflow:hidden;">
          <div class="progress-fill" style="width:${percentComplete}%; height:100%; background:${isAllSafe ? '#16a34a' : '#2563eb'}; transition:width 0.3s ease;"></div>
        </div>
      </div>
    </div>

    <!-- Big Headcount Metrics Cards -->
    <div class="reloc-stats-row" style="margin-top:14px;">
      <div class="reloc-stat-box">
        <span class="stat-title">Planned</span>
        <span class="stat-number">${lr.totalPlanned.toLocaleString()}</span>
        <small class="stat-sub">Village A Priority Pop</small>
      </div>
      <div class="reloc-stat-box">
        <span class="stat-title">Mobilized / Moved</span>
        <span class="stat-number text-blue">${lr.moved.toLocaleString()}</span>
        <small class="stat-sub">Departed Origin</small>
      </div>
      <div class="reloc-stat-box">
        <span class="stat-title">In Transit</span>
        <span class="stat-number text-orange">${lr.inTransit.toLocaleString()}</span>
        <small class="stat-sub">On designated routes</small>
      </div>
      <div class="reloc-stat-box">
        <span class="stat-title">Safely Arrived</span>
        <span class="stat-number text-green">${lr.arrived.toLocaleString()}</span>
        <small class="stat-sub">Safe Sites A & B</small>
      </div>
      <div class="reloc-stat-box">
        <span class="stat-title">Remaining at Village</span>
        <span class="stat-number text-red">${lr.remaining.toLocaleString()}</span>
        <small class="stat-sub">Awaiting departure</small>
      </div>
    </div>
  `;
}

function stepRelocationSimulation() {
  const lr = APP_STATE.liveRelocation;
  if (lr.remaining > 0) {
    const batch = Math.min(250, lr.remaining);
    lr.remaining -= batch;
    lr.moved += batch;
    lr.inTransit += batch;

    // Simulate portion arriving
    const arrivedBatch = Math.min(200, lr.inTransit);
    lr.inTransit -= arrivedBatch;
    lr.arrived += arrivedBatch;

    if (lr.stageIndex < 8) lr.stageIndex++;
  } else {
    lr.inTransit = 0;
    lr.arrived = lr.totalPlanned;
    lr.stageIndex = 8;
  }

  renderRelocationStatusView();
  renderResidentDashboard();
}

function toggleAutoRelocation() {
  const lr = APP_STATE.liveRelocation;
  lr.isAutoRunning = !lr.isAutoRunning;

  if (lr.isAutoRunning) {
    lr.autoTimer = setInterval(() => {
      stepRelocationSimulation();
      if (lr.arrived >= lr.totalPlanned) {
        clearInterval(lr.autoTimer);
        lr.isAutoRunning = false;
        showSystemToast("🏁 All 1,850 residents of Village A safely arrived at Safe Sites!");
      }
    }, 2500);
  } else {
    if (lr.autoTimer) clearInterval(lr.autoTimer);
  }

  renderRelocationStatusView();
}

/* ==========================================================================
   11. RESIDENT DASHBOARD & DUAL SHARED STATE
   ========================================================================== */
/* ==========================================================================
   11. RESIDENT DASHBOARD & DUAL SHARED STATE (SIMPLIFIED EMERGENCY SCREEN)
   ========================================================================== */
function renderResidentDashboard() {
  const container = document.getElementById("resident-view-container");
  if (!container) return;

  container.innerHTML = `
    <div style="max-width:440px; margin:24px auto; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.12); overflow:hidden; border:1px solid #e2e8f0; font-family:var(--font-sans);">
      
      <!-- Top Resident Emergency Header -->
      <div style="background:#dc2626; color:#ffffff; padding:18px 20px; text-align:center;">
        <div style="font-size:32px; margin-bottom:4px;">🚨</div>
        <h2 style="margin:0; font-size:22px; font-weight:800; letter-spacing:0.5px;">EVACUATION ALERT</h2>
        <div style="font-size:12px; opacity:0.9; margin-top:2px;">Chamoli District Disaster Management Authority</div>
      </div>

      <!-- Emergency Alert Details -->
      <div style="padding:20px;">
        
        <div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; padding:14px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #fee2e2; padding-bottom:6px;">
            <span style="font-size:12px; color:#64748b;">Your area:</span>
            <strong style="font-size:14px; color:#0f172a;">Village A</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #fee2e2; padding-bottom:6px;">
            <span style="font-size:12px; color:#64748b;">Risk:</span>
            <span class="badge-status badge-red" style="font-size:12px;">HIGH</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #fee2e2; padding-bottom:6px;">
            <span style="font-size:12px; color:#64748b;">Go to:</span>
            <strong style="font-size:14px; color:#15803d;">Safe Site A</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #fee2e2; padding-bottom:6px;">
            <span style="font-size:12px; color:#64748b;">Recommended route:</span>
            <strong style="font-size:14px; color:#2563eb;">R2</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="font-size:12px; color:#64748b;">Avoid:</span>
            <strong style="font-size:14px; color:#dc2626;">R1</strong>
          </div>
        </div>

        <p style="font-size:12px; color:#64748b; text-align:center; margin:0 0 16px 0; line-height:1.4;">
          Follow local authority instructions. Evacuation transport staged at Panchayat Ground.
        </p>

        <!-- Two Prominent Action Buttons -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn-primary-blue" style="width:100%; padding:12px; font-size:14px; font-weight:700;" onclick="viewResidentRoute()">
            🛣️ VIEW ROUTE
          </button>
          <button class="btn-primary-blue" style="width:100%; padding:12px; font-size:14px; font-weight:700; background:#dc2626; border-color:#b91c1c;" onclick="triggerResidentHelp()">
            🆘 EMERGENCY HELP
          </button>
        </div>

        <!-- Role Switcher for Hackathon Judges -->
        <div style="margin-top:20px; border-top:1px solid #f1f5f9; padding-top:14px; text-align:center;">
          <small style="color:#94a3b8; display:block; margin-bottom:8px;">DEMO ROLE SWITCHER</small>
          <div style="display:flex; gap:8px;">
            <button class="btn-sm btn-secondary-white" style="flex:1;" onclick="switchRole('authority')">🏛️ Authority View</button>
            <button class="btn-sm btn-secondary-white" style="flex:1;" onclick="switchRole('ndrf')">🚨 NDRF View</button>
          </div>
        </div>

      </div>

    </div>
  `;
}

function viewResidentRoute() {
  openNavigationModal('ROUTE-02');
}

function triggerResidentHelp() {
  showSystemToast("🆘 EMERGENCY DISTRESS SIGNAL TRANSMITTED: Your location at Village A has been flagged with DEOC Command and NDRF QRT.");
}

/* ==========================================================================
   12. 11-STEP RAPID 30-SECOND DEMO SCENARIO RUNNER
   ========================================================================== */
function runDemoScenario() {
  const dm = APP_STATE.demoMode;
  if (dm.isRunning) return;

  dm.isRunning = true;
  dm.currentStepIndex = 0;
  dm.secondsElapsed = 0;

  // Make sure we start in authority command center
  switchRole("authority");
  switchView("command-center");

  const demoOverlay = document.getElementById("demo-mode-hud");
  if (demoOverlay) demoOverlay.classList.add("visible");

  const steps = [
    { sec: 0, text: "Step 1: Hazard increases (Precipitation telemetry rising across Chamoli)" },
    { sec: 3, text: "Step 2: Village A becomes RED ZONE (Critical slope risk threshold crossed)" },
    { sec: 6, text: "Step 3: Relocation plan generated (Multi-site allocation Sites A & B)" },
    { sec: 9, text: "Step 4: Authority approves plan (District Magistrate sign-off)" },
    { sec: 12, text: "Step 5: Public Alert + NDRF Alert generated via GovernmentAlertProvider" },
    { sec: 15, text: "Step 6: Residents receive simulated alert (Emergency directive pushed)" },
    { sec: 18, text: "Step 7: Relocation starts (1,240 people moving / relocated)" },
    { sec: 21, text: "Step 8: Aerial verification detects: 18 persons, 56 livestock, R2 blockage" },
    { sec: 24, text: "Step 9: NDRF dashboard receives rescue alert (Old School Terrace)" },
    { sec: 27, text: "Step 10: NDRF accepts task (Status: TASK ACCEPTED → IN PROGRESS)" },
    { sec: 30, text: "Step 11: Route recalculated to R3 → Final: SAFE / RESCUE IN PROGRESS" }
  ];

  dm.timer = setInterval(() => {
    dm.secondsElapsed++;

    // Find step matching second
    const step = steps.find(s => s.sec === dm.secondsElapsed);
    if (step) {
      updateDemoHUD(step.text, dm.secondsElapsed);
      executeDemoStepAction(step.sec);
    }

    if (dm.secondsElapsed >= 33) {
      clearInterval(dm.timer);
      dm.isRunning = false;
      showSystemToast("🎉 30s RAPID DEMO COMPLETE: Plan → Alert → Relocate → Verify → Respond → Safe");
      if (demoOverlay) demoOverlay.classList.remove("visible");
    }
  }, 1000);
}

function updateDemoHUD(text, sec) {
  const hudText = document.getElementById("demo-hud-text");
  const hudTime = document.getElementById("demo-hud-timer");
  if (hudText) hudText.textContent = text;
  if (hudTime) hudTime.textContent = `${sec}s / 33s`;
}

function executeDemoStepAction(sec) {
  if (sec === 0) {
    // Step 1: Hazard increases
    selectVillage("VIL-01");
    if (typeof RakshaWeather !== "undefined") {
      RakshaWeather.fetchVillageWeather("VIL-01", true);
    }
  } else if (sec === 3) {
    // Step 2: Village A becomes RED
    APP_STATE.activeVillageId = "VIL-01";
    renderMapLayers();
    renderTopMetrics();
  } else if (sec === 6) {
    // Step 3: Relocation plan generated
    APP_STATE.activePlan = RakshaEngine.generateRelocationMission("VIL-01", APP_STATE.simulations);
    renderTopMetrics();
    renderRelocationStatusView();
  } else if (sec === 9) {
    // Step 4: Authority approves
    APP_STATE.planStatus = "APPROVED";
    APP_STATE.authorityAlertStatus = "APPROVED";
    renderTopMetrics();
    showSystemToast("✅ Authority Approved Relocation Plan for Village A");
  } else if (sec === 12) {
    // Step 5: Public Alert + NDRF Alert generated
    triggerPublicAlertDispatch();
    triggerNdrfAlertDispatch();
  } else if (sec === 15) {
    // Step 6: Residents receive simulated alert
    switchRole("resident");
  } else if (sec === 18) {
    // Step 7: Relocation starts
    switchRole("authority");
    switchView("status");
    APP_STATE.liveRelocation.moved = 1240;
    APP_STATE.liveRelocation.remaining = 560;
    APP_STATE.liveRelocation.arrived = 680;
    APP_STATE.liveRelocation.inTransit = 560;
    renderRelocationStatusView();
  } else if (sec === 21) {
    // Step 8: Aerial verification detects 18 persons, 56 livestock, R2 blockage
    switchView("aerial-verification");
  } else if (sec === 24) {
    // Step 9: NDRF dashboard receives rescue alert
    switchView("ndrf");
  } else if (sec === 27) {
    // Step 10: NDRF accepts task
    if (window.NDRF_DATA && window.NDRF_DATA.rescueAlerts[0]) {
      window.NDRF_DATA.rescueAlerts[0].status = "TASK ACCEPTED";
      renderNdrfResponseView();
    }
    showSystemToast("🚨 NDRF Task Accepted by Gopeshwar QRT Team 1");
  } else if (sec === 30) {
    // Step 11: Route recalculated to R3 -> Final: SAFE / RESCUE IN PROGRESS
    requestRoadVerificationAerial("R2");
    switchView("status");
    showSystemToast("🛡️ FINAL STATE: SAFE / RESCUE IN PROGRESS. Convoys safely routed via R3.");
  }
}

/* ==========================================================================
   13. ALL-ROADS-BLOCKED FAILURE MODE & HELICOPTER ASSESSMENT
   ========================================================================== */
function renderEmergencyAccessView() {
  const container = document.getElementById("emergency-access-container");
  if (!container) return;

  const isAllBlocked = APP_STATE.simulations.allRoadsBlocked;

  container.innerHTML = `
    <div class="view-header-row">
      <div>
        <h2 style="margin:0;">Emergency Access & Aerial Evacuation Assessment</h2>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">All-Roads-Blocked Failure Protocol • Helipad Readiness & Air Tasking</p>
      </div>
      <div>
        <button class="btn-sm btn-secondary-white" onclick="handleScenarioChange('all-roads-blocked')">
          🚨 Test All-Roads-Blocked Scenario
        </button>
      </div>
    </div>

    ${isAllBlocked ? `
      <div class="alert-severe-box">
        <div style="font-size:20px;">🚨</div>
        <div>
          <h3 style="margin:0; color:#991b1b;">CRITICAL ACCESS FAILURE ACTIVATED</h3>
          <p style="margin:4px 0 0 0; font-size:12px; color:#7f1d1d;">
            All vehicular ground corridors (Route R1, R2, R4, R5) to Village A are severed by debris or submergence. 
            Ground relocation is impossible. System has switched to <strong>EMERGENCY RESPONSE MODE</strong>.
          </p>
        </div>
      </div>
    ` : ''}

    <!-- Candidate Landing Sites Grid -->
    <div class="helipad-cards-grid" style="margin-top:16px;">
      ${RAKSHA_DATA.candidateHelipads.map(h => `
        <div class="helipad-card">
          <div class="helipad-header">
            <div>
              <h4 style="margin:0; font-size:15px; color:#0f172a;">${h.name}</h4>
              <p style="font-size:11px; color:#64748b; margin:2px 0 0 0;">Elevation: ${h.elevation}</p>
            </div>
            <span class="badge-status ${h.verificationStatus.includes('AUTHORITY') ? 'badge-green' : 'badge-orange'}">
              ${h.verificationStatus}
            </span>
          </div>

          <div class="helipad-details-grid">
            <div><strong>Terrain:</strong> ${h.terrain}</div>
            <div><strong>Obstacles:</strong> ${h.obstacleStatus}</div>
            <div><strong>Weather/Visibility:</strong> ${h.weatherVisibility}</div>
            <div><strong>Medical Access:</strong> ${h.medicalAccessTime}</div>
            <div><strong>Helicopter Capacity:</strong> ${h.capacityHelis} simultaneous spots</div>
            <div><strong>Aviation Fuel:</strong> ${h.fuelAvailability}</div>
          </div>

          <div class="helipad-footer">
            <span style="font-size:11px; color:#64748b;">Verified by: ${h.verifiedBy}</span>
            <button class="btn-sm btn-primary-blue" onclick="requestHelicopterAssessment('${h.id}')">
              Request Emergency Helicopter Assessment
            </button>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="disclaimer-note-card" style="margin-top:16px;">
      ⚠️ <strong>Air Tasking Policy:</strong> "The software provides decision support and terrain readiness assessment. 
      It does NOT automatically dispatch aircraft. Final operational tasking remains with the Air Force Liaison Officer & District Magistrate."
    </div>
  `;
}

function requestHelicopterAssessment(helipadId) {
  const h = RAKSHA_DATA.candidateHelipads.find(item => item.id === helipadId);
  showSystemToast(`🚁 Emergency helicopter assessment request logged for ${h ? h.name.split('—')[0] : 'Helipad'}. Status: REQUESTED → UNDER REVIEW.`);
}

/* ==========================================================================
   14. RAPID DRONE & FIELD VERIFICATION MODULE
   ========================================================================== */
function renderDroneView() {
  const container = document.getElementById("drone-view-container");
  if (!container) return;

  container.innerHTML = `
    <div class="view-header-row">
      <div>
        <h2 style="margin:0;">Rapid Verification & Field Reconnaissance</h2>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Drone Telemetry & Physical Inspection Logs for Critical Road Bottlenecks</p>
      </div>
      <div>
        <button class="btn-sm btn-primary-blue" onclick="dispatchSimulatedDrone()">+ Dispatch Recon Drone</button>
      </div>
    </div>

    <div class="drone-tasks-list" style="margin-top:16px;">
      ${RAKSHA_DATA.droneVerificationTasks.map(t => `
        <div class="drone-task-card">
          <div class="task-top">
            <div>
              <strong style="font-size:14px; color:#0f172a;">${t.targetSegment}</strong>
              <div style="font-size:11px; color:#64748b;">Asset: ${t.assignedAsset} • Completed: ${t.timestamp}</div>
            </div>
            <span class="badge-status badge-green">${t.status}</span>
          </div>

          <div style="font-size:12px; color:#334155; margin:8px 0; background:#f8fafc; padding:8px; border-radius:6px;">
            <div><strong>Recon Objective:</strong> ${t.purpose}</div>
            <div style="margin-top:4px;"><strong>Field Finding:</strong> ${t.finding}</div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#2563eb; font-weight:600;">Routing Impact: ${t.impactOnRouting}</span>
            <button class="btn-sm btn-secondary-white" onclick="alert('Drone Imagery: High-resolution photogrammetry loaded for ${t.targetSegment}.')">View Feed 📷</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function dispatchSimulatedDrone() {
  showSystemToast("🛸 QRT Drone Unit dispatched to Helang Bypass (Chainage km 14.5). Recon video feed streaming in 15s.");
}

/* ==========================================================================
   15. AUTHORITY ALERTS VIEW (Red Relocation Alert)
   ========================================================================== */
function renderAuthorityAlertsView() {
  const container = document.getElementById("alerts-view-container");
  if (!container) return;

  const plan = APP_STATE.activePlan || RakshaEngine.generateRelocationMission("VIL-01", APP_STATE.simulations);
  const status = APP_STATE.authorityAlertStatus;

  container.innerHTML = `
    <div class="view-header-row">
      <div>
        <h2 style="margin:0;">Authority Action Alerts & Directives</h2>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Priority Relocation Notifications for District Disaster Management Authority (DDMA)</p>
      </div>
      <div>
        <span class="badge-status ${status === 'APPROVED' ? 'badge-green' : (status === 'ACKNOWLEDGED' ? 'badge-blue' : 'badge-red')}">
          Alert Status: ${status}
        </span>
      </div>
    </div>

    <!-- Active Red Alert Card -->
    <div class="alert-active-master-card" style="margin-top:16px;">
      <div class="alert-master-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="alert-pulse-dot"></span>
          <div>
            <h3 style="margin:0; font-size:16px; color:#dc2626;">RED RELOCATION ALERT: Village A (Pipal Terraces)</h3>
            <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">Alert ID: CAP-CHAMOLI-2026-RELOC-0091 • Priority #1 Habitation</p>
          </div>
        </div>
        <div class="alert-timer-tag">
          Relocation Window: <strong>${plan.effectiveWindow}h</strong>
        </div>
      </div>

      <div class="alert-master-body">
        <div class="alert-summary-grid">
          <div>
            <strong>Population at Risk:</strong>
            <p>${plan.village.population.toLocaleString()} total (${plan.village.priorityPopulation.toLocaleString()} priority)</p>
          </div>
          <div>
            <strong>Available Window:</strong>
            <p>${plan.effectiveWindow} hours</p>
          </div>
          <div>
            <strong>Required Relocation Time:</strong>
            <p>${plan.requiredTime} hours</p>
          </div>
          <div>
            <strong>Safety Buffer:</strong>
            <p style="color:#16a34a; font-weight:600;">+${plan.safetyBuffer} hours</p>
          </div>
          <div>
            <strong>Assigned Safe Sites:</strong>
            <p>Site A (1,100) + Site B (750)</p>
          </div>
          <div>
            <strong>Designated Route:</strong>
            <p style="color:#2563eb; font-weight:600;">Route R2 (Upper Ridge Bypass)</p>
          </div>
        </div>

        <div class="alert-action-strip">
          <span>Action Required: Initiate pre-disaster relocation mission planning and dispatch transport.</span>
          <div style="display:flex; gap:8px;">
            <button class="btn-secondary-white" onclick="acknowledgeAlertAction()">
              ${status === 'PENDING_REVIEW' ? '👁️ Acknowledge' : '✓ Acknowledged'}
            </button>
            <button class="btn-secondary-white" onclick="openModifyPlanModal()">
              ✏️ Modify Plan
            </button>
            <button class="btn-secondary-white" onclick="openGeneratePlanModal('VIL-01')">
              📄 View Plan
            </button>
            <button class="btn-primary-blue" onclick="approvePlanAction()">
              ✅ Approve Plan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Department Action Workflow Table -->
    <div class="card-white" style="margin-top:20px; padding:16px;">
      <h3 style="margin-top:0; font-size:15px;">Departmental Action Workflow Coordination</h3>
      <p style="font-size:11px; color:#64748b;">
        Operational actions assigned across response authorities. "Final operational action remains with the responsible authority."
      </p>

      <table class="table-clean" style="width:100%; margin-top:12px;">
        <thead>
          <tr>
            <th>Action Category</th>
            <th>Responsible Agency</th>
            <th>Target Objective</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Update</th>
          </tr>
        </thead>
        <tbody>
          ${RAKSHA_DATA.authorityActions.map(act => `
            <tr>
              <td><strong>${act.category}</strong></td>
              <td>${act.responsibleAgency}<br><small style="color:#64748b;">${act.officer}</small></td>
              <td><small>${act.target}</small></td>
              <td><span class="badge-status ${act.priority === 'CRITICAL' ? 'badge-red' : (act.priority === 'HIGH' ? 'badge-orange' : 'badge-blue')}">${act.priority}</span></td>
              <td>
                <span class="badge-status ${act.status === 'COMPLETED' ? 'badge-green' : (act.status === 'IN PROGRESS' ? 'badge-blue' : 'badge-orange')}">
                  ${act.status}
                </span>
              </td>
              <td>
                <button class="btn-sm btn-secondary-white" onclick="advanceAuthorityAction('${act.id}')">Advance Status</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function acknowledgeAlertAction() {
  APP_STATE.authorityAlertStatus = "ACKNOWLEDGED";
  showSystemToast("👁️ Alert ACKNOWLEDGED by Command Center. Notification sent to DEOC dispatch.");
  renderAuthorityAlertsView();
}

function advanceAuthorityAction(actId) {
  const act = RAKSHA_DATA.authorityActions.find(a => a.id === actId);
  if (!act) return;

  const cycle = {
    "REQUESTED": "ASSIGNED",
    "ASSIGNED": "IN PROGRESS",
    "IN PROGRESS": "COMPLETED",
    "COMPLETED": "REQUESTED"
  };

  act.status = cycle[act.status] || "IN PROGRESS";
  showSystemToast(`Updated: ${act.category} status changed to ${act.status}.`);
  renderAuthorityAlertsView();
}

/* ==========================================================================
   16. SAFE SITES & ROUTES VIEWS
   ========================================================================== */
function renderSafeSitesView() {
  const container = document.getElementById("safe-sites-view-container");
  if (!container) return;

  container.innerHTML = `
    <div class="view-header-row">
      <div>
        <h2 style="margin:0;">Safe Sites & Shelter Readiness</h2>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Carrying Capacity Accounting for Real Resource Constraints</p>
      </div>
      <div>
        <span class="badge-status badge-purple">5 Designated Relief Sites</span>
      </div>
    </div>

    <div class="safe-sites-full-grid" style="margin-top:16px;">
      ${RAKSHA_DATA.safeSites.map(s => {
    const opResult = RakshaEngine.calculateSiteOperationalCapacity(s);
    return `
          <div class="safe-site-card-full">
            <div class="site-card-header">
              <div>
                <h3 style="margin:0; font-size:16px; color:#0f172a;">${s.name} (${s.code})</h3>
                <p style="font-size:11px; color:#64748b; margin:2px 0 0 0;">${s.facilityName} • Elev ${s.elevation.split(' ')[0]}</p>
              </div>
              <span class="badge-status ${s.readiness === 'READY' ? 'badge-green' : 'badge-orange'}">${s.readiness}</span>
            </div>

            <!-- Capacity Constraint Formula Box -->
            <div class="capacity-formula-box">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span><strong>Operational Capacity:</strong></span>
                <strong style="color:#9333ea; font-size:15px;">${opResult.operationalCapacity.toLocaleString()} people</strong>
              </div>
              <div style="font-size:11px; color:#dc2626;">
                ⚠️ ${opResult.constraintText}
              </div>
            </div>

            <!-- Resource Breakdown Meters -->
            <div class="resources-breakdown-grid">
              ${opResult.allResources.map(r => `
                <div class="resource-pill ${r.name === opResult.limitingResource ? 'limiting' : ''}">
                  <span>${r.name}:</span>
                  <strong>${r.value.toLocaleString()}</strong>
                </div>
              `).join("")}
            </div>

            <div class="site-actions-row-full" style="margin-top:12px;">
              <button class="btn-sm btn-secondary-white" onclick="coordinateResourceModal('${s.id}', 'WATER')">💧 Coordinate Water</button>
              <button class="btn-sm btn-secondary-white" onclick="coordinateResourceModal('${s.id}', 'HEALTHCARE')">🏥 Coordinate Medical</button>
              <button class="btn-sm btn-primary-blue" onclick="openSafeSiteModal('${s.id}')">View Details</button>
            </div>
          </div>
        `;
  }).join("")}
    </div>
  `;
}

function renderRoutesView() {
  const container = document.getElementById("routes-view-container");
  if (!container) return;

  container.innerHTML = `
    <div class="view-header-row">
      <div>
        <h2 style="margin:0;">Route Intelligence & Navigation Graph</h2>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Comparing Routes on Time-Feasibility Rather Than Simple Distance</p>
      </div>
      <div>
        <span class="badge-status badge-blue">Graph Network: 5 Segments</span>
      </div>
    </div>

    <!-- Timeline Interactive Slider Component -->
    <div class="card-white" style="margin-top:16px; padding:16px;">
      <h4 style="margin-top:0;">Interactive Scenario Timeline Player</h4>
      <p style="font-size:11px; color:#64748b;">
        Scrub through the timeline to observe how river surges and saturated scree chutes cause cascading road closures:
      </p>

      <div class="timeline-scrub-bar">
        ${Object.keys(RAKSHA_DATA.timelineStates).map(tCode => {
    const t = RAKSHA_DATA.timelineStates[tCode];
    const isActive = tCode === APP_STATE.activeTimeline;
    return `
            <button class="timeline-step-btn ${isActive ? 'active' : ''}" data-time="${tCode}" onclick="setRouteTimeline('${tCode}')">
              ${t.label}
            </button>
          `;
  }).join("")}
      </div>

      <div class="timeline-note-display" id="timeline-note-text" style="margin-top:12px; background:#f8fafc; padding:8px; border-radius:6px; font-size:12px;">
        <strong>${RAKSHA_DATA.timelineStates[APP_STATE.activeTimeline].label}:</strong> ${RAKSHA_DATA.timelineStates[APP_STATE.activeTimeline].note}
      </div>
    </div>

    <!-- Routes Table -->
    <div class="card-white" style="margin-top:16px; padding:16px;">
      <table class="table-clean" style="width:100%;">
        <thead>
          <tr>
            <th>Route ID</th>
            <th>Name</th>
            <th>Distance</th>
            <th>Est. Time</th>
            <th>Closure Window</th>
            <th>Status</th>
            <th>Feasibility</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${RAKSHA_DATA.routes.map(r => `
            <tr>
              <td><strong>${r.code}</strong></td>
              <td>${r.name}</td>
              <td>${r.distanceKm} km</td>
              <td>${r.travelTimeMin} min</td>
              <td><strong>${r.estimatedClosureWindowHours}h</strong></td>
              <td>
                <span class="badge-status ${r.status === 'OPEN' ? 'badge-green' : (r.status.includes('RECOMMENDED') ? 'badge-blue' : 'badge-red')}">
                  ${r.status}
                </span>
              </td>
              <td>
                <span class="badge-status ${r.isTimeFeasibleForVillageA ? 'badge-green' : 'badge-red'}">
                  ${r.isTimeFeasibleForVillageA ? '✅ FEASIBLE' : '❌ NOT FEASIBLE'}
                </span>
              </td>
              <td>
                <button class="btn-sm btn-secondary-white" onclick="openNavigationModal('${r.id}')">Navigate</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* ==========================================================================
   17. NAVIGATION DETAIL MODAL (Turn-by-Turn GPS Simulation)
   ========================================================================== */
function openNavigationModal(routeId = "ROUTE-02") {
  const modal = document.getElementById("modal-navigation");
  const content = document.getElementById("modal-nav-content");
  if (!modal || !content) return;

  const r = RAKSHA_DATA.routes.find(route => route.id === routeId || route.code === routeId) || RAKSHA_DATA.routes[1];

  content.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="margin:0; font-size:16px;">Turn-by-Turn Navigation: ${r.name}</h3>
          <p style="font-size:11px; color:#64748b; margin:2px 0 0 0;">
            Origin: Village A (Pipal Terraces) → Destination: Gopeshwar Safe Site A & B
          </p>
        </div>
        <span class="badge-status badge-blue">${r.distanceKm} km • ${r.travelTimeMin} min</span>
      </div>

      <div class="nav-segments-list" style="margin:16px 0;">
        <div class="nav-step">
          <div class="step-icon">🏁</div>
          <div>
            <strong>Depart Village A Evacuation Assembly Point</strong>
            <p>Proceed 1.2 km south toward upper link road. Maintain convoy speed 25 km/h.</p>
          </div>
        </div>
        <div class="nav-step">
          <div class="step-icon">↗️</div>
          <div>
            <strong>Merge onto Pipalkoti Upper Ridge Corridor</strong>
            <p>Elevation rise to 1,480m ASL. Rockfall barriers inspected and cleared by PWD Division.</p>
          </div>
        </div>
        <div class="nav-step">
          <div class="step-icon">⬆️</div>
          <div>
            <strong>Cross Pipalkoti Reinforced Bridge #4</strong>
            <p>Freeboard clearance +4.2m above high water level. Free flowing traffic.</p>
          </div>
        </div>
        <div class="nav-step">
          <div class="step-icon">🎯</div>
          <div>
            <strong>Arrive at Gopeshwar Community College Campus (Safe Site A)</strong>
            <p>Buses 1-32 check-in at Gate 1. Ambulances proceed to District Hospital bay.</p>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px; border-radius:6px;">
        <span style="font-size:11px; color:#64748b;">
          Offline GPS Packet loaded. Compatible with NavIC / GPS.
        </span>
        <div style="display:flex; gap:6px;">
          <a class="btn-sm btn-secondary-white" href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=30.485%2C79.545%3B30.412%2C79.335" target="_blank">
            Open in OpenStreetMap ↗
          </a>
          <button class="btn-sm btn-primary-blue" onclick="showSystemToast('GPS Navigation guidance started. Audio cues active.'); closeAllModals();">
            Start Live Guidance 🔊
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

function openRouteModal(routeId = "ROUTE-02") {
  const modal = document.getElementById("modal-generic");
  const title = document.getElementById("modal-generic-title");
  const content = document.getElementById("modal-generic-content");
  if (!modal || !content) return;

  const r = RAKSHA_DATA.routes.find(route => route.id === routeId || route.code === routeId) || RAKSHA_DATA.routes[1];

  title.textContent = `Designated Relocation Route: ${r.code}`;

  content.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div>
          <h3 style="margin:0; font-size:15px; color:#0f172a;">${r.name}</h3>
          <p style="font-size:11px; color:#64748b; margin:2px 0 0 0;">
            Distance: <strong>${r.distanceKm} km</strong> • Travel Time: <strong>${r.travelTimeMin} min</strong>
          </p>
        </div>
        <span class="badge-status ${r.status === 'OPEN' ? 'badge-green' : (r.status.includes('RECOMMENDED') ? 'badge-blue' : 'badge-red')}">
          ${r.status}
        </span>
      </div>

      <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:10px; border-radius:6px; margin:10px 0;">
        <div style="font-size:12px; color:#1e40af; font-weight:700;">
          ✅ Time-Feasible Evacuation Corridor
        </div>
        <p style="font-size:11px; color:#1e3a8a; margin:4px 0 0 0;">
          Estimated Closure Window: <strong>${r.estimatedClosureWindowHours} hours</strong> (Relocation requires 11 hours).
          Safety Margin: <strong>+${r.estimatedClosureWindowHours - 11} hours</strong>.
        </p>
      </div>

      <div style="font-size:12px; color:#334155; margin-bottom:12px;">
        <p><strong>Terrain & Hazard Profile:</strong> ${r.hazardExposure}</p>
        <p style="margin-top:6px;"><strong>Confidence:</strong> ${r.confidence}</p>
        <p style="margin-top:6px;"><strong>Checkpoints:</strong> Village A Exit → Upper Ridge Checkpoint → Pipalkoti Bridge → Gopeshwar Safe Site A & B.</p>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn-secondary-white" onclick="closeAllModals()">Close</button>
        <button class="btn-primary-blue" onclick="closeAllModals(); openNavigationModal('${r.id}');">Start GPS Navigation 🧭</button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

/* ==========================================================================
   18. RESIDENT INSTRUCTIONS & EMERGENCY SOS MODALS
   ========================================================================== */
function openResidentInstructionsModal() {
  const modal = document.getElementById("modal-generic");
  const title = document.getElementById("modal-generic-title");
  const content = document.getElementById("modal-generic-content");
  if (!modal || !content) return;

  title.textContent = "Pre-Disaster Relocation Protocol for Residents";

  content.innerHTML = `
    <div style="font-size:13px; line-height:1.5;">
      <h4 style="color:#0f172a; margin-top:0;">What to Bring in Your Emergency Go-Bag</h4>
      <ul style="padding-left:18px; color:#475569; margin-bottom:12px;">
        <li>Identity cards (Aadhaar / Voter ID) in sealed waterproof pouch</li>
        <li>Prescription medications for minimum 7 days</li>
        <li>Essential warm clothing and rain poncho</li>
        <li>Infant formula / feeding bottles if traveling with children</li>
        <li>Mobile phone and power bank with charging cable</li>
      </ul>

      <h4 style="color:#0f172a;">Designated Assembly Point</h4>
      <p style="color:#475569; margin-bottom:12px;">
        <strong>Village A Panchayat Bhavan Courtyard:</strong> Shuttle buses will arrive in 4 batches of 12 buses each. 
        Ward volunteer (Ramesh Rawat - 94120XXXXX) will call households in priority order (elderly & infants first).
      </p>

      <h4 style="color:#0f172a;">Assigned Safe Site Facilities</h4>
      <p style="color:#475569; margin-bottom:12px;">
        Gopeshwar Community College Campus has clean drinking water, hot meals, 42 bio-toilets, and a dedicated 
        medical room staffed by District Hospital physicians.
      </p>
      
      <div style="display:flex; justify-content:flex-end;">
        <button class="btn-primary-blue" onclick="closeAllModals()">Understood ✓</button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

function openEmergencySOSModal() {
  const modal = document.getElementById("modal-generic");
  const title = document.getElementById("modal-generic-title");
  const content = document.getElementById("modal-generic-content");
  if (!modal || !content) return;

  title.textContent = "🚨 Immediate Emergency SOS Help";

  content.innerHTML = `
    <div style="text-align:center; padding:12px 0;">
      <div style="font-size:42px; margin-bottom:8px;">🆘</div>
      <h3 style="margin:0 0 6px 0; color:#dc2626;">Emergency Assistance Dispatched</h3>
      <p style="font-size:13px; color:#475569; margin-bottom:14px;">
        Your GPS location [30.485, 79.545] has been transmitted to Chamoli District Emergency Operations Centre (DEOC) 
        and the nearest SDRF Quick Response Team.
      </p>

      <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px; border-radius:6px; font-size:12px; color:#991b1b; margin-bottom:16px;">
        <div><strong>DEOC Incident Ref:</strong> SOS-CHAMOLI-7821</div>
        <div><strong>Assigned Asset:</strong> QRT Team #4 (Helang Outpost)</div>
        <div><strong>Estimated Arrival:</strong> 14 minutes</div>
      </div>

      <div style="display:flex; justify-content:center; gap:8px;">
        <button class="btn-secondary-white" onclick="closeAllModals()">Dismiss</button>
        <button class="btn-primary-blue" onclick="showSystemToast('Emergency call initiated to DEOC 1077.'); closeAllModals();">Call 1077 Hotline 📞</button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

function openSafeSiteModal(siteId) {
  const s = RAKSHA_DATA.safeSites.find(item => item.id === siteId) || RAKSHA_DATA.safeSites[0];
  const modal = document.getElementById("modal-generic");
  const title = document.getElementById("modal-generic-title");
  const content = document.getElementById("modal-generic-content");
  if (!modal || !content) return;

  title.textContent = `Safe Site Facility Readiness: ${s.name}`;

  content.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div>
          <h3 style="margin:0;">${s.facilityName}</h3>
          <p style="font-size:11px; color:#64748b; margin:2px 0 0 0;">Elevation: ${s.elevation}</p>
        </div>
        <span class="badge-status badge-green">${s.readiness}</span>
      </div>

      <div style="background:#faf5ff; border:1px solid #f3e8ff; padding:10px; border-radius:6px; margin:10px 0;">
        <div style="display:flex; justify-content:space-between;">
          <strong>Operational Capacity:</strong>
          <strong style="color:#9333ea; font-size:15px;">${s.operationalCapacity.toLocaleString()} people</strong>
        </div>
        <p style="font-size:11px; color:#dc2626; margin:4px 0 0 0;">
          ⚠️ ${s.constrainedReason}
        </p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; margin-bottom:12px;">
        <div style="background:#f8fafc; padding:8px; border-radius:6px;">
          <strong>💧 Water Supply:</strong> ${s.waterSupplyStatus}
        </div>
        <div style="background:#f8fafc; padding:8px; border-radius:6px;">
          <strong>🚻 Sanitation:</strong> ${s.sanitationStatus}
        </div>
        <div style="background:#f8fafc; padding:8px; border-radius:6px;">
          <strong>🍲 Food Stock:</strong> ${s.foodStockDays}
        </div>
        <div style="background:#f8fafc; padding:8px; border-radius:6px;">
          <strong>⚡ Power Backup:</strong> ${s.powerBackup}
        </div>
      </div>

      <div style="background:#f1f5f9; padding:8px; border-radius:6px; font-size:12px; margin-bottom:12px;">
        <strong>🏥 Healthcare Facility:</strong> ${s.healthcareFacility}
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn-secondary-white" onclick="closeAllModals()">Close</button>
        <button class="btn-primary-blue" onclick="coordinateResourceModal('${s.id}', 'WATER')">Coordinate Water</button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

function coordinateResourceModal(siteId, resourceName) {
  const s = RAKSHA_DATA.safeSites.find(item => item.id === siteId) || RAKSHA_DATA.safeSites[0];
  showSystemToast(`💧 Coordination order dispatched to Jal Sansthan Chamoli for ${s.name}: 4 water tankers (32,000L).`);
}

/* ==========================================================================
   19. NAVIGATION & VIEW SWITCHING CONTROLLER
   ========================================================================== */
/* ==========================================================================
   19. NAVIGATION & VIEW SWITCHING CONTROLLER
   ========================================================================== */
function switchView(viewName) {
  APP_STATE.currentView = viewName;

  // Update active class on sidebar links
  document.querySelectorAll(".sidebar .nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.view === viewName);
  });

  // Hide all view containers
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.style.display = "none";
  });

  // Show target view container
  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.style.display = "block";
  }

  // Update breadcrumb text
  const breadcrumbEl = document.getElementById("breadcrumb-current");
  if (breadcrumbEl) {
    const titles = {
      "command-center": "Command Center",
      "habitations": "Villages",
      "red-zones": "Red Zones",
      "safe-sites": "Safe Sites",
      "routes": "Routes",
      "aerial-verification": "Aerial Verification",
      "ndrf": "NDRF Response",
      "scenario-lab": "Scenario Lab",
      "alerts": "Alerts",
      "status": "Relocation Status",
      "methodology": "Methodology"
    };
    breadcrumbEl.textContent = titles[viewName] || viewName;
  }

  if (viewName === "aerial-verification") {
    renderAerialVerificationView();
  } else if (viewName === "ndrf") {
    renderNdrfResponseView();
  } else if (viewName === "status") {
    renderRelocationStatusView();
  }

  // If returning to command center, invalidate map size to fix any rendering glitches
  if (viewName === "command-center" && gMap) {
    setTimeout(() => {
      gMap.invalidateSize();
    }, 100);
  }
}

function switchRole(newRole) {
  APP_STATE.currentRole = newRole;

  const authorityContainer = document.getElementById("authority-shell");
  const residentContainer = document.getElementById("resident-shell");

  if (newRole === "resident") {
    if (authorityContainer) authorityContainer.style.display = "none";
    if (residentContainer) residentContainer.style.display = "block";
    renderResidentDashboard();
  } else if (newRole === "ndrf") {
    if (authorityContainer) authorityContainer.style.display = "flex";
    if (residentContainer) residentContainer.style.display = "none";
    switchView("ndrf");
  } else {
    // authority
    if (authorityContainer) authorityContainer.style.display = "flex";
    if (residentContainer) residentContainer.style.display = "none";
    switchView(APP_STATE.currentView === "ndrf" ? "command-center" : (APP_STATE.currentView || "command-center"));
  }

  // Update top role badge
  const roleBadge = document.getElementById("top-role-badge");
  if (roleBadge) {
    if (newRole === "resident") {
      roleBadge.textContent = "Resident: Village A";
    } else if (newRole === "ndrf") {
      roleBadge.textContent = "NDRF QRT Command";
    } else {
      roleBadge.textContent = "District Authority / DM";
    }
  }

  // Update active state on sidebar role buttons
  document.querySelectorAll(".role-btn").forEach(btn => {
    btn.classList.toggle("active", btn.textContent.toLowerCase().includes(newRole));
  });
}

function selectVillage(villageId) {
  APP_STATE.activeVillageId = villageId;
  const v = RAKSHA_DATA.villages.find(vil => vil.id === villageId);

  // Recalculate plan
  APP_STATE.activePlan = RakshaEngine.generateRelocationMission(villageId, APP_STATE.simulations);

  // Center map if available
  if (gMap && v) {
    gMap.panTo(v.coords, { animate: true });
  }

  // Automatically fetch weather for selected village coordinates
  if (typeof RakshaWeather !== "undefined") {
    RakshaWeather.fetchVillageWeather(villageId);
  }

  // Refresh UI
  renderTopMetrics();
  renderResponsePriorities();
  renderHabitationsTable();
  renderMapLayers();
}

function selectVillageInTable(villageId) {
  selectVillage(villageId);
  renderHabitationDetailDrawer();
}

function selectRoute(routeCode) {
  openNavigationModal(routeCode);
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.classList.remove("open");
  });
}

function showSystemToast(message) {
  const toast = document.getElementById("system-toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

/* ==========================================================================
   20. GLOBAL EVENT BINDINGS
   ========================================================================== */
function bindGlobalEvents() {
  // Layer toggles
  document.querySelectorAll(".btn-layer-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      const layerName = btn.dataset.layer;
      btn.classList.toggle("active");
      APP_STATE.layers[layerName] = btn.classList.contains("active");
      renderMapLayers();
    });
  });

  // Modal overlay click outside to close
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });

  // Escape key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
    }
  });
}

/* ==========================================================================
   21. RAPID AERIAL VERIFICATION + RESCUE INTELLIGENCE CONTROLLER (ADD-ON)
   ========================================================================== */

// Aerial Verification Reactive State
const AERIAL_STATE = {
  activeSensorMode: "COMBINED", // "RGB" | "THERMAL" | "COMBINED"
  isMissionRunning: false,
  flightStepIndex: 0,
  flightTimer: null,
  dronePosition: { x: 50, y: 150 }, // SVG canvas coordinates
  roadR2Restricted: false,
  alertAcknowledged: false,
  activeFilter: "ALL"
};

/**
 * Render the full Rapid Aerial Verification command dashboard
 */
function renderAerialVerificationView() {
  const container = document.getElementById("aerial-verification-container");
  if (!container) return;

  const av = RAKSHA_DATA.aerialVerification;
  const m = av.metrics;
  const th = av.thermalData;
  const ls = av.livestock;
  const rv = av.roadVerification;
  const sv = av.safeSiteVerification;

  container.innerHTML = `
    <!-- Top Header & Telemetry Status -->
    <div class="view-header-row">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <h2 style="margin:0; font-size:18px;">${av.moduleName}</h2>
          <span class="badge-status badge-green">${av.statusBadge}</span>
          <span class="badge-status badge-blue">UAV-QRT-01 (Quad-Rotor Hybrid)</span>
        </div>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">
          ${av.moduleSubtitle} • Focus: <strong>${av.targetVillageName}</strong>
        </p>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn-secondary-white" onclick="openCreateMissionModal()">
          <span>➕</span> Create Verification Mission
        </button>
        <button class="btn-primary-blue btn-demo-glow" onclick="runAerialFlightDemo()">
          <span>⚡</span> Run Aerial Demo (Flight + Closed Loop)
        </button>
      </div>
    </div>

    <!-- Core Philosophy Banner (PLAN -> ACT -> VERIFY -> RESPOND -> RE-PLAN) -->
    <div class="preparedness-alert-bar" style="border-left-color: #9333ea; background: #faf5ff;">
      <div class="alert-left-text">
        <span style="font-size:16px;">🛸</span>
        <span>
          <strong>Closed-Loop Evacuation Intel:</strong> 
          <code style="background:#f3e8ff; color:#6b21a8; padding:2px 6px; border-radius:4px; font-weight:700;">PLAN → ACT → VERIFY → RESPOND → RE-PLAN</code> — 
          The drone is an aerial verification layer used AFTER or DURING relocation planning to verify real ground conditions.
        </span>
      </div>
      <span class="badge-status badge-purple" style="font-size:10px;">PROBABILISTIC AI ESTIMATE</span>
    </div>

    <!-- 3 Core Cards Required by Specification -->
    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; margin-top:14px;">
      
      <!-- Card 1: PEOPLE -->
      <div class="card-white" style="padding:16px; border-left:4px solid #2563eb;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:#1e40af; font-size:13px; letter-spacing:0.5px;">PEOPLE</strong>
          <span class="badge-status badge-blue">THERMAL FLIR</span>
        </div>
        <div style="font-size:12px; color:#475569; margin-bottom:4px;">Potential persons detected:</div>
        <div style="font-size:32px; font-weight:800; color:#1e293b; line-height:1;">18</div>
        <div style="font-size:12px; color:#2563eb; font-weight:600; margin:6px 0 14px 0;">
          Confidence: 84%
        </div>
        <button class="btn-primary-blue" style="width:100%; font-size:12px;" onclick="openCreateRescueTaskModal('HUMAN', 'RES-001')">
          CREATE RESCUE TASK
        </button>
      </div>

      <!-- Card 2: ANIMALS -->
      <div class="card-white" style="padding:16px; border-left:4px solid #ea580c;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:#c2410c; font-size:13px; letter-spacing:0.5px;">ANIMALS</strong>
          <span class="badge-status badge-orange">OPTICAL + THERMAL</span>
        </div>
        <div style="font-size:12px; color:#475569; margin-bottom:4px;">Potential livestock detected:</div>
        <div style="font-size:32px; font-weight:800; color:#1e293b; line-height:1;">56</div>
        <div style="font-size:12px; color:#ea580c; font-weight:600; margin:6px 0 14px 0;">
          Corral clustering in East Ravine
        </div>
        <button class="btn-primary-blue" style="width:100%; font-size:12px; background:#ea580c; border-color:#c2410c;" onclick="openAnimalEvacuationPlanModal()">
          CREATE ANIMAL TASK
        </button>
      </div>

      <!-- Card 3: ROAD -->
      <div class="card-white" style="padding:16px; border-left:4px solid #dc2626;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:#b91c1c; font-size:13px; letter-spacing:0.5px;">ROAD</strong>
          <span class="badge-status badge-red">SURFACE OBSTACLE</span>
        </div>
        <div style="font-size:12px; color:#475569; margin-bottom:4px;">R2:</div>
        <div style="font-size:24px; font-weight:800; color:#dc2626; line-height:1.2;">Possible blockage</div>
        <div style="font-size:12px; color:#64748b; margin:6px 0 14px 0;">
          Debris detected at km 6.8 outbound
        </div>
        <button class="btn-primary-blue" style="width:100%; font-size:12px; background:#dc2626; border-color:#b91c1c;" onclick="requestRoadVerificationAerial('R2')">
          VERIFY ROAD
        </button>
      </div>

    </div>

    <!-- Mandatory Privacy & Situational Detection Notice -->
    <div style="margin-top:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; font-size:11px; color:#475569; display:flex; align-items:center; gap:8px;">
      <span style="font-size:16px;">🛡️</span>
      <span>
        <strong>Zero Personal Identity Verification:</strong>
        No Aadhaar, names, phone numbers, or face identity used. The system only detects potential people/animals and their location/situation.
      </span>
    </div>

    <!-- ====================================================================
         SECTION 21: AERIAL VERIFICATION ALERT (Critical Mismatch)
         ==================================================================== -->
    <div class="card-white" style="border: 2px solid #dc2626; background: #fff5f5; padding: 14px 16px; margin-top: 14px; border-radius: 8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">🚨</span>
          <h3 style="margin:0; font-size:15px; color:#991b1b; font-weight:800;">AERIAL VERIFICATION ALERT</h3>
          <span class="badge-status badge-red">CRITICAL PRIORITY</span>
          ${AERIAL_STATE.alertAcknowledged ? '<span class="badge-status badge-green">✓ ACKNOWLEDGED</span>' : '<span class="badge-status badge-orange">REQUIRES ACTION</span>'}
        </div>
        <span style="font-size:12px; color:#991b1b; font-weight:700;">Village A (Pipal Terraces)</span>
      </div>
      
      <p style="margin:0 0 10px 0; font-size:12px; color:#7f1d1d;">
        Autonomous aerial reconnaissance detected operational mismatch between planned evacuation state and actual ground observation:
      </p>

      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:12px;">
        <div style="background:#ffffff; border:1px solid #fecaca; border-radius:6px; padding:8px 10px;">
          <small style="color:#64748b; display:block; font-size:10px; font-weight:600;">Potential People Detected</small>
          <strong style="color:#dc2626; font-size:18px;">18</strong>
          <div style="font-size:10px; color:#991b1b;">Old School Terrace</div>
        </div>
        <div style="background:#ffffff; border:1px solid #fecaca; border-radius:6px; padding:8px 10px;">
          <small style="color:#64748b; display:block; font-size:10px; font-weight:600;">Potential Isolated Structures</small>
          <strong style="color:#dc2626; font-size:18px;">2</strong>
          <div style="font-size:10px; color:#991b1b;">H-01 & H-02 Cut Off</div>
        </div>
        <div style="background:#ffffff; border:1px solid #fecaca; border-radius:6px; padding:8px 10px;">
          <small style="color:#64748b; display:block; font-size:10px; font-weight:600;">Road R2 Passability</small>
          <strong style="color:#dc2626; font-size:14px;">Possible Blockage</strong>
          <div style="font-size:10px; color:#991b1b;">km 6.8 Debris Scree Fan</div>
        </div>
        <div style="background:#ffffff; border:1px solid #fecaca; border-radius:6px; padding:8px 10px;">
          <small style="color:#64748b; display:block; font-size:10px; font-weight:600;">Livestock Verification Gap</small>
          <strong style="color:#ea580c; font-size:18px;">56</strong>
          <div style="font-size:10px; color:#c2410c;">Unaccounted in East Ravine</div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #fecaca; padding-top:10px;">
        <span style="font-size:11px; color:#7f1d1d;"><strong>Action Protocol:</strong> Verify ground reality before aircraft/asset commitment. Re-plan routes dynamically.</span>
        <div style="display:flex; gap:8px;">
          <button class="btn-sm btn-secondary-white" onclick="acknowledgeAerialAlert()">[Acknowledge]</button>
          <button class="btn-sm btn-secondary-white" onclick="requestFieldTeamDeployment()">[Request Field Team]</button>
          <button class="btn-sm btn-primary-blue" style="background:#dc2626; border-color:#b91c1c;" onclick="recalculateFromAerialAlert()">[Recalculate Relocation Plan]</button>
        </div>
      </div>
    </div>

    <!-- ====================================================================
         SECTION 11: THERMAL SENSOR TELEMETRY PANEL
         ==================================================================== -->
    ${AERIAL_STATE.activeSensorMode !== 'RGB' ? `
      <div style="background: #2e1065; border: 1px solid #a855f7; border-radius: 6px; padding: 10px 14px; margin-top: 12px; color: #f3e8ff; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:16px;">🔥</span>
            <div>
              <span style="font-size:10px; color:#d8b4fe; display:block;">Potential human heat signatures</span>
              <strong style="font-size:14px; color:#ffffff;">19</strong> 
              <small style="color:#e9d5ff;">(82% confidence)</small>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px; border-left:1px solid rgba(168,85,247,0.4); padding-left:16px;">
            <span style="font-size:16px;">🐄</span>
            <div>
              <span style="font-size:10px; color:#d8b4fe; display:block;">Potential animal heat signatures</span>
              <strong style="font-size:14px; color:#ffffff;">31</strong> 
              <small style="color:#e9d5ff;">(76% confidence)</small>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge-status badge-purple" style="font-size:10px;">AI-ASSISTED THERMAL DETECTION</span>
          <small style="display:block; color:#c084fc; font-size:10px; margin-top:2px;">Heat signatures require optical or ground correlation</small>
        </div>
      </div>
    ` : ''}

    <!-- Interactive Live-Style Drone Map & Telemetry Canvas -->
    <div class="card-white" style="margin-top:16px; overflow:hidden;">
      <div class="map-card-header" style="background:#0f172a; color:#ffffff;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:16px;">🛸</span>
          <div>
            <strong style="color:#ffffff; font-size:13px;">Tactical Aerial Verification Map — Sector 4 Orthomosaic</strong>
            <small style="color:#94a3b8; display:block; font-size:10px;">
              Drone Telemetry: Alt 120m AGL • Ground Speed 28 km/h • Optical Sensor 4K 60fps • Thermal FLIR Boson 640
            </small>
          </div>
        </div>

        <!-- Vision Mode Switcher Tabs -->
        <div style="display:flex; gap:6px;">
          <button class="btn-vision-pill ${AERIAL_STATE.activeSensorMode === 'RGB' ? 'active' : ''}" onclick="setAerialVisionMode('RGB')">
            RGB View
          </button>
          <button class="btn-vision-pill ${AERIAL_STATE.activeSensorMode === 'THERMAL' ? 'active' : ''}" onclick="setAerialVisionMode('THERMAL')">
            🔥 Thermal View
          </button>
          <button class="btn-vision-pill ${AERIAL_STATE.activeSensorMode === 'COMBINED' ? 'active' : ''}" onclick="setAerialVisionMode('COMBINED')">
            Fused RGB+Thermal
          </button>
        </div>
      </div>

      <!-- Tactical SVG Live Map Canvas -->
      <div class="aerial-map-canvas-container ${AERIAL_STATE.activeSensorMode === 'THERMAL' ? 'thermal-mode' : (AERIAL_STATE.activeSensorMode === 'COMBINED' ? 'combined-mode' : 'rgb-mode')}">
        <svg id="aerial-svg-canvas" width="100%" height="340" viewBox="0 0 800 340" style="background: ${AERIAL_STATE.activeSensorMode === 'THERMAL' ? '#180728' : '#0a192f'};">
          <!-- Village A Cadastral Boundary Polygon -->
          <polygon points="120,60 380,40 680,100 740,240 520,310 180,290 80,180" 
                   fill="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? 'rgba(76, 29, 149, 0.25)' : 'rgba(37, 99, 235, 0.12)'}" 
                   stroke="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? '#c084fc' : '#38bdf8'}" 
                   stroke-width="2" stroke-dasharray="6,4" />

          <!-- River Surge Inundation Edge (Alaknanda Gorge) -->
          <path d="M 60,330 Q 300,280 500,320 T 780,300" fill="none" stroke="#ef4444" stroke-width="4" opacity="0.8" />
          <text x="70" y="325" fill="#fca5a5" font-size="10" font-family="sans-serif">Alaknanda Surge Perimeter (+2.1m Warning)</text>

          <!-- Road R2 Corridors -->
          <path id="svg-road-r2" d="M 140,80 Q 350,120 540,160 T 720,220" fill="none" stroke="${AERIAL_STATE.roadR2Restricted ? '#dc2626' : '#22c55e'}" stroke-width="${AERIAL_STATE.roadR2Restricted ? '5' : '4'}" stroke-dasharray="${AERIAL_STATE.roadR2Restricted ? '8,4' : 'none'}" />
          <text x="145" y="75" fill="${AERIAL_STATE.roadR2Restricted ? '#fca5a5' : '#86efac'}" font-size="10" font-family="sans-serif">
            Route R2 ${AERIAL_STATE.roadR2Restricted ? '(DEBRIS BLOCKAGE AT KM 6.8 - RESTRICTED)' : '(Upper Ridge Bypass)'}
          </text>

          <!-- Alternative Route R3 (Plan B) -->
          <path d="M 120,50 Q 280,30 460,50 T 700,70" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="4,4" />
          <text x="125" y="45" fill="#93c5fd" font-size="10" font-family="sans-serif">Route R3 (Plan B Backup Ridge Corridor)</text>

          <!-- Drone Flight Path Track -->
          <polyline points="100,100 220,130 360,110 480,180 620,150 560,240 400,220 250,210 100,100" 
                    fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.75" />

          <!-- Human Detections -->
          <!-- Group 1: Upper Hamlet (14 people) -->
          <g transform="translate(230, 125)" class="detection-pin" onclick="alert('Human Group 1: 14 persons detected near Upper Hamlet cistern. AI Confidence: 91%.')">
            <circle r="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? '14' : '10'}" fill="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? 'rgba(239, 68, 68, 0.4)' : '#2563eb'}" />
            <circle r="6" fill="#ffffff" />
            <text x="12" y="4" fill="#ffffff" font-size="10" font-weight="bold">👤 14 (91%)</text>
          </g>

          <!-- Group 2: Temple Ledge (9 people) -->
          <g transform="translate(370, 105)" class="detection-pin" onclick="alert('Human Group 2: 9 persons at Temple Ledge. Status: FIELD VERIFIED by SDRF Scout.')">
            <circle r="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? '12' : '8'}" fill="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? 'rgba(249, 115, 22, 0.5)' : '#16a34a'}" />
            <circle r="5" fill="#ffffff" />
            <text x="12" y="4" fill="#ffffff" font-size="10" font-weight="bold">👤 9 (Verified)</text>
          </g>

          <!-- Group 3: POTENTIAL MISSED POPULATION (18 people) -->
          <g transform="translate(560, 235)" class="detection-pin pulse-danger" onclick="alert('CRITICAL DETECTION: 18 potential missed persons at Old School Terrace. Expected 0. AI Confidence: 84%.')">
            <circle r="18" fill="rgba(220, 38, 38, 0.35)" />
            <circle r="9" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
            <text x="14" y="4" fill="#fca5a5" font-size="11" font-weight="bold">🚨 MISSED: 18 (84%)</text>
          </g>

          <!-- Livestock Clusters -->
          <!-- Herd 1: 42 Cattle -->
          <g transform="translate(460, 175)" class="detection-pin" onclick="alert('Livestock Cluster 1: 42 Cattle identified near East Terraces. AI Confidence: 82%.')">
            <rect x="-6" y="-6" width="12" height="12" rx="3" fill="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? '#e11d48' : '#059669'}" />
            <text x="10" y="4" fill="#a7f3d0" font-size="10">🐄 42 (Cattle)</text>
          </g>

          <!-- Herd 2: 68 Goats/Sheep -->
          <g transform="translate(310, 205)" class="detection-pin">
            <rect x="-5" y="-5" width="10" height="10" rx="3" fill="${AERIAL_STATE.activeSensorMode === 'THERMAL' ? '#f43f5e' : '#0d9488'}" />
            <text x="9" y="4" fill="#99f6e4" font-size="10">🐐 68 (Goats)</text>
          </g>

          <!-- Isolated Habitations (H-01, H-02, H-03, H-04) -->
          <g transform="translate(180, 160)" class="detection-pin" onclick="inspectIsolatedStructure('ISO-01')">
            <polygon points="0,-8 8,4 -8,4" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" />
            <text x="10" y="4" fill="#fde68a" font-size="10" font-weight="bold">🏚️ H-01 (5p)</text>
          </g>

          <g transform="translate(630, 140)" class="detection-pin" onclick="inspectIsolatedStructure('ISO-02')">
            <polygon points="0,-8 8,4 -8,4" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
            <text x="10" y="4" fill="#fca5a5" font-size="10" font-weight="bold">🏚️ H-02 (4p)</text>
          </g>

          <!-- Road Debris Blockage at km 6.8 -->
          <g transform="translate(490, 155)" class="detection-pin" onclick="alert('Road Observation: Route R2 km 6.8 debris fan. 45m³ scree on outbound lane.')">
            <rect x="-8" y="-8" width="16" height="16" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
            <text x="-5" y="4" fill="#ffffff" font-size="10" font-weight="bold">🚧</text>
            <text x="12" y="4" fill="#fca5a5" font-size="10" font-weight="bold">R2 km 6.8 Obstruction</text>
          </g>

          <!-- Animated Drone Marker Position -->
          <g id="svg-drone-icon" transform="translate(${AERIAL_STATE.dronePosition.x}, ${AERIAL_STATE.dronePosition.y})">
            <circle r="16" fill="rgba(56, 189, 248, 0.25)" class="radar-scan-circle" />
            <circle r="7" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
            <text x="-9" y="5" font-size="14">🛸</text>
            <text x="14" y="-4" fill="#38bdf8" font-size="9" font-family="monospace" font-weight="bold">UAV-01 LIVE</text>
          </g>
        </svg>

        <!-- Overlay Floating Legend -->
        <div class="aerial-map-floating-legend">
          <div style="font-size:10px; font-weight:700; color:#ffffff; margin-bottom:4px;">SENSOR FEED CLASSIFICATION</div>
          <div style="display:flex; flex-wrap:wrap; gap:10px; font-size:10px; color:#cbd5e1;">
            <span>👤 Human Group (AI Estimate)</span>
            <span style="color:#fca5a5;">🚨 Potential Missed Human</span>
            <span style="color:#86efac;">🐄 Livestock Herd</span>
            <span style="color:#fde68a;">🏚️ Isolated Dwelling</span>
            <span style="color:#f87171;">🚧 Road Debris</span>
            ${AERIAL_STATE.activeSensorMode !== 'RGB' ? '<span style="color:#e879f9;">🔥 Heat Signature Corroborated</span>' : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Two-Column Comprehensive Intelligence Grid -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px;">
      
      <!-- LEFT COLUMN -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        
        <!-- Card 1: Human Verification & Before vs After Relocation -->
        <div class="card-white" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="margin:0; font-size:14px; color:#0f172a;">👥 Human Population Verification & Mismatch Detection</h3>
            <span class="badge-status badge-orange">⚠️ Possible Relocation Mismatch</span>
          </div>
          
          <table class="table-clean" style="width:100%; margin-bottom:12px;">
            <thead>
              <tr>
                <th>Audit Parameter</th>
                <th>Before Relocation</th>
                <th>After Relocation</th>
                <th>Aerial Verification</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Total Population</strong></td>
                <td>2,400</td>
                <td>550 remaining (1,850 moved)</td>
                <td><strong class="text-blue">537 (AI Estimate • 89% Conf)</strong></td>
              </tr>
              <tr>
                <td><strong>High-Risk Structures</strong></td>
                <td>520 dwellings</td>
                <td>110 occupied</td>
                <td><strong class="text-blue">106 heat signatures</strong></td>
              </tr>
              <tr>
                <td><strong>Unverified Movers</strong></td>
                <td>0</td>
                <td>13 pending check-in</td>
                <td><strong class="text-orange">13 unverified delta</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="alert-info-pill" style="margin-bottom:12px;">
            ℹ️ <strong>Verification Result:</strong> Relocation mismatch detected. 13 expected individuals unverified at designated assembly point; 18 unexpected persons detected in Sector 4.
          </div>

          <!-- Section 22: Field Verification Status Workflow on Detections -->
          <div style="margin:12px 0 10px 0; border-top:1px solid #f1f5f9; padding-top:10px;">
            <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
              <span>DETECTION-LEVEL FIELD VERIFICATION WORKFLOW:</span>
              <span style="font-size:10px; color:#64748b;">(Click status to cycle workflow)</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${av.humanDetections.map(det => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:6px 10px; font-size:11px;">
                  <div>
                    <strong>${det.id}: ${det.label}</strong>
                    <span style="color:#64748b;"> • Est: ${det.estimatedCount} (${det.confidence} conf)</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span class="badge-status ${det.verificationStatus === 'FIELD VERIFIED' ? 'badge-green' :
      (det.verificationStatus.includes('CRITICAL') || det.verificationStatus === 'RESCUE REQUIRED' ? 'badge-red' :
        (det.verificationStatus === 'FIELD VERIFICATION REQUESTED' ? 'badge-orange' : 'badge-blue'))
    }">${det.verificationStatus}</span>
                    <button class="btn-sm btn-secondary-white" style="font-size:10px; padding:2px 6px;" onclick="cycleDetectionStatus('${det.id}')">
                      Update 🔄
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn-sm btn-secondary-white" onclick="alert('Detections Log: 3 human clusters logged. Cluster 1 (14p, 91%), Cluster 2 (9p, 88%), Cluster 3 (18p, 84%).')">
              View Detections
            </button>
            <button class="btn-sm btn-secondary-white" onclick="requestFieldVerification('HUMAN-POP')">
              Request Field Verification
            </button>
            <button class="btn-sm btn-primary-blue" onclick="openCreateRescueTaskModal('HUMAN', 'RES-001')">
              Create Rescue Priority →
            </button>
          </div>
        </div>

        <!-- Card 2: Potential Missed Population (Critical Finding) -->
        <div class="card-white" style="padding:16px; border-left:4px solid #dc2626;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <span class="badge-status badge-red">🚨 CRITICAL VERIFICATION REQUIRED</span>
              <h3 style="margin:4px 0 0 0; font-size:15px; color:#991b1b;">Potential Missed Population Detected</h3>
              <small style="color:#64748b;">Sector 4: Old School Terrace (Village A East Flank)</small>
            </div>
            <div style="text-align:right;">
              <span style="font-size:20px; font-weight:800; color:#dc2626;">18</span>
              <small style="display:block; font-size:10px; color:#64748b;">AI Estimate (84% Conf)</small>
            </div>
          </div>

          <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px; border-radius:6px; font-size:12px; color:#7f1d1d; margin-bottom:12px;">
            <p style="margin:0 0 4px 0;">
              <strong>Observation Note:</strong> Aerial observation differs from planned relocation status. Expected remaining: <code>0</code>. 
              Potential human presence detected (18 heat signatures corroborated on thermal FLIR).
            </p>
            <p style="margin:0; font-size:11px; opacity:0.9;">
              Access cut off: Foot trail blocked by minor scree drift. Ground team verification mandatory before operational rescue tasking.
            </p>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#64748b;">Status: AI-assisted thermal detection (Not confirmed survivors until ground contact)</span>
            <div style="display:flex; gap:6px;">
              <button class="btn-sm btn-secondary-white" onclick="inspectIsolatedStructure('ISO-01')">Inspect Area</button>
              <button class="btn-sm btn-secondary-white" onclick="requestFieldVerification('MISSED-POP')">Request Ground Team</button>
              <button class="btn-sm btn-primary-blue" onclick="openCreateRescueTaskModal('HUMAN', 'RES-001')">Create Rescue Task</button>
            </div>
          </div>
        </div>

        <!-- Card 3: Isolated Habitations -->
        <div class="card-white" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="margin:0; font-size:14px; color:#0f172a;">🏚️ Isolated Habitations & Stranded Dwellings (4 Structures)</h3>
            <span class="badge-status badge-red">4 Critical Structures</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${av.isolatedStructures.map(iso => `
              <div class="isolated-hab-item">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong>${iso.code} — ${iso.name}</strong>
                    <div style="font-size:10px; color:#64748b;">People est: <strong style="color:#0f172a;">${iso.peopleEstimate}</strong> • Distance to safe route: <strong>${iso.distanceFromSafeRouteKm} km</strong></div>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span class="badge-status ${iso.roadAccess === 'BLOCKED' ? 'badge-red' : 'badge-orange'}">${iso.roadAccess}</span>
                    <button class="btn-sm btn-secondary-white" onclick="inspectIsolatedStructure('${iso.id}')">Inspect</button>
                  </div>
                </div>
                <div style="font-size:10px; color:#475569; margin-top:4px;">
                  ⚠️ ${iso.notes}
                </div>
              </div>
            `).join("")}
          </div>
        </div>

      </div>

      <!-- RIGHT COLUMN -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        
        <!-- Card 4: Animal & Livestock Safety -->
        <div class="card-white" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <h3 style="margin:0; font-size:14px; color:#0f172a;">🐄 Animal & Livestock Safety Intelligence</h3>
              <small style="color:#64748b;">Post-Evacuation Livestock Inventory & Relocation Planning</small>
            </div>
            <span class="badge-status badge-orange">${ls.evacuationStatus}</span>
          </div>

          <!-- Separate Human & Animal Priority Banner -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0; background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0;">
            <div>
              <span style="font-size:10px; color:#64748b; display:block;">Human Life Priority</span>
              <strong style="color:#dc2626; font-size:12px;">CRITICAL (#1 Priority)</strong>
            </div>
            <div>
              <span style="font-size:10px; color:#64748b; display:block;">Animal Safety Priority</span>
              <strong style="color:#ea580c; font-size:12px;">HIGH (Operationally Planned)</strong>
            </div>
          </div>
          <p style="font-size:10px; color:#475569; margin:0 0 10px 0; line-height:1.3;">
            <em>"${ls.priorityExplanation}"</em>
          </p>

          <!-- Species Classification Table -->
          <table class="table-clean" style="width:100%; margin-bottom:10px;">
            <thead>
              <tr>
                <th>Species Category</th>
                <th>Estimated</th>
                <th>AI Detected</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${ls.speciesBreakdown.map(sp => `
                <tr>
                  <td><strong>${sp.species}</strong></td>
                  <td>${sp.estimated}</td>
                  <td><strong style="color:#059669;">${sp.detected}</strong></td>
                  <td><span class="badge-status badge-green">${sp.confidence}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <!-- Animal Blind-Spot / Verification Gap Card -->
          <div style="background:#fffbeb; border:1px solid #fef3c7; padding:8px 10px; border-radius:6px; margin-bottom:12px; font-size:11px; color:#92400e;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
              <strong>⚠️ ANIMAL VERIFICATION GAP: ${ls.unverifiedGap} Head Unaccounted For</strong>
              <button class="btn-sm btn-secondary-white" onclick="requestAdditionalAnimalScan()">Request Scan 🔄</button>
            </div>
            <p style="margin:0; font-size:10px; opacity:0.9;">
              ${ls.gapReason}
            </p>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; color:#64748b;">Holding Camp: <strong>${ls.holdingSite.name.split('(')[0]}</strong></span>
            <div style="display:flex; gap:6px;">
              <button class="btn-sm btn-secondary-white" onclick="openCreateRescueTaskModal('ANIMAL', 'ANIMAL-007')">
                Create Animal Task
              </button>
              <button class="btn-sm btn-primary-blue" onclick="openAnimalEvacuationPlanModal()">
                Generate Animal Evacuation Plan →
              </button>
            </div>
          </div>
        </div>

        <!-- Card 5: Road & Safe Site Verification (Closed-Loop Integration) -->
        <div class="card-white" style="padding:16px; border-left:4px solid ${AERIAL_STATE.roadR2Restricted ? '#dc2626' : '#ea580c'};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div>
              <span class="badge-status ${AERIAL_STATE.roadR2Restricted ? 'badge-red' : 'badge-orange'}">
                ${AERIAL_STATE.roadR2Restricted ? 'CLOSED-LOOP: ROUTE R2 RESTRICTED' : '⚠️ FIELD VERIFICATION REQUIRED'}
              </span>
              <h3 style="margin:4px 0 0 0; font-size:14px; color:#0f172a;">Critical Route Passability Telemetry: ${rv.routeCode}</h3>
              <small style="color:#64748b;">${rv.routeName}</small>
            </div>
            <span class="badge-status badge-blue">AI Conf: ${rv.aiConfidence}</span>
          </div>

          <div style="font-size:11px; color:#334155; background:#f8fafc; padding:8px; border-radius:6px; margin:8px 0;">
            <div><strong>Observation:</strong> ${rv.aerialObservation}</div>
            <div style="margin-top:2px;"><strong>Estimated Debris:</strong> ${rv.potholeOrSlideVolume}</div>
            <div style="margin-top:2px;"><strong>Database Status:</strong> <span class="badge-status ${AERIAL_STATE.roadR2Restricted ? 'badge-red' : 'badge-green'}">${AERIAL_STATE.roadR2Restricted ? 'RESTRICTED / BLOCKED' : 'OPEN'}</span></div>
          </div>

          <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:8px 10px; border-radius:6px; font-size:11px; color:#1e40af; margin-bottom:12px;">
            🔄 <strong>Closed-Loop Feedback:</strong> 
            ${AERIAL_STATE.roadR2Restricted
      ? 'Route R2 has been closed. Relocation engine automatically recalculated convoys to Route R3 (Plan B Activated)!'
      : 'Verifying this road obstruction will trigger instant automated re-routing in the Relocation Engine.'}
          </div>

          <div style="display:flex; justify-content:flex-end; gap:6px;">
            <button class="btn-sm btn-secondary-white" onclick="alert('Safe Site A Aerial Verification: Access road OPEN, crowd density MODERATE, perimeter secure.')">
              Verify Safe Site A
            </button>
            <button class="btn-sm ${AERIAL_STATE.roadR2Restricted ? 'btn-secondary-white' : 'btn-primary-blue'}" onclick="requestRoadVerificationAerial('R2')">
              ${AERIAL_STATE.roadR2Restricted ? '✓ R2 Blockage Verified (Plan B Active)' : '🚧 Request Road Verification & Trigger Re-Plan'}
            </button>
          </div>
        </div>

        <!-- Card 6: Aerial Directives & Active Rescue Tasks -->
        <div class="card-white" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="margin:0; font-size:14px; color:#0f172a;">🚨 Active Aerial Directives & Rescue Tasks</h3>
            <span class="badge-status badge-red">${av.rescueTasks.length} Active Tasks</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${av.rescueTasks.map(task => `
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <strong style="font-size:12px; color:#0f172a;">${task.id}: ${task.title}</strong>
                    <div style="font-size:10px; color:#64748b;">${task.village} • Target: <strong>${task.detectedPersons ? task.detectedPersons + ' persons' : task.animalCount + ' animals'}</strong></div>
                  </div>
                  <span class="badge-status ${task.status.includes('PENDING') ? 'badge-orange' : 'badge-green'}">${task.status}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; border-top:1px solid #f1f5f9; padding-top:4px;">
                  <span style="font-size:10px; color:#2563eb;">Corridor: ${task.groundAccess ? task.groundAccess.split(';')[0] : 'Normal'}</span>
                  <button class="btn-sm btn-secondary-white" onclick="advanceRescueTaskStatus('${task.id}')">Advance Task Status</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

      </div>

    </div>

    <!-- Drone Mission History Log Table -->
    <div class="card-white" style="margin-top:16px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <h3 style="margin:0; font-size:14px; color:#0f172a;">🛸 Drone Verification Mission History</h3>
          <small style="color:#64748b;">Recent Reconnaissance Sorties & Sensor Analytics Logs</small>
        </div>
        <button class="btn-sm btn-secondary-white" onclick="openCreateMissionModal()">+ Launch New Sortie</button>
      </div>

      <table class="table-clean" style="width:100%;">
        <thead>
          <tr>
            <th>Mission ID</th>
            <th>Target Village</th>
            <th>Mission Type</th>
            <th>Started</th>
            <th>Area Coverage</th>
            <th>Critical Findings</th>
            <th>AI Confidence</th>
            <th>Status</th>
            <th>Inspect</th>
          </tr>
        </thead>
        <tbody>
          ${av.missionHistory.map(mLog => `
            <tr onclick="openMissionDetailsModal('${mLog.id}')">
              <td><strong>${mLog.id}</strong></td>
              <td>${mLog.village}</td>
              <td>${mLog.missionType}</td>
              <td>${mLog.started}</td>
              <td><strong>${mLog.coverage}</strong></td>
              <td><small>${mLog.findings}</small></td>
              <td><span class="badge-status badge-blue">${mLog.confidence}</span></td>
              <td><span class="badge-status ${mLog.status === 'Completed' ? 'badge-green' : 'badge-orange'}">${mLog.status}</span></td>
              <td><button class="btn-sm btn-secondary-white" onclick="event.stopPropagation(); openMissionDetailsModal('${mLog.id}')">Details</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- Technical Explanation & Methodology Panel -->
    <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:16px; margin-top:16px;">
      
      <!-- Flowchart Explanation -->
      <div class="card-white" style="padding:16px;">
        <h4 style="margin-top:0; font-size:13px; color:#0f172a;">⚙️ How Rapid Aerial Verification Works</h4>
        <div class="aerial-workflow-stepper">
          <div class="stepper-node"><span>1</span> Imagery Ingest (RGB / FLIR)</div>
          <span class="stepper-arrow">→</span>
          <div class="stepper-node"><span>2</span> Edge Object Detection</div>
          <span class="stepper-arrow">→</span>
          <div class="stepper-node"><span>3</span> Confidence Scoring</div>
          <span class="stepper-arrow">→</span>
          <div class="stepper-node"><span>4</span> Field Scout Verification</div>
          <span class="stepper-arrow">→</span>
          <div class="stepper-node highlight"><span>5</span> Closed-Loop Re-Plan</div>
        </div>
        <p style="font-size:11px; color:#475569; margin:10px 0 0 0; line-height:1.4;">
          The system bridges high-altitude evacuation planning with low-altitude ground reality. Detections provide decision support alerts to DEOC command; they do NOT automatically trigger aircraft or resource dispatch.
        </p>
      </div>

      <!-- Limitations Panel -->
      <div class="card-white" style="padding:16px; background:#f8fafc;">
        <h4 style="margin-top:0; font-size:13px; color:#0f172a;">⚠️ Technical Limitations & Operational Safeguards</h4>
        <ul style="font-size:11px; color:#64748b; padding-left:16px; line-height:1.5; margin:0;">
          <li>AI object detection is probabilistic and subject to mountain fog attenuation.</li>
          <li>Thermal heat signatures may produce false positives from warm rocks or tin roofs.</li>
          <li>Animal classification does not guarantee exact species counts.</li>
          <li>Ground verification by SDRF / DEOC personnel is required before kinetic rescue.</li>
          <li>Drone operations adhere to DGCA / Ministry of Civil Aviation mountain corridor rules.</li>
        </ul>
      </div>

    </div>

    <!-- Bottom Final Concept Banner -->
    <div class="preparedness-alert-bar" style="margin-top:16px; background:#0f172a; color:#f8fafc; border-left:4px solid #38bdf8;">
      <div class="alert-left-text" style="color:#f8fafc;">
        <span style="font-size:16px;">🛡️</span>
        <span style="font-size:12px;">
          <strong>SANKATMOCHAN does not stop at planning evacuation.</strong> 
          It verifies whether the planned relocation actually matches the ground situation — and helps authorities respond when it doesn't.
        </span>
      </div>
      <span class="badge-status badge-blue">PLAN → ACT → VERIFY → RESPOND → RE-PLAN</span>
    </div>
  `;
}

/**
 * Switch Sensor Vision Mode (RGB / THERMAL / COMBINED)
 */
function setAerialVisionMode(mode) {
  AERIAL_STATE.activeSensorMode = mode;
  renderAerialVerificationView();
  showSystemToast(`Vision sensor switched to: ${mode} MODE`);
}

/**
 * Open Modal to Configure a Verification Mission
 */
function openCreateMissionModal() {
  const modal = document.getElementById("modal-create-mission");
  if (modal) modal.classList.add("open");
}

/**
 * Start a Configured Drone Mission
 */
function startConfiguredDroneMission() {
  closeAllModals();
  showSystemToast("🛸 Drone UAV-QRT-01 tasking approved: Sortie departing from Gopeshwar Helipad to Village A Sector 4...");

  setTimeout(() => {
    runAerialFlightDemo();
  }, 1000);
}

/**
 * Automated 10-Second Aerial Flight Demo
 * Moves drone marker along path, reveals detections, detects mismatch, triggers re-routing!
 */
function runAerialFlightDemo() {
  if (AERIAL_STATE.isMissionRunning) return;

  AERIAL_STATE.isMissionRunning = true;
  AERIAL_STATE.flightStepIndex = 0;

  // Make sure we are on the aerial verification view
  switchView("aerial-verification");

  showSystemToast("🛰️ Commencing simulated drone flight over Village A (Pipal Terraces)...");

  const waypoints = [
    { x: 100, y: 100, text: "Sortie initiated: UAV-QRT-01 entering Village A airspace (120m AGL)" },
    { x: 230, y: 125, text: "Sensors scanning Upper Hamlet: 14 humans detected (91% confidence)" },
    { x: 370, y: 105, text: "Temple Ledge: 9 sheltered individuals verified by thermal FLIR" },
    { x: 460, y: 175, text: "East Terraces: 42 Cattle and 68 Goats identified in holding corrals" },
    { x: 490, y: 155, text: "Route R2 km 6.8: Debris blockage detected! 45m³ scree fan on outbound lane!" },
    { x: 560, y: 235, text: "CRITICAL MISMATCH: 18 potential missed persons detected at Old School Terrace!" },
    { x: 620, y: 150, text: "Survey complete: Generating aerial directives and re-routing convoys..." }
  ];

  AERIAL_STATE.flightTimer = setInterval(() => {
    const wp = waypoints[AERIAL_STATE.flightStepIndex];
    if (wp) {
      AERIAL_STATE.dronePosition = { x: wp.x, y: wp.y };

      const droneSvg = document.getElementById("svg-drone-icon");
      if (droneSvg) {
        droneSvg.setAttribute("transform", `translate(${wp.x}, ${wp.y})`);
      }

      showSystemToast(wp.text);
      AERIAL_STATE.flightStepIndex++;
    }

    if (AERIAL_STATE.flightStepIndex >= waypoints.length) {
      clearInterval(AERIAL_STATE.flightTimer);
      AERIAL_STATE.isMissionRunning = false;

      // Automatically trigger closed-loop re-routing!
      setTimeout(() => {
        requestRoadVerificationAerial("R2");
      }, 1500);
    }
  }, 1800);
}

/**
 * Closed-Loop Handler: Aerial Road Verification & Re-Routing
 */
function requestRoadVerificationAerial(routeCode = "R2") {
  AERIAL_STATE.roadR2Restricted = true;

  // Recalculate relocation mission using closed-loop engine hook
  const result = RakshaEngine.applyAerialRoadVerification(routeCode, true);
  APP_STATE.activePlan = result.updatedPlan;

  // Refresh top metrics, map layers, and views
  renderTopMetrics();
  renderMapLayers();
  renderAerialVerificationView();

  showSystemToast("🚨 CLOSED-LOOP RE-PLAN: Route R2 confirmed RESTRICTED by Drone. Relocation engine has automatically re-routed convoys to Route R3 (Plan B Activated)!");
}

/**
 * Open Animal Evacuation Plan Modal
 */
function openAnimalEvacuationPlanModal() {
  const modal = document.getElementById("modal-animal-plan");
  const content = document.getElementById("modal-animal-content");
  if (!modal || !content) return;

  const plan = RakshaEngine.generateAnimalEvacuationPlan("VIL-01");
  const ls = RAKSHA_DATA.aerialVerification.livestock;

  content.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="badge-status badge-green">EVACUATION PLAN: ${plan.status}</span>
        <span style="font-size:11px; color:#64748b;">Target: <strong>${plan.animalsCount} animals</strong></span>
      </div>

      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px; border-radius:6px; font-size:12px; color:#166534; margin:8px 0;">
        <strong>Holding Facility:</strong> ${plan.holdingSiteName}<br>
        <strong>Capacity:</strong> ${plan.holdingCapacity} animals • <strong>Water:</strong> ${plan.waterStatus} • <strong>Feed Rations:</strong> ${plan.feedStock}
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:12px;">
        <div style="background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0;">
          <strong>Transport Requisition:</strong><br>
          ${plan.transportAssets}
        </div>
        <div style="background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #e2e8f0;">
          <strong>Designated Animal Corridor:</strong><br>
          ${plan.designatedRoute}
        </div>
      </div>

      <div style="background:#fffbeb; border:1px solid #fef3c7; padding:8px; border-radius:6px; font-size:11px; color:#92400e; margin-bottom:14px;">
        ⚖️ <strong>Operational Priority Separation:</strong> Human life evacuation (${plan.humanPriority}) proceeds first. Animal evacuation (${plan.animalPriority}) is executed by dedicated Animal Husbandry convoys immediately following human clearance.
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn-secondary-white" onclick="closeAllModals()">Close</button>
        <button class="btn-primary-blue" onclick="showSystemToast('Animal evacuation plan dispatched to District Chief Veterinary Officer & Mandi Transport pool.'); closeAllModals();">
          Approve & Mobilize Animal Convoys 🐄
        </button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

/**
 * Open Modal to Create a Rescue Priority Task
 */
function openCreateRescueTaskModal(type = "HUMAN", targetId = "RES-001") {
  const modal = document.getElementById("modal-create-rescue-task");
  const title = document.getElementById("rescue-modal-title");
  const content = document.getElementById("rescue-modal-content");
  if (!modal || !content) return;

  const isHuman = type === "HUMAN";
  title.textContent = isHuman ? "Create Human Rescue Priority Task" : "Create Animal Rescue Task";

  content.innerHTML = `
    <div>
      <div style="font-size:12px; color:#475569; margin-bottom:12px;">
        Generate an actionable emergency response task for DEOC dispatch and SDRF/NDRF QRT coordination:
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; font-size:12px;">
        <div>
          <label style="font-weight:700; color:#0f172a; display:block; margin-bottom:4px;">Task Identifier</label>
          <input type="text" id="task-input-id" value="${targetId}" class="input-clean" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px;" readonly>
        </div>

        <div>
          <label style="font-weight:700; color:#0f172a; display:block; margin-bottom:4px;">Location / Sector</label>
          <input type="text" id="task-input-loc" value="${isHuman ? 'Village A — Sector 4 (Old School Terrace)' : 'Village A — East Cluster Corrals'}" class="input-clean" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label style="font-weight:700; color:#0f172a; display:block; margin-bottom:4px;">${isHuman ? 'Estimated Persons' : 'Estimated Animals'}</label>
            <input type="number" id="task-input-count" value="${isHuman ? '18' : '56'}" class="input-clean" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
          <div>
            <label style="font-weight:700; color:#0f172a; display:block; margin-bottom:4px;">Priority</label>
            <select id="task-input-prio" class="input-clean" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px;">
              <option value="CRITICAL" ${isHuman ? 'selected' : ''}>CRITICAL</option>
              <option value="HIGH" ${!isHuman ? 'selected' : ''}>HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
            </select>
          </div>
        </div>

        <div>
          <label style="font-weight:700; color:#0f172a; display:block; margin-bottom:4px;">Ground Access Feasibility</label>
          <input type="text" id="task-input-access" value="Route R2 restricted; Access via Route R3 South Ridge Trail" class="input-clean" style="width:100%; padding:7px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
        <button class="btn-secondary-white" onclick="closeAllModals()">Cancel</button>
        <button class="btn-primary-blue" onclick="saveNewRescueTask('${type}')">
          Save & Dispatch Task
        </button>
      </div>
    </div>
  `;

  modal.classList.add("open");
}

function saveNewRescueTask(type) {
  closeAllModals();
  const isHuman = type === "HUMAN";
  showSystemToast(`✅ ${isHuman ? 'Human' : 'Animal'} rescue priority task logged with DEOC Command. Status: PENDING AUTHORITY ACTION.`);
  renderAerialVerificationView();
}

function advanceRescueTaskStatus(taskId) {
  const task = RAKSHA_DATA.aerialVerification.rescueTasks.find(t => t.id === taskId);
  if (!task) return;

  const cycle = {
    "PENDING AUTHORITY ACTION": "ASSIGNED TO QRT",
    "ASSIGNED TO QRT": "IN TRANSIT / RESCUE",
    "IN TRANSIT / RESCUE": "COMPLETED / SHELTERED",
    "COMPLETED / SHELTERED": "PENDING AUTHORITY ACTION"
  };

  task.status = cycle[task.status] || "ASSIGNED TO QRT";
  showSystemToast(`Updated: ${task.id} status changed to '${task.status}'.`);
  renderAerialVerificationView();
}

function requestFieldVerification(topic) {
  showSystemToast(`🛰️ Field verification request logged for ${topic}. SDRF Ground Recon Team #2 dispatched for physical check.`);
}

function requestAdditionalAnimalScan() {
  showSystemToast("🛸 Drone assigned secondary low-altitude thermal sweep over East Ravine tree canopy for 56 unaccounted livestock.");
}

function inspectIsolatedStructure(isoId) {
  const iso = RAKSHA_DATA.aerialVerification.isolatedStructures.find(item => item.id === isoId) || RAKSHA_DATA.aerialVerification.isolatedStructures[0];
  alert(`ISOLATED DWELLING REPORT:
Name: ${iso.name} (${iso.code})
Estimated People: ${iso.peopleEstimate}
Road Passability: ${iso.roadAccess}
Distance from Primary Route: ${iso.distanceFromSafeRouteKm} km
Observation: ${iso.notes}
Priority: ${iso.priority}`);
}

function openMissionDetailsModal(missionId) {
  const mLog = RAKSHA_DATA.aerialVerification.missionHistory.find(m => m.id === missionId) || RAKSHA_DATA.aerialVerification.missionHistory[0];
  alert(`DRONE MISSION LOG: ${mLog.id}
Target: ${mLog.village} (${mLog.missionType})
Started: ${mLog.started}
Coverage: ${mLog.coverage}
Telemetry Findings: ${mLog.findings}
AI Model Confidence: ${mLog.confidence}
Status: ${mLog.status}`);
}

/**
 * Section 21 Alert Handlers
 */
function acknowledgeAerialAlert() {
  AERIAL_STATE.alertAcknowledged = true;
  showSystemToast("✅ AERIAL ALERT ACKNOWLEDGED: DEOC Command logged reconnaissance mismatch findings.");
  renderAerialVerificationView();
}

function requestFieldTeamDeployment() {
  showSystemToast("🛰️ FIELD TEAM DEPLOYMENT: SDRF Ground Scout Team #2 dispatched to Village A Sector 4 for physical verification.");
}

function recalculateFromAerialAlert() {
  requestRoadVerificationAerial("R2");
}

/**
 * Section 22 Field Verification Status Workflow Cycle Handler:
 * AI DETECTED -> FIELD VERIFICATION REQUESTED -> FIELD VERIFIED -> FALSE POSITIVE -> RESCUE REQUIRED
 */
function cycleDetectionStatus(detId) {
  const det = RAKSHA_DATA.aerialVerification.humanDetections.find(d => d.id === detId);
  if (!det) return;

  const statuses = [
    "AI ESTIMATE",
    "FIELD VERIFICATION REQUESTED",
    "FIELD VERIFIED",
    "FALSE POSITIVE",
    "RESCUE REQUIRED"
  ];

  let currentIdx = statuses.indexOf(det.verificationStatus);
  if (currentIdx === -1) currentIdx = 0;
  const nextIdx = (currentIdx + 1) % statuses.length;
  det.verificationStatus = statuses[nextIdx];

  showSystemToast(`📋 Verification Status for ${det.id} updated to: ${det.verificationStatus}`);
  renderAerialVerificationView();
}

/* ==========================================================================
   23. REAL-TIME WEATHER API INTEGRATION (OPEN-METEO)
   ========================================================================== */
const RakshaWeather = {
  activeVillageId: "VIL-01",
  cache: {}, // villageId -> { data, timestamp, isLive }
  isDemoMode: false,

  // WMO Weather Interpretation Codes (0-99)
  wmoCodes: {
    0: { text: "Clear Sky", icon: "☀️" },
    1: { text: "Mainly Clear", icon: "🌤️" },
    2: { text: "Partly Cloudy", icon: "⛅" },
    3: { text: "Overcast", icon: "☁️" },
    45: { text: "Fog", icon: "🌫️" },
    48: { text: "Depositing Rime Fog", icon: "🌫️" },
    51: { text: "Light Drizzle", icon: "🌦️" },
    53: { text: "Moderate Drizzle", icon: "🌦️" },
    55: { text: "Dense Drizzle", icon: "🌧️" },
    61: { text: "Slight Rain", icon: "🌧️" },
    63: { text: "Moderate Rain", icon: "🌧️" },
    65: { text: "Heavy Rain", icon: "🌧️🌧️" },
    71: { text: "Slight Snow", icon: "❄️" },
    73: { text: "Moderate Snow", icon: "❄️" },
    75: { text: "Heavy Snow", icon: "❄️❄️" },
    80: { text: "Rain Showers", icon: "🌧️" },
    81: { text: "Moderate Showers", icon: "🌧️" },
    82: { text: "Violent Showers", icon: "⛈️" },
    95: { text: "Thunderstorm", icon: "⛈️" },
    96: { text: "Thunderstorm with Hail", icon: "⛈️" }
  },

  async initWeather(villageId) {
    this.activeVillageId = villageId || "VIL-01";
    await this.fetchVillageWeather(this.activeVillageId);
  },

  async fetchVillageWeather(villageId, forceRefresh = false) {
    this.activeVillageId = villageId;
    const v = RAKSHA_DATA.villages.find(vil => vil.id === villageId) || RAKSHA_DATA.villages[0];
    const [lat, lng] = v.coords;

    // Check memory cache (10 min validity)
    const now = Date.now();
    if (!forceRefresh && this.cache[villageId] && (now - this.cache[villageId].timestamp < 600000)) {
      this.applyWeatherData(this.cache[villageId].data, this.cache[villageId].isLive);
      return;
    }

    if (this.isDemoMode || APP_STATE.networkMode === "CELLULAR_OUTAGE") {
      this.useSimulatedWeather(v);
      return;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m&forecast_days=2&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this.cache[villageId] = {
        data: data,
        timestamp: now,
        isLive: true
      };
      this.applyWeatherData(data, true);
    } catch (err) {
      console.warn("Open-Meteo API fetch failed or network offline:", err);
      if (this.cache[villageId]) {
        this.applyWeatherData(this.cache[villageId].data, false);
      } else {
        this.useSimulatedWeather(v);
      }
    }
  },

  useSimulatedWeather(village) {
    const simData = {
      current: {
        temperature_2m: 16.8,
        precipitation: 14.2,
        relative_humidity_2m: 86,
        wind_speed_10m: 24.5,
        weather_code: 65
      },
      hourly: {
        time: ["Now", "+3h", "+6h", "+12h", "+24h"],
        precipitation_probability: [75, 88, 92, 60, 35],
        precipitation: [14.2, 22.0, 31.5, 8.2, 1.0],
        temperature_2m: [16.8, 15.2, 14.0, 13.5, 17.0],
        wind_speed_10m: [24.5, 32.0, 38.5, 18.0, 10.0],
        weather_code: [65, 82, 95, 61, 2]
      }
    };
    this.applyWeatherData(simData, false);
  },

  applyWeatherData(data, isLive) {
    APP_STATE.weather.current = data;
    APP_STATE.weather.isAvailable = isLive || !!data;
    APP_STATE.weather.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Evaluate rule-based Weather Risk Signal (Decision Support Only)
    const cur = data.current || {};
    const rain = cur.precipitation !== undefined ? cur.precipitation : (cur.rain || 0);
    const wind = cur.wind_speed_10m || 0;
    const maxProb = data.hourly && data.hourly.precipitation_probability
      ? Math.max(...data.hourly.precipitation_probability.slice(0, 24))
      : 50;

    let riskSignal = "NORMAL";
    let deterioration = false;

    if (rain >= 20 || (rain >= 10 && wind >= 35) || (maxProb >= 85 && rain >= 12)) {
      riskSignal = "CRITICAL";
      deterioration = true;
    } else if (rain >= 8 || maxProb >= 65 || wind >= 30) {
      riskSignal = "HIGH";
      deterioration = true;
    } else if (rain >= 2 || maxProb >= 40) {
      riskSignal = "WATCH";
    }

    APP_STATE.weather.riskSignal = riskSignal;
    APP_STATE.weather.deteriorationDetected = deterioration;

    // Connect Weather -> Relocation Engine (Constrain window and routes)
    if (deterioration) {
      APP_STATE.simulations.weatherRiskImpact = true;
    } else {
      APP_STATE.simulations.weatherRiskImpact = false;
    }

    this.renderWeatherUI(data, isLive);
    renderTopMetrics();
  },

  renderWeatherUI(data, isLive) {
    const cur = data.current || {};
    const code = cur.weather_code || 0;
    const info = this.wmoCodes[code] || { text: "Cloudy", icon: "☁️" };
    const temp = cur.temperature_2m !== undefined ? Math.round(cur.temperature_2m) : 17;
    const rain = cur.precipitation !== undefined ? cur.precipitation : (cur.rain || 0);
    const humidity = cur.relative_humidity_2m !== undefined ? cur.relative_humidity_2m : 82;
    const wind = cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m) : 18;

    const prob = (data.hourly && data.hourly.precipitation_probability && data.hourly.precipitation_probability[0] !== undefined)
      ? data.hourly.precipitation_probability[0]
      : (rain > 5 ? 78 : 35);

    // Update Live Weather Card in Command Center
    const iconEl = document.getElementById("weather-condition-icon");
    const badgeEl = document.getElementById("weather-risk-badge");
    const probEl = document.getElementById("weather-prob-text");
    const rainEl = document.getElementById("weather-rain-text");
    const windEl = document.getElementById("weather-wind-text");
    const humEl = document.getElementById("weather-humidity-text");
    const updateEl = document.getElementById("weather-update-text");

    if (iconEl) iconEl.textContent = info.icon;
    if (badgeEl) {
      badgeEl.textContent = `Risk: ${APP_STATE.weather.riskSignal}`;
      badgeEl.className = `weather-risk-badge risk-${APP_STATE.weather.riskSignal.toLowerCase()}`;
    }
    if (probEl) probEl.textContent = `${prob}% precip prob`;
    if (rainEl) rainEl.textContent = `Rain: ${rain} mm`;
    if (windEl) windEl.textContent = `Wind: ${wind} km/h`;
    if (humEl) humEl.textContent = `Humidity: ${humidity}%`;
    if (updateEl) {
      const modeText = isLive ? "Live (Open-Meteo)" : "Cached / Simulated";
      updateEl.textContent = `Updated: ${APP_STATE.weather.lastUpdated} • ${modeText}`;
    }

    // Update 24h Timeline strip
    const forecastNodes = document.getElementById("weather-forecast-nodes");
    if (forecastNodes) {
      const times = ["NOW", "+3h", "+6h", "+12h", "+24h"];
      let hourlyProbs = [prob, Math.min(100, prob + 15), Math.min(100, prob + 25), Math.max(20, prob - 10), Math.max(10, prob - 30)];
      let hourlyRains = [rain, +(rain * 1.4).toFixed(1), +(rain * 1.8).toFixed(1), +(rain * 0.6).toFixed(1), +(rain * 0.2).toFixed(1)];
      let hourlyTemps = [temp, temp - 1, temp - 2, temp - 3, temp + 1];

      if (data.hourly && data.hourly.precipitation_probability) {
        const hp = data.hourly.precipitation_probability;
        const hr = data.hourly.precipitation || data.hourly.rain || [];
        const ht = data.hourly.temperature_2m || [];
        hourlyProbs = [hp[0] || prob, hp[3] || hp[0] || prob, hp[6] || hp[0] || prob, hp[12] || hp[0] || prob, hp[24] || hp[0] || prob];
        hourlyRains = [hr[0] !== undefined ? hr[0] : rain, hr[3] || 0, hr[6] || 0, hr[12] || 0, hr[24] || 0];
        hourlyTemps = [ht[0] ? Math.round(ht[0]) : temp, ht[3] ? Math.round(ht[3]) : temp, ht[6] ? Math.round(ht[6]) : temp, ht[12] ? Math.round(ht[12]) : temp, ht[24] ? Math.round(ht[24]) : temp];
      }

      forecastNodes.innerHTML = times.map((t, idx) => `
        <div class="weather-forecast-node">
          <div class="forecast-time-label">${t}</div>
          <div class="forecast-rain-prob ${hourlyProbs[idx] >= 65 ? 'high' : ''}">${hourlyProbs[idx]}%</div>
          <div class="forecast-precip-val">${hourlyRains[idx]}mm</div>
          <div class="forecast-temp-val">${hourlyTemps[idx]}°C</div>
        </div>
      `).join("");
    }

    // Weather Deterioration Banner
    const warningEl = document.getElementById("weather-deterioration-alert");
    if (warningEl) {
      if (APP_STATE.weather.deteriorationDetected) {
        warningEl.style.display = "flex";
      } else {
        warningEl.style.display = "none";
      }
    }
  },

  toggleDemoMode() {
    this.isDemoMode = !this.isDemoMode;
    const btn = document.getElementById("btn-weather-demo-toggle");
    if (btn) {
      btn.textContent = this.isDemoMode ? "Mode: SIMULATED DEMO" : "Mode: REAL LIVE API";
      btn.className = this.isDemoMode ? "btn-sm btn-secondary-white" : "btn-sm btn-primary-blue";
    }
    showSystemToast(this.isDemoMode ? "Weather switched to SIMULATED DEMO DATA" : "Weather switched to REAL-TIME Open-Meteo API");
    this.fetchVillageWeather(this.activeVillageId, true);
  }
};

// Export to window
if (typeof window !== "undefined") {
  window.RakshaWeather = RakshaWeather;
}

/* ==========================================================================
   24. NDRF RESPONSE DASHBOARD CONTROLLER (/ndrf)
   ========================================================================== */
function renderNdrfResponseView() {
  const container = document.getElementById("ndrf-view-container");
  if (!container) return;

  const alerts = window.NDRF_DATA ? window.NDRF_DATA.rescueAlerts : [];
  const animals = window.NDRF_DATA ? window.NDRF_DATA.animalRescues : [];
  const access = window.NDRF_DATA ? window.NDRF_DATA.emergencyAccess : {};

  container.innerHTML = `
    <div class="view-header-row">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <h2 style="margin:0; font-size:18px;">NDRF Response Dashboard</h2>
          <span class="badge-status badge-red">🚨 TACTICAL ACTION VIEW</span>
          <span class="badge-status badge-blue">Unit: 11 BN NDRF (Gopeshwar QRT)</span>
        </div>
        <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">
          Direct action dashboard for field rescue teams and tactical disaster response coordination.
        </p>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn-secondary-white" onclick="switchRole('authority')">
          <span>🏛️</span> Authority Command
        </button>
        <button class="btn-primary-blue" onclick="runDemoScenario()">
          <span>⚡</span> Run 30s Demo Flow
        </button>
      </div>
    </div>

    <!-- Active Rescue Alerts Section -->
    <div style="margin-top:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3 style="margin:0; font-size:14px; color:#0f172a;">ACTIVE RESCUE ALERTS</h3>
        <span class="badge-status badge-red">${alerts.length} Pending Actions</span>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        ${alerts.map(alert => `
          <div class="ndrf-alert-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <div>
                <h4 style="margin:0; font-size:15px; color:#0f172a;">${alert.villageName}</h4>
                <div style="font-size:11px; color:#dc2626; font-weight:700; margin-top:2px;">
                  Priority: ${alert.priority}
                </div>
              </div>
              <span class="task-workflow-badge ${getWorkflowClass(alert.status)}" onclick="cycleNdrfTaskStatus('${alert.id}')" style="cursor:pointer;" title="Click to advance status">
                ${alert.status} ↻
              </span>
            </div>

            <div style="font-size:12px; color:#334155; line-height:1.5; margin-bottom:10px;">
              <div>👥 <strong>Potential persons detected:</strong> <span class="text-red font-bold">${alert.potentialPersons}</span></div>
              <div>🛣️ <strong>Road status:</strong> ${alert.roadStatus}</div>
              <div>📍 <strong>Nearest access:</strong> ${alert.nearestAccess}</div>
              <div style="font-size:11px; color:#64748b; margin-top:4px;">${alert.details}</div>
            </div>

            <div style="display:flex; gap:8px;">
              <button class="btn-sm btn-secondary-white" style="flex:1;" onclick="openNdrfLocationModal('${alert.villageId}')">
                VIEW LOCATION
              </button>
              <button class="btn-sm btn-primary-blue" style="flex:1; background:${alert.status === 'RESOLVED' ? '#16a34a' : '#2563eb'}; border-color:${alert.status === 'RESOLVED' ? '#16a34a' : '#2563eb'};" onclick="cycleNdrfTaskStatus('${alert.id}')">
                ${alert.status === 'ALERT RECEIVED' ? 'ACCEPT TASK' : (alert.status === 'TASK ACCEPTED' ? 'START RESPONSE' : (alert.status === 'RESPONSE IN PROGRESS' ? 'MARK RESOLVED' : 'RESOLVED ✓'))}
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Animal Rescue Section -->
    <div style="margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3 style="margin:0; font-size:14px; color:#0f172a;">ANIMAL RESCUE</h3>
        <span class="badge-status badge-orange">Livestock Protection</span>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        ${animals.map(an => `
          <div class="card-white" style="padding:14px; border-left:4px solid #f59e0b;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <h4 style="margin:0; font-size:14px; color:#0f172a;">${an.villageName}</h4>
              <span class="badge-status badge-orange">${an.priority}</span>
            </div>
            <div style="font-size:12px; color:#334155; line-height:1.5; margin-bottom:10px;">
              <div>🐄 <strong>Potential livestock requiring assistance:</strong> <strong>${an.estimatedLivestock}</strong></div>
              <div>⛺ <strong>Designated holding:</strong> ${an.holdingSite}</div>
              <div style="font-size:11px; color:#64748b; margin-top:4px;">${an.details}</div>
            </div>
            <div style="display:flex; justify-content:flex-end;">
              <button class="btn-sm btn-secondary-white" onclick="openAnimalEvacuationPlanModal()">
                VIEW TASK
              </button>
            </div>
          </div>
        `).join("")}

        <!-- Emergency Access Card -->
        <div class="card-white" style="padding:14px; border-left:4px solid #dc2626;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <h4 style="margin:0; font-size:14px; color:#0f172a;">EMERGENCY ACCESS — ${access.villageName || 'Village A'}</h4>
            <span class="badge-status badge-red">BLOCKED</span>
          </div>
          <div style="font-size:12px; color:#334155; line-height:1.5; margin-bottom:10px;">
            <div>🛑 <strong>Ground access:</strong> <span class="text-red font-bold">${access.groundAccess || 'BLOCKED'}</span></div>
            <div>🛸 <strong>Recommended corridor:</strong> ${access.recommendedBackupCorridor || 'Route R3 Ridge Trail'}</div>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">
              Helipads: ${access.helipads ? access.helipads.map(h => h.name).join(', ') : 'H-1 Clear'}
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn-sm btn-primary-blue" style="background:#dc2626; border-color:#b91c1c;" onclick="openAlternativeAccessModal()">
              ASSESS ALTERNATIVE ACCESS
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- NDRF Workflow Reference Bar -->
    <div class="preparedness-alert-bar" style="margin-top:20px; background:#f8fafc; border-left:4px solid #2563eb;">
      <div class="alert-left-text">
        <span>⚡</span>
        <span style="font-size:12px; color:#334155;">
          <strong>NDRF Action Workflow:</strong>
          <code>ALERT RECEIVED → TASK ACCEPTED → RESPONSE IN PROGRESS → RESOLVED</code>.
          Actionable, 1-click status updates without complex bureaucratic paperwork.
        </span>
      </div>
    </div>
  `;
}

function getWorkflowClass(status) {
  if (status === "ALERT RECEIVED") return "received";
  if (status === "TASK ACCEPTED") return "accepted";
  if (status === "RESPONSE IN PROGRESS") return "in-progress";
  if (status === "RESOLVED") return "resolved";
  return "received";
}

function cycleNdrfTaskStatus(taskId) {
  if (!window.NDRF_DATA || !window.NDRF_DATA.rescueAlerts) return;
  const alert = window.NDRF_DATA.rescueAlerts.find(a => a.id === taskId);
  if (!alert) return;

  const cycle = {
    "ALERT RECEIVED": "TASK ACCEPTED",
    "TASK ACCEPTED": "RESPONSE IN PROGRESS",
    "RESPONSE IN PROGRESS": "RESOLVED",
    "RESOLVED": "ALERT RECEIVED"
  };

  alert.status = cycle[alert.status] || "ALERT RECEIVED";
  showSystemToast(`NDRF Task ${alert.id} status updated to: ${alert.status}`);
  renderNdrfResponseView();
}

function openNdrfLocationModal(villageId) {
  selectVillage(villageId);
  switchView("command-center");
  showSystemToast(`Map centered on ${villageId}. Highlighting active hazard area.`);
}

function openAlternativeAccessModal() {
  switchView("emergency-access");
}

/* ==========================================================================
   25. ALERT SYSTEM & GOVERNMENT CELL BROADCAST INTEGRATION
   ========================================================================== */
function openSendAlertModal() {
  const modal = document.getElementById("modal-send-alert");
  if (modal) modal.classList.add("open");
}

function triggerNdrfAlertDispatch() {
  closeAllModals();

  if (APP_STATE.networkMode === "CELLULAR_OUTAGE") {
    APP_STATE.offlineQueue.push({ type: "NDRF_ALERT", time: new Date() });
    const countEl = document.getElementById("offline-queued-count");
    if (countEl) countEl.textContent = `Queued offline actions: ${APP_STATE.offlineQueue.length}`;
    showSystemToast("⚠️ CELLULAR OUTAGE: NDRF alert queued locally for fallback radio / satellite transmission.");
    return;
  }

  if (window.GovernmentAlertProvider) {
    window.GovernmentAlertProvider.dispatchNdrfAlert({
      village: "Village A",
      priority: "CRITICAL",
      potentialPersons: 18,
      road: "R2 blocked"
    });
  }

  showSystemToast("🚨 NDRF RESPONSE ALERT DISPATCHED: Village A • Priority CRITICAL • 18 potential persons • Road R2 blocked.");
}

function triggerPublicAlertDispatch() {
  closeAllModals();

  if (APP_STATE.networkMode === "CELLULAR_OUTAGE") {
    APP_STATE.offlineQueue.push({ type: "PUBLIC_ALERT", time: new Date() });
    const countEl = document.getElementById("offline-queued-count");
    if (countEl) countEl.textContent = `Queued offline actions: ${APP_STATE.offlineQueue.length}`;
    showSystemToast("⚠️ CELLULAR OUTAGE: Public alert queued locally. Fallback loud-hailer / radio alert required.");
    return;
  }

  if (window.GovernmentAlertProvider) {
    window.GovernmentAlertProvider.dispatchPublicAlert({
      village: "Village A",
      hazard: "Flash Flood + Landslide",
      safeSite: "Safe Site A / B",
      route: "R2 (Avoid R1)"
    });
  }

  showSystemToast("📢 PUBLIC ALERT DISPATCHED: Broadcast via simulated Cell Broadcast, SMS, and App notification.");
}

/* ==========================================================================
   26. NETWORK STATUS SIMULATION & OFFLINE RESILIENCE
   ========================================================================== */
function openNetworkStatusModal() {
  const modal = document.getElementById("modal-network-status");
  if (modal) modal.classList.add("open");
}

function setNetworkMode(mode) {
  closeAllModals();
  APP_STATE.networkMode = mode;

  const btn = document.getElementById("btn-network-status");
  if (!btn) return;

  if (mode === "NORMAL") {
    btn.textContent = "🟢 NETWORK NORMAL";
    btn.className = "btn-network-pill normal";
    showSystemToast("🟢 NETWORK NORMAL: Cell Broadcast, SMS, and App notification gateways active.");
    if (APP_STATE.offlineQueue.length > 0) {
      showSystemToast(`Queued alert delivery resumed. ${APP_STATE.offlineQueue.length} queued messages dispatched.`);
      APP_STATE.offlineQueue = [];
      const countEl = document.getElementById("offline-queued-count");
      if (countEl) countEl.textContent = "Queued offline actions: 0";
    }
  } else if (mode === "DEGRADED") {
    btn.textContent = "🟡 NETWORK DEGRADED";
    btn.className = "btn-network-pill degraded";
    showSystemToast("🟡 NETWORK DEGRADED: Cell Broadcast active; SMS retry and App notification retries engaged.");
  } else if (mode === "CELLULAR_OUTAGE") {
    btn.textContent = "🔴 CELLULAR OUTAGE";
    btn.className = "btn-network-pill outage";
    showSystemToast("🔴 CELLULAR OUTAGE: Cellular network unavailable. Digital alerts queued. Fallback communication required: Radio / Satellite / Field patrols.");
  }
}

function syncOfflineCache() {
  showSystemToast("🔄 OFFLINE CACHE SYNCHRONIZED: Refreshed 8 Villages, 3 Rescue Tasks, 5 Safe Sites, 5 Routes.");
  const countEl = document.getElementById("offline-queued-count");
  if (countEl) countEl.textContent = "Queued offline actions: 0";
  APP_STATE.offlineQueue = [];
}

/* ==========================================================================
   27. 3-ROLE AUTHENTICATION (AUTHORITY / NDRF / RESIDENT)
   ========================================================================== */
function openLoginModal() {
  const modal = document.getElementById("modal-login");
  if (modal) modal.classList.add("open");
}

function handleAuthorityLogin() {
  const user = document.getElementById("login-auth-user").value.trim();
  const pass = document.getElementById("login-auth-pass").value.trim();

  if (user === "authority" && pass === "demo123") {
    closeAllModals();
    switchRole("authority");
    showSystemToast("✅ Logged in as: DISTRICT AUTHORITY / DM (Demo Session)");
  } else {
    alert("Invalid credentials. Demo: authority / demo123");
  }
}

function handleNdrfLogin() {
  const user = document.getElementById("login-ndrf-user").value.trim();
  const pass = document.getElementById("login-ndrf-pass").value.trim();

  if (user === "ndrf" && pass === "ndrf123") {
    closeAllModals();
    switchRole("ndrf");
    showSystemToast("✅ Logged in as: NDRF / RESPONSE TEAM (Demo Session)");
  } else {
    alert("Invalid credentials. Demo: ndrf / ndrf123");
  }
}

function handleResidentLogin() {
  const mobile = document.getElementById("login-res-mobile").value.trim();
  const otp = document.getElementById("login-res-otp").value.trim();

  if (mobile === "9999999999" && otp === "123456") {
    closeAllModals();
    switchRole("resident");
    showSystemToast("✅ Logged in as: RESIDENT (Village A Demo Session)");
  } else {
    alert("Invalid credentials. Demo: 9999999999 / 123456");
  }
}

// Window attachments for HTML onclick handlers
if (typeof window !== "undefined") {
  window.openLoginModal = openLoginModal;
  window.handleAuthorityLogin = handleAuthorityLogin;
  window.handleNdrfLogin = handleNdrfLogin;
  window.handleResidentLogin = handleResidentLogin;
  window.openSendAlertModal = openSendAlertModal;
  window.triggerNdrfAlertDispatch = triggerNdrfAlertDispatch;
  window.triggerPublicAlertDispatch = triggerPublicAlertDispatch;
  window.openNetworkStatusModal = openNetworkStatusModal;
  window.setNetworkMode = setNetworkMode;
  window.syncOfflineCache = syncOfflineCache;
  window.renderNdrfResponseView = renderNdrfResponseView;
  window.cycleNdrfTaskStatus = cycleNdrfTaskStatus;
  window.openNdrfLocationModal = openNdrfLocationModal;
  window.openAlternativeAccessModal = openAlternativeAccessModal;
  window.viewResidentRoute = viewResidentRoute;
  window.triggerResidentHelp = triggerResidentHelp;
}


/**
 * SANKATMOCHAN — Permanent Relocation Module (add-on)
 *
 * Temporary evacuation  = "abhi bachao"  (Plan A / Plan B, existing engine)
 * Permanent relocation  = "baar-baar ki baadh se hamesha ke liye nikaalo" (this module)
 *
 * Isolated add-on: existing files (app.js, relocation-engine.js, geo-data.js, styles.css)
 * are NOT modified. This file only
 *   1. attaches RAKSHA_DATA.permanentRelocation (demo / simulated dataset),
 *   2. adds new methods to RakshaEngine (deterministic + explainable),
 *   3. renders the new "Permanent Relocation" view and wraps switchView() to render it.
 *
 * DEMO / SIMULATED DATA — flood history and permanent sites are illustrative planning values,
 * not government records. Decision support only; final decisions rest with the District Authority
 * after Gram Sabha consultation.
 */
(function () {
  "use strict";

  if (typeof RAKSHA_DATA === "undefined" || typeof RakshaEngine === "undefined") {
    console.warn("[PermanentRelocation] RAKSHA_DATA / RakshaEngine not found — module not loaded.");
    return;
  }

  /* ========================================================================
     1. DATASET (demo / simulated)
     ======================================================================== */
  const PR_DATA = {
    disclaimer:
      "DEMO / SIMULATED — flood history and permanent sites are illustrative planning values. Decision support only; final decision by District Authority after Gram Sabha consultation.",
    analysisWindow: { fromYear: 2017, toYear: 2026 },

    thresholds: {
      recommendScore: 70,
      recommendMinEvents: 3,
      evaluateScore: 55,
      evaluateMinEvents: 2,
      minElevationAboveHflM: 30,   // hard gate: site must sit well above highest flood level
      comfortableDistanceKm: 5,    // beyond this, livelihood adjustment is flagged
      maxDistanceKm: 12            // beyond this, site is not considered for the village
    },

    weights: { frequency: 0.40, severity: 0.25, currentHazard: 0.20, exposure: 0.15 },

    // Flood history per village (last 10 years). severity: 1 (minor) – 5 (catastrophic)
    floodHistory: {
      "VIL-01": {
        floodplainHouseholdsPct: 72, events: [
          { year: 2018, severity: 3, note: "River terrace overtopping" },
          { year: 2020, severity: 4, note: "Flash flood, lower lanes inundated" },
          { year: 2021, severity: 5, note: "Debris flow + surge, houses damaged" },
          { year: 2023, severity: 4, note: "Cloudburst, road R1 cut for 3 days" },
          { year: 2025, severity: 5, note: "Terrace breach, mass evacuation" }
        ]
      },
      "VIL-02": {
        floodplainHouseholdsPct: 58, events: [
          { year: 2019, severity: 3, note: "Gorge damming, backwater flooding" },
          { year: 2021, severity: 4, note: "Debris flow into settlement" },
          { year: 2023, severity: 4, note: "River inundation of lower bend" },
          { year: 2025, severity: 3, note: "Recurrent gorge blockage" }
        ]
      },
      "VIL-03": {
        floodplainHouseholdsPct: 64, events: [
          { year: 2021, severity: 4, note: "Riverbank erosion, 12 houses lost land" },
          { year: 2024, severity: 3, note: "Flash flood on terraces" },
          { year: 2025, severity: 4, note: "Bank collapse + flooding" }
        ]
      },
      "VIL-04": {
        floodplainHouseholdsPct: 10, events: [
          { year: 2022, severity: 2, note: "Drain overflow after slope slump" }
        ]
      },
      "VIL-05": { floodplainHouseholdsPct: 5, events: [] },
      "VIL-06": {
        floodplainHouseholdsPct: 30, events: [
          { year: 2020, severity: 2, note: "Nallah overflow" },
          { year: 2022, severity: 2, note: "Nallah overflow" },
          { year: 2024, severity: 3, note: "Nallah overflow, footbridge washed" }
        ]
      },
      "VIL-07": {
        floodplainHouseholdsPct: 15, events: [
          { year: 2023, severity: 2, note: "Runoff waterlogging" }
        ]
      },
      "VIL-08": { floodplainHouseholdsPct: 8, events: [] }
    },

    // Candidate PERMANENT resettlement sites (separate from the 5 emergency Safe Sites)
    sites: [
      {
        id: "PS-01", code: "P1", name: "Permanent Site P1", facilityName: "Pipal Upper Bench",
        coords: [30.492, 79.528], elevationAboveHflM: 85, geologicalClearance: "CLEARED", inRedZone: false,
        ownership: "Revenue land (Govt.)",
        capacities: { land: 320, water: 300, sanitation: 340, power: 400, access: 380 },
        readiness: { water: 78, power: 90, road: 85 }
      },
      {
        id: "PS-02", code: "P2", name: "Permanent Site P2", facilityName: "Rishi Ridge Plateau",
        coords: [30.505, 79.560], elevationAboveHflM: 70, geologicalClearance: "CLEARED", inRedZone: false,
        ownership: "Panchayat land — Gram Sabha NOC required",
        capacities: { land: 260, water: 280, sanitation: 250, power: 300, access: 320 },
        readiness: { water: 72, power: 80, road: 70 }
      },
      {
        id: "PS-03", code: "P3", name: "Permanent Site P3", facilityName: "Dhauli Upper Meadow",
        coords: [30.522, 79.598], elevationAboveHflM: 95, geologicalClearance: "CLEARED", inRedZone: false,
        ownership: "Van Panchayat land — forest NOC required",
        capacities: { land: 420, water: 380, sanitation: 400, power: 350, access: 300 },
        readiness: { water: 60, power: 75, road: 55 }
      },
      {
        id: "PS-04", code: "P4", name: "Permanent Site P4", facilityName: "Helang Bypass Plateau",
        coords: [30.540, 79.540], elevationAboveHflM: 110, geologicalClearance: "PENDING", inRedZone: false,
        ownership: "Private + Govt. mix — land acquisition needed",
        capacities: { land: 520, water: 480, sanitation: 450, power: 500, access: 470 },
        readiness: { water: 55, power: 60, road: 65 }
      },
      {
        id: "PS-05", code: "P5", name: "Permanent Site P5", facilityName: "Sema Ridge Flat",
        coords: [30.442, 79.492], elevationAboveHflM: 60, geologicalClearance: "CLEARED", inRedZone: false,
        ownership: "Revenue land (Govt.)",
        capacities: { land: 200, water: 180, sanitation: 210, power: 260, access: 240 },
        readiness: { water: 70, power: 85, road: 60 }
      }
    ],

    progressSteps: ["PROPOSED", "GRAM SABHA CONSENT", "DM APPROVED", "CONSTRUCTION", "RESETTLED"]
  };

  RAKSHA_DATA.permanentRelocation = PR_DATA;

  /* ========================================================================
     2. ENGINE (deterministic + explainable) — attached to RakshaEngine
     ======================================================================== */
  function haversineKm(a, b) {
    const R = 6371;
    const rad = d => (d * Math.PI) / 180;
    const dLat = rad(b[0] - a[0]);
    const dLon = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Flood Recurrence Score (0-100): frequency 40% + severity 25% + current hazard 20% + floodplain exposure 15% */
  RakshaEngine.calculateFloodRecurrence = function (village) {
    const T = PR_DATA.thresholds, W = PR_DATA.weights, win = PR_DATA.analysisWindow;
    const hist = PR_DATA.floodHistory[village.id] || { floodplainHouseholdsPct: 0, events: [] };
    const n = hist.events.length;
    const avgSeverity = n ? hist.events.reduce((s, e) => s + e.severity, 0) / n : 0;

    const freqScore = Math.min(100, (n / 5) * 100);
    const sevScore = (avgSeverity / 5) * 100;
    const hazardScore = Math.min(100, village.riskScore || 0);
    const expScore = hist.floodplainHouseholdsPct;

    const score = Math.round(
      freqScore * W.frequency + sevScore * W.severity +
      hazardScore * W.currentHazard + expScore * W.exposure
    );

    let category = "TEMPORARY";
    if (score >= T.recommendScore && n >= T.recommendMinEvents) category = "PERMANENT";
    else if (score >= T.evaluateScore && n >= T.evaluateMinEvents) category = "EVALUATE";

    const labels = {
      PERMANENT: "PERMANENT RELOCATION RECOMMENDED",
      EVALUATE: "PERMANENT RELOCATION — EVALUATE",
      TEMPORARY: "TEMPORARY EVACUATION + MONITOR"
    };

    return {
      villageId: village.id,
      score,
      category,
      label: labels[category],
      eventCount: n,
      avgSeverity: Math.round(avgSeverity * 10) / 10,
      events: hist.events,
      floodplainPct: hist.floodplainHouseholdsPct,
      floodplainHouseholds: Math.round(village.households * hist.floodplainHouseholdsPct / 100),
      factors: {
        frequency: Math.round(freqScore * W.frequency),
        severity: Math.round(sevScore * W.severity),
        currentHazard: Math.round(hazardScore * W.currentHazard),
        exposure: Math.round(expScore * W.exposure)
      },
      reason:
        `${n} flood event${n === 1 ? "" : "s"} in ${win.toYear - win.fromYear + 1} years` +
        (n ? ` (avg severity ${Math.round(avgSeverity * 10) / 10}/5)` : "") +
        `, ${hist.floodplainHouseholdsPct}% households in floodplain, current risk ${village.riskScore}/100.`
    };
  };

  /** Permanent site evaluation: hard gates + operational capacity (min of resources) + suitability score */
  RakshaEngine.evaluatePermanentSite = function (site) {
    const T = PR_DATA.thresholds;
    const c = site.capacities;
    const pairs = [
      { name: "LAND", value: c.land }, { name: "WATER", value: c.water },
      { name: "SANITATION", value: c.sanitation }, { name: "POWER", value: c.power },
      { name: "ACCESS", value: c.access }
    ];
    let limiting = pairs[0];
    pairs.forEach(p => { if (p.value < limiting.value) limiting = p; });

    const gates = [
      { name: "Geological clearance", pass: site.geologicalClearance === "CLEARED", detail: site.geologicalClearance },
      { name: `Elevation ≥ ${T.minElevationAboveHflM} m above flood level`, pass: site.elevationAboveHflM >= T.minElevationAboveHflM, detail: `${site.elevationAboveHflM} m` },
      { name: "Outside red zone", pass: !site.inRedZone, detail: site.inRedZone ? "Inside red zone" : "Outside" }
    ];
    const eligible = gates.every(g => g.pass);

    const geo = site.geologicalClearance === "CLEARED" ? 100 : (site.geologicalClearance === "PENDING" ? 40 : 0);
    const util = (site.readiness.water + site.readiness.power) / 2;
    const suitability = Math.round(
      Math.min(100, site.elevationAboveHflM) * 0.35 + geo * 0.30 + util * 0.20 + site.readiness.road * 0.15
    );

    return {
      ...site,
      operationalCapacity: limiting.value,
      limitingResource: limiting.name,
      allResources: pairs,
      gates,
      eligible,
      suitability
    };
  };

  /** Full permanent relocation plan: ranks villages, then allocates households to eligible sites (nearest first) */
  RakshaEngine.generatePermanentRelocationPlan = function () {
    const T = PR_DATA.thresholds;
    const sites = PR_DATA.sites.map(s => RakshaEngine.evaluatePermanentSite(s));
    const remaining = {};
    sites.forEach(s => { remaining[s.id] = s.eligible ? s.operationalCapacity : 0; });

    const entries = RAKSHA_DATA.villages
      .map(v => ({ village: v, recurrence: RakshaEngine.calculateFloodRecurrence(v) }))
      .sort((a, b) => b.recurrence.score - a.recurrence.score);

    entries.forEach(e => {
      const rec = e.recurrence;
      e.allocation = null;
      e.timeline = null;
      if (rec.category === "TEMPORARY") return;

      let need = rec.floodplainHouseholds;
      const allocations = [];
      const candidates = sites
        .filter(s => s.eligible)
        .map(s => ({ s, dist: haversineKm(e.village.coords, s.coords) }))
        .filter(c => c.dist <= T.maxDistanceKm)
        .sort((a, b) => a.dist - b.dist);

      for (const { s, dist } of candidates) {
        if (need <= 0) break;
        const take = Math.min(need, remaining[s.id]);
        if (take <= 0) continue;
        allocations.push({
          siteId: s.id, siteCode: s.code, siteName: s.name, facilityName: s.facilityName,
          coords: s.coords, households: take, distanceKm: Math.round(dist * 10) / 10,
          nearLivelihood: dist <= T.comfortableDistanceKm, suitability: s.suitability
        });
        remaining[s.id] -= take;
        need -= take;
      }

      // Sites that could close the gap once their only pending gate (geology) is cleared
      const pendingHelp = sites
        .filter(s => !s.eligible && s.gates.every(g => g.pass || g.name === "Geological clearance"))
        .map(s => ({ s, dist: haversineKm(e.village.coords, s.coords) }))
        .filter(c => c.dist <= T.maxDistanceKm)
        .sort((a, b) => a.dist - b.dist)[0] || null;

      e.allocation = {
        households: rec.floodplainHouseholds,
        allocations,
        unallocated: need,
        status: need > 0 ? "CAPACITY GAP" : "FULLY ALLOCATED",
        pendingOption: need > 0 && pendingHelp
          ? {
            siteCode: pendingHelp.s.code, facilityName: pendingHelp.s.facilityName,
            capacity: pendingHelp.s.operationalCapacity, distanceKm: Math.round(pendingHelp.dist * 10) / 10
          }
          : null
      };

      const far = allocations.some(a => !a.nearLivelihood);
      const phases = [
        { name: "Survey + Gram Sabha consent", months: 2 },
        { name: "Land, NOCs & approvals", months: 3 },
        { name: "Construction of houses & utilities", months: 6 + Math.ceil(rec.floodplainHouseholds / 150) * 2 },
        { name: "Shifting + livelihood restoration", months: 2 + (far ? 1 : 0) }
      ];
      e.timeline = { phases, totalMonths: phases.reduce((s, p) => s + p.months, 0) };
    });

    const active = entries.filter(e => e.recurrence.category !== "TEMPORARY");
    const recommended = entries.filter(e => e.recurrence.category === "PERMANENT");
    const evaluating = entries.filter(e => e.recurrence.category === "EVALUATE");
    const totalDemand = active.reduce((s, e) => s + e.recurrence.floodplainHouseholds, 0);
    const totalAllocated = active.reduce((s, e) => s + (e.allocation ? e.allocation.households - e.allocation.unallocated : 0), 0);

    return {
      entries,
      sites,
      summary: {
        recommendedCount: recommended.length,
        evaluatingCount: evaluating.length,
        recommendedHouseholds: recommended.reduce((s, e) => s + e.recurrence.floodplainHouseholds, 0),
        totalDemandHouseholds: totalDemand,
        totalAllocated,
        gapHouseholds: totalDemand - totalAllocated,
        eligibleSiteCapacity: sites.filter(s => s.eligible).reduce((s, x) => s + x.operationalCapacity, 0),
        eligibleSiteCount: sites.filter(s => s.eligible).length,
        pendingSiteCount: sites.filter(s => !s.eligible).length
      }
    };
  };

  /* ========================================================================
     3. UI
     ======================================================================== */
  const PR_STATE = { plan: null, selectedId: null, progress: {}, map: null, layers: null };

  const CAT_STYLE = {
    PERMANENT: { badge: "badge-red", color: "#dc2626" },
    EVALUATE: { badge: "badge-orange", color: "#f59e0b" },
    TEMPORARY: { badge: "badge-blue", color: "#64748b" }
  };
  const SEV_COLOR = ["#e2e8f0", "#fde68a", "#fcd34d", "#fb923c", "#ef4444", "#b91c1c"];

  function injectStyles() {
    if (document.getElementById("pr-styles")) return;
    const st = document.createElement("style");
    st.id = "pr-styles";
    st.textContent = `
      .pr-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
      .pr-metric{background:#fff;border:1px solid var(--border-card,#d5e1de);border-radius:12px;padding:14px 16px}
      .pr-metric .pr-m-label{font-size:11px;color:#5f7480;text-transform:uppercase;letter-spacing:.04em;font-weight:600}
      .pr-metric .pr-m-val{font-size:26px;font-weight:700;color:#12232b;margin-top:4px;line-height:1.1}
      .pr-metric .pr-m-sub{font-size:11px;color:#5f7480;margin-top:4px}
      .pr-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:16px;margin-top:16px}
      .pr-map{height:100%;min-height:340px;border-radius:10px;overflow:hidden;border:1px solid #d5e1de}
      .pr-row{cursor:pointer}
      .pr-row.selected td{background:#e8f6f3}
      .pr-dots{display:flex;gap:3px;align-items:center}
      .pr-dot{width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.08)}
      .pr-years{display:flex;justify-content:space-between;font-size:9px;color:#7f979f;margin-top:2px}
      .pr-bar-wrap{background:#eef3f2;border-radius:6px;height:8px;overflow:hidden}
      .pr-bar{height:8px;border-radius:6px;background:#0f9d8a}
      .pr-alloc{border:1px solid #d5e1de;border-radius:10px;padding:10px 12px;background:#f9fcfb}
      .pr-steps{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
      .pr-step{font-size:10px;font-weight:700;padding:5px 9px;border-radius:999px;background:#eef3f2;color:#7f979f}
      .pr-step.done{background:#d9f3ee;color:#0b6b5e}
      .pr-step.now{background:#0f9d8a;color:#fff}
      .pr-sites{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin-top:12px}
      .pr-site{background:#fff;border:1px solid #d5e1de;border-radius:12px;padding:14px}
      .pr-gate{font-size:11px;display:flex;justify-content:space-between;padding:2px 0}
      .pr-ok{color:#15803d;font-weight:700}.pr-bad{color:#dc2626;font-weight:700}
      .pr-note{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.5}
      @media (max-width:1100px){.pr-metrics{grid-template-columns:repeat(2,1fr)}.pr-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function yearDots(events) {
    const { fromYear, toYear } = PR_DATA.analysisWindow;
    const byYear = {};
    events.forEach(e => { byYear[e.year] = e; });
    let html = '<div class="pr-dots">';
    for (let y = fromYear; y <= toYear; y++) {
      const e = byYear[y];
      html += `<span class="pr-dot" style="background:${e ? SEV_COLOR[e.severity] : SEV_COLOR[0]}" title="${y}${e ? ` — severity ${e.severity}/5: ${e.note}` : " — no flood"}"></span>`;
    }
    html += `</div><div class="pr-years"><span>${fromYear}</span><span>${toYear}</span></div>`;
    return html;
  }

  function renderShell() {
    const container = document.getElementById("permanent-relocation-container");
    if (!container) return false;
    const s = PR_STATE.plan.summary;

    container.innerHTML = `
      <div class="view-header-row">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h2 style="margin:0;">Permanent Relocation — Repeat-Flood Habitations</h2>
            <span class="badge-status badge-purple">LONG-TERM PLAN</span>
          </div>
          <p style="font-size:12px;color:#64748b;margin:2px 0 0 0;">
            Jin habitations mein baar-baar baadh aati hai, unke liye permanent safe resettlement site — emergency evacuation (Plan A/B) se alag aur usko complement karta hai.
          </p>
        </div>
        <div><span class="badge-status badge-orange">DEMO / SIMULATED DATA</span></div>
      </div>

      <div class="pr-metrics">
        <div class="pr-metric">
          <div class="pr-m-label">Permanent relocation</div>
          <div class="pr-m-val">${s.recommendedCount}<span style="font-size:14px;color:#5f7480;font-weight:500;"> + ${s.evaluatingCount} to evaluate</span></div>
          <div class="pr-m-sub">habitations with repeated floods</div>
        </div>
        <div class="pr-metric">
          <div class="pr-m-label">Households to resettle</div>
          <div class="pr-m-val">${s.totalDemandHouseholds.toLocaleString()}</div>
          <div class="pr-m-sub">${s.recommendedHouseholds.toLocaleString()} recommended • floodplain households only</div>
        </div>
        <div class="pr-metric">
          <div class="pr-m-label">Eligible site capacity</div>
          <div class="pr-m-val">${s.eligibleSiteCapacity.toLocaleString()}</div>
          <div class="pr-m-sub">${s.eligibleSiteCount} sites cleared • ${s.pendingSiteCount} pending clearance</div>
        </div>
        <div class="pr-metric">
          <div class="pr-m-label">Capacity gap</div>
          <div class="pr-m-val" style="color:${s.gapHouseholds > 0 ? "#dc2626" : "#15803d"}">${s.gapHouseholds > 0 ? s.gapHouseholds.toLocaleString() : "None"}</div>
          <div class="pr-m-sub">${s.gapHouseholds > 0 ? "households without a permanent site yet" : "all households allocated"}</div>
        </div>
      </div>

      <div class="pr-grid">
        <div class="card-white" style="padding:16px;">
          <h3 style="margin:0 0 4px 0;">Flood Recurrence Ranking (last 10 years)</h3>
          <p style="font-size:11px;color:#64748b;margin:0 0 10px 0;">Score = frequency 40% + severity 25% + current hazard 20% + floodplain exposure 15%. Row pe click karo.</p>
          <div style="overflow-x:auto;">
            <table class="table-clean" style="width:100%;">
              <thead><tr><th>Village</th><th>Flood years</th><th>Events</th><th>Floodplain HH</th><th>Score</th><th>Decision</th></tr></thead>
              <tbody id="pr-table-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card-white" style="padding:12px;display:flex;flex-direction:column;">
          <h3 style="margin:4px 4px 8px 4px;">Villages → Permanent Sites</h3>
          <div id="pr-map" class="pr-map"></div>
          <div style="font-size:10px;color:#5f7480;margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;">
            <span>🔴 Permanent</span><span>🟠 Evaluate</span><span>⚪ Temporary only</span><span>🟢 Cleared site</span><span>🟡 Clearance pending</span>
          </div>
        </div>
      </div>

      <div class="card-white" style="padding:16px;margin-top:16px;" id="pr-detail"></div>

      <div style="margin-top:20px;">
        <h3 style="margin:0;">Candidate Permanent Sites</h3>
        <p style="font-size:11px;color:#64748b;margin:2px 0 0 0;">Emergency Safe Sites se alag — yahan ghar, paani, bijli, sadak aur jeevika ke hisaab se permanent basti banti hai. Hard gates fail hone par site allocate nahi hota.</p>
        <div class="pr-sites" id="pr-sites"></div>
      </div>

      <div class="pr-note" style="margin-top:16px;">
        ⚠️ <strong>Decision support only.</strong> Permanent relocation voluntary aur participatory honi chahiye — Gram Sabha consent, land/forest NOCs aur R&amp;R approvals ke bina koi ghar nahi shift hoga.
        Tab tak emergency evacuation (Plan A / Plan B) chalta rahega. ${PR_DATA.disclaimer}
      </div>
    `;
    return true;
  }

  function renderTable() {
    const body = document.getElementById("pr-table-body");
    if (!body) return;
    body.innerHTML = PR_STATE.plan.entries.map(e => {
      const r = e.recurrence, cs = CAT_STYLE[r.category];
      return `
        <tr class="pr-row ${e.village.id === PR_STATE.selectedId ? "selected" : ""}" onclick="PermanentRelocation.selectVillage('${e.village.id}')">
          <td><strong>${e.village.name}</strong><div style="font-size:10px;color:#7f979f;">${e.village.hazard}</div></td>
          <td style="min-width:130px;">${yearDots(r.events)}</td>
          <td>${r.eventCount}${r.eventCount ? `<div style="font-size:10px;color:#7f979f;">avg ${r.avgSeverity}/5</div>` : ""}</td>
          <td>${r.floodplainHouseholds}<div style="font-size:10px;color:#7f979f;">${r.floodplainPct}% of ${e.village.households}</div></td>
          <td><strong>${r.score}</strong></td>
          <td><span class="badge-status ${cs.badge}" style="white-space:nowrap;">${r.label}</span></td>
        </tr>`;
    }).join("");
  }

  function renderDetail() {
    const el = document.getElementById("pr-detail");
    if (!el) return;
    const e = PR_STATE.plan.entries.find(x => x.village.id === PR_STATE.selectedId);
    if (!e) return;
    const r = e.recurrence, cs = CAT_STYLE[r.category];

    const factorRow = (label, val, max) => `
      <div style="margin:6px 0;">
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span>${label}</span><strong>${val} / ${max}</strong></div>
        <div class="pr-bar-wrap"><div class="pr-bar" style="width:${Math.round(val / max * 100)}%"></div></div>
      </div>`;

    let right = "";
    if (r.category === "TEMPORARY") {
      right = `
        <div class="pr-note" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af;">
          <strong>Abhi permanent relocation ki zarurat nahi.</strong> Flood recurrence threshold se neeche hai — emergency evacuation (Plan A/B) aur monitoring jaari rakho.
          Agar aane wale saalon mein events badhte hain to score apne aap upar jayega.
        </div>`;
    } else {
      const a = e.allocation, t = e.timeline;
      const step = PR_STATE.progress[e.village.id] || 0;
      const steps = PR_DATA.progressSteps;
      const done = step >= steps.length - 1;
      right = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h4 style="margin:0;font-size:14px;">Site Allocation — ${a.households} households</h4>
          <span class="badge-status ${a.unallocated > 0 ? "badge-red" : "badge-green"}">${a.status}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
          ${a.allocations.map(x => `
            <div class="pr-alloc">
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <strong>${x.siteName} — ${x.facilityName}</strong><strong>${x.households} HH</strong>
              </div>
              <div style="font-size:11px;color:#5f7480;margin-top:2px;">
                ${x.distanceKm} km from village ${x.nearLivelihood ? "• 🌾 jeevika ke kareeb" : "• ⚠️ door — livelihood adjustment chahiye"} • suitability ${x.suitability}/100
              </div>
            </div>`).join("")}
          ${a.unallocated > 0 ? `
            <div class="pr-note" style="background:#fef2f2;border-color:#fecaca;color:#991b1b;">
              <strong>${a.unallocated} households ke liye abhi cleared site nahi hai.</strong>
              ${a.pendingOption
            ? `${a.pendingOption.siteCode} (${a.pendingOption.facilityName}, ${a.pendingOption.distanceKm} km) ki geological clearance ho jaye to ${a.pendingOption.capacity} households aur sambhal sakta hai.`
            : "Naya permanent site identify karna hoga."}
            </div>` : ""}
        </div>

        <h4 style="margin:14px 0 4px 0;font-size:14px;">Indicative Timeline — ~${t.totalMonths} months</h4>
        <div style="font-size:11px;color:#5f7480;">
          ${t.phases.map((p, i) => `${i + 1}. ${p.name} (${p.months} mo)`).join(" &nbsp;→&nbsp; ")}
        </div>

        <h4 style="margin:14px 0 0 0;font-size:14px;">Approval &amp; Progress</h4>
        <div class="pr-steps">
          ${steps.map((s, i) => `<span class="pr-step ${i < step ? "done" : (i === step ? "now" : "")}">${i < step ? "✓ " : ""}${s}</span>`).join("")}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-sm btn-primary-blue" ${done ? "disabled" : ""} onclick="PermanentRelocation.advance('${e.village.id}')">
            ${done ? "RESETTLEMENT COMPLETE ✓" : "Advance → " + steps[step + 1]}
          </button>
          <button class="btn-sm btn-secondary-white" onclick="PermanentRelocation.openEvacuation('${e.village.id}')">Open emergency evacuation plan</button>
        </div>`;
    }

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;">${e.village.name} — ${e.village.localName}</h3>
        <span class="badge-status ${cs.badge}">${r.label}</span>
      </div>
      <p style="font-size:12px;color:#334e57;margin:6px 0 12px 0;"><strong>Kyun:</strong> ${r.reason}</p>
      <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:20px;">
        <div>
          <h4 style="margin:0 0 4px 0;font-size:14px;">Recurrence Score: ${r.score} / 100</h4>
          ${factorRow("Flood frequency", r.factors.frequency, 40)}
          ${factorRow("Flood severity", r.factors.severity, 25)}
          ${factorRow("Current hazard", r.factors.currentHazard, 20)}
          ${factorRow("Floodplain exposure", r.factors.exposure, 15)}
          ${r.events.length ? `
            <h4 style="margin:14px 0 4px 0;font-size:13px;">Flood log</h4>
            <div style="font-size:11px;color:#334e57;line-height:1.6;">
              ${r.events.map(ev => `<div><strong>${ev.year}</strong> • sev ${ev.severity}/5 • ${ev.note}</div>`).join("")}
            </div>` : ""}
        </div>
        <div>${right}</div>
      </div>
    `;
  }

  function renderSites() {
    const el = document.getElementById("pr-sites");
    if (!el) return;
    el.innerHTML = PR_STATE.plan.sites.map(s => `
      <div class="pr-site">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h4 style="margin:0;font-size:14px;">${s.name}</h4>
            <div style="font-size:11px;color:#5f7480;">${s.facilityName}</div>
          </div>
          <span class="badge-status ${s.eligible ? "badge-green" : "badge-orange"}">${s.eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}</span>
        </div>
        <div style="margin:10px 0;display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:12px;">Capacity</span>
          <strong style="color:#9333ea;font-size:15px;">${s.operationalCapacity.toLocaleString()} households</strong>
        </div>
        <div style="font-size:11px;color:#dc2626;margin-bottom:8px;">Limited by ${s.limitingResource} (${s.allResources.map(r => r.name[0] + r.name.slice(1).toLowerCase() + " " + r.value).join(" • ")})</div>
        ${s.gates.map(g => `<div class="pr-gate"><span>${g.name}</span><span class="${g.pass ? "pr-ok" : "pr-bad"}">${g.pass ? "✓" : "✗"} ${g.detail}</span></div>`).join("")}
        <div class="pr-gate" style="margin-top:4px;"><span>Suitability score</span><strong>${s.suitability} / 100</strong></div>
        <div style="font-size:10px;color:#7f979f;margin-top:6px;">${s.ownership}</div>
      </div>`).join("");
  }

  function initMap() {
    const el = document.getElementById("pr-map");
    if (!el) return;
    if (typeof L === "undefined") {
      el.innerHTML = '<div style="height:100%;display:grid;place-items:center;text-align:center;padding:24px;color:#5f7480;font-size:13px">Map load nahi hua. Internet check karo (Leaflet unpkg se aati hai) aur reload karo.</div>';
      return;
    }
    if (PR_STATE.map) { PR_STATE.map.remove(); PR_STATE.map = null; }
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(RAKSHA_DATA.mapConfig.center, 11);
    const apiKey = localStorage.getItem('cartoApiKey') || '';
    const apiKeyParam = apiKey ? `?api_key=${apiKey}` : '';
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${apiKeyParam}`, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>', maxZoom: 18, subdomains: "abcd"
    }).addTo(map);
    PR_STATE.map = map;
    PR_STATE.layers = L.layerGroup().addTo(map);
    drawMap(true);
    [100, 400, 1200].forEach(ms => setTimeout(() => PR_STATE.map && PR_STATE.map.invalidateSize(), ms));
  }

  function drawMap(fit) {
    const map = PR_STATE.map;
    if (!map) return;
    PR_STATE.layers.clearLayers();
    const bounds = [];

    PR_STATE.plan.sites.forEach(s => {
      L.circleMarker(s.coords, {
        radius: 8, color: s.eligible ? "#15803d" : "#b45309", weight: 2,
        fillColor: s.eligible ? "#22c55e" : "#fbbf24", fillOpacity: 0.9
      }).bindTooltip(`${s.name} — ${s.facilityName}<br>${s.operationalCapacity} HH • ${s.eligible ? "cleared" : "clearance pending"}`).addTo(PR_STATE.layers);
      bounds.push(s.coords);
    });

    PR_STATE.plan.entries.forEach(e => {
      const cs = CAT_STYLE[e.recurrence.category];
      const sel = e.village.id === PR_STATE.selectedId;
      L.circleMarker(e.village.coords, {
        radius: sel ? 11 : 8, color: sel ? "#0f172a" : "#fff", weight: sel ? 3 : 2,
        fillColor: cs.color, fillOpacity: 0.95
      }).bindTooltip(`${e.village.name} — score ${e.recurrence.score}<br>${e.recurrence.label}`)
        .on("click", () => PermanentRelocation.selectVillage(e.village.id))
        .addTo(PR_STATE.layers);
      bounds.push(e.village.coords);

      if (sel && e.allocation) {
        e.allocation.allocations.forEach(a => {
          L.polyline([e.village.coords, a.coords], { color: "#0f9d8a", weight: 3, dashArray: "6 6" })
            .bindTooltip(`${a.households} HH • ${a.distanceKm} km → ${a.siteCode}`, { permanent: true, direction: "center", className: "" })
            .addTo(PR_STATE.layers);
        });
      }
    });

    if (fit && bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
  }

  /* ---------- public API (used by inline onclick) ---------- */
  const PermanentRelocation = {
    selectVillage(id) {
      PR_STATE.selectedId = id;
      renderTable();
      renderDetail();
      drawMap(false);
    },
    advance(id) {
      const max = PR_DATA.progressSteps.length - 1;
      const cur = PR_STATE.progress[id] || 0;
      if (cur >= max) return;
      PR_STATE.progress[id] = cur + 1;
      renderDetail();
      const village = RAKSHA_DATA.villages.find(v => v.id === id);
      if (typeof showSystemToast === "function") {
        showSystemToast(`${village ? village.name : id}: permanent relocation → ${PR_DATA.progressSteps[cur + 1]}`);
      }
    },
    openEvacuation(id) {
      if (typeof openGeneratePlanModal === "function") openGeneratePlanModal(id);
    },
    show() {
      injectStyles();
      // Recompute each time the view opens (deterministic, cheap) so it stays in sync with the data
      PR_STATE.plan = RakshaEngine.generatePermanentRelocationPlan();
      if (!PR_STATE.selectedId) PR_STATE.selectedId = PR_STATE.plan.entries[0].village.id;
      if (!renderShell()) return;
      renderTable();
      renderDetail();
      renderSites();
      initMap();
    }
  };
  window.PermanentRelocation = PermanentRelocation;

  /* ---------- hook into existing navigation WITHOUT editing app.js ---------- */
  if (typeof window.switchView === "function") {
    const originalSwitchView = window.switchView;
    window.switchView = function (viewName) {
      originalSwitchView.apply(this, arguments);
      if (viewName === "permanent-relocation") {
        const crumb = document.getElementById("breadcrumb-current");
        if (crumb) crumb.textContent = "Permanent Relocation";
        PermanentRelocation.show();
      }
    };
  }
})();

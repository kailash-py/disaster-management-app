/**
 * SANKATMOCHAN — Intelligent Pre-Disaster Relocation & Decision Support System
 * SIH 2026 Problem Statement SIH26191
 * Geographic, Habitation, Safe Site, and Road Graph Dataset
 * Chamoli District, Uttarakhand, India • Pilot Demo Environment
 *
 * "We don't just identify where the risk is — we help decide who should move,
 * where they should go, when they should move, and whether they can reach safety in time."
 */

const RAKSHA_DATA = {
  metadata: {
    systemName: "SANKATMOCHAN",
    systemHindi: "",
    tagline: "Intelligent Pre-Disaster Relocation & Decision Support System",
    problemStatement: "SIH26191 — Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations",
    district: "Chamoli District",
    state: "Uttarakhand, India",
    baselineSource: "Census of India 2011 — Primary Census Abstract (Demo-adjusted planning values)",
    roadDataSource: "OpenStreetMap-derived topological graph with simulated hazard telemetry",
    disclaimer: "DEMO / SIMULATED SCENARIO — For Smart India Hackathon 2026 Prototype Evaluation. Not live government telemetry.",
    alertProvider: "Demo Alert Provider (Government SACHET / CAP Integration Ready: DEMO_ALERT_PROVIDER=true)",
    version: "2.4.0-sih2026"
  },

  // Map geographic focal coordinates (Chamoli - Alaknanda Valley)
  mapConfig: {
    center: [30.450, 79.480],
    defaultZoom: 11,
    minZoom: 9,
    maxZoom: 16
  },

  // Active Demo Scenario: Chamoli Cloudburst + Landslide + Flash Flood
  scenario: {
    id: "SCEN-01",
    name: "Cloudburst & Flash Flood Surge (Chamoli Basin)",
    type: "Multi-Hazard Cloudburst / Heavy Rainfall",
    status: "DEMO / SIMULATED SCENARIO",
    location: "Chamoli District, Uttarakhand",
    rainfall24h: "140 mm",
    rainfallIntensity: "Extreme (38 mm/hr peak at Alaknanda catchment)",
    riverGaugeRise: "+2.1 m",
    riverGaugeStation: "Alaknanda at Marwari / Nandaprayag",
    activeHazards: ["Flash Flood", "Landslide", "Road Disruption", "Slope Saturation"],
    availableRelocationWindowHours: 18,
    requiredRelocationTimeHours: 11,
    safetyBufferHours: 7,
    statusAssessment: "SAFE IN TIME",
    forecastConfidence: "84% (Scenario-estimated risk window — not an exact prediction)",
    scenarioTimelineHours: 24,
    description: "Intense convective cloudburst cell over upper catchment causing rapid river discharge rise and saturation of unstable colluvial slopes."
  },

  // Top Metrics Summary
  summaryMetrics: {
    priorityHabitations: 4,
    priorityHabitationsTotal: 8,
    peopleExposed: 15350,
    needRelocationReview: 4450,
    villageAPriorityPopulation: 1850,
    availableSafeCapacity: 4650,
    currentRelocationWindowHours: 18,
    requiredRelocationHours: 11,
    safetyBufferHours: 7,
    windowStatus: "SAFE IN TIME",
    routesAtRiskCount: 2,
    totalRoutesCount: 5
  },

  // 8 DEMO VILLAGES (Habitations)
  villages: [
    {
      id: "VIL-01",
      code: "A",
      name: "Village A",
      localName: "Pipal Terraces (पीपल टेरेस)",
      district: "Chamoli",
      coords: [30.485, 79.545],
      population: 2400,
      households: 520,
      priorityPopulation: 1850,
      riskScore: 92,
      relocationPriority: 1,
      availableRelocationWindowHours: 18,
      estimatedRelocationTimeHours: 11,
      safetyBufferHours: 7,
      status: "CRITICAL",
      hazard: "Flash Flood + Landslide Risk",
      hazardDrivers: [
        "Direct Alaknanda river terrace breach potential (>+2.1m surge)",
        "GSI slope saturation index critical at 91%",
        "Primary access route R1 entering scree-fall danger zone within 10h"
      ],
      vulnerableGroups: {
        childrenUnder5: 194,
        elderlyAbove65: 228,
        differentlyAbled: 42,
        pregnantWomen: 31,
        chronicMedicalCare: 58
      },
      roadAccess: "R1 (At Risk) & R2 (Open - Feasible)",
      nearestSafeSites: ["Safe Site A", "Safe Site B"],
      dataBaseline: "Census 2011 baseline: 1,940 demo-adjusted to 2,400 planning capacity",
      scoreBreakdown: {
        hazardScore: 38,       // out of 40
        populationFactor: 24,  // out of 25
        vulnerability: 16,     // out of 15
        routeFragility: 14     // out of 20
      },
      whyPriority1: "Critical confluence terrace with 1,850 high-vulnerability residents in the immediate debris flow inundation path. Route R1 faces imminent closure at +10h, requiring immediate relocation deployment via Route R2 before the 18h window closes."
    },
    {
      id: "VIL-02",
      code: "B",
      name: "Village B",
      localName: "Rishi Bend (ऋषि बेंड)",
      district: "Chamoli",
      coords: [30.498, 79.582],
      population: 1800,
      households: 410,
      priorityPopulation: 1100,
      riskScore: 84,
      relocationPriority: 2,
      availableRelocationWindowHours: 16,
      estimatedRelocationTimeHours: 9,
      safetyBufferHours: 7,
      status: "HIGH",
      hazard: "Debris Flow & River Inundation",
      hazardDrivers: [
        "Unstable rock ledge above primary settlement",
        "Narrow gorge bottleneck susceptible to rapid damming"
      ],
      vulnerableGroups: {
        childrenUnder5: 142,
        elderlyAbove65: 165,
        differentlyAbled: 28,
        pregnantWomen: 19,
        chronicMedicalCare: 34
      },
      roadAccess: "R2 & R4",
      nearestSafeSites: ["Safe Site B", "Safe Site C"],
      dataBaseline: "Census 2011 baseline: 1,480 demo-adjusted to 1,800",
      scoreBreakdown: {
        hazardScore: 34,
        populationFactor: 21,
        vulnerability: 14,
        routeFragility: 15
      },
      whyPriority1: "Steep gorge bend settlement with high debris accumulation risk. Secondary priority behind Village A due to slightly higher slope elevation."
    },
    {
      id: "VIL-03",
      code: "C",
      name: "Village C",
      localName: "Dhauli Terraces (धौली टेरेस)",
      district: "Chamoli",
      coords: [30.512, 79.610],
      population: 3200,
      households: 690,
      priorityPopulation: 1500,
      riskScore: 79,
      relocationPriority: 3,
      availableRelocationWindowHours: 20,
      estimatedRelocationTimeHours: 12,
      safetyBufferHours: 8,
      status: "HIGH",
      hazard: "Riverbank Erosion & Flash Flood",
      hazardDrivers: [
        "Erosion of toe wall along Dhauliganga",
        "Agricultural terrace washaway imminent"
      ],
      vulnerableGroups: {
        childrenUnder5: 230,
        elderlyAbove65: 280,
        differentlyAbled: 48,
        pregnantWomen: 38,
        chronicMedicalCare: 62
      },
      roadAccess: "R3 & R5",
      nearestSafeSites: ["Safe Site C", "Safe Site D"],
      dataBaseline: "Census 2011 baseline: 2,750 demo-adjusted to 3,200",
      scoreBreakdown: {
        hazardScore: 31,
        populationFactor: 23,
        vulnerability: 13,
        routeFragility: 12
      },
      whyPriority1: "Large population center. Higher overall window (20h) allows sequenced evacuation after Village A and Village B."
    },
    {
      id: "VIL-04",
      code: "D",
      name: "Village D",
      localName: "Helang Scree Slope (हेलंग स्क्री)",
      district: "Chamoli",
      coords: [30.528, 79.525],
      population: 1450,
      households: 310,
      priorityPopulation: 600,
      riskScore: 71,
      relocationPriority: 4,
      availableRelocationWindowHours: 22,
      estimatedRelocationTimeHours: 8,
      safetyBufferHours: 14,
      status: "MODERATE",
      hazard: "Slope Slump & Rockfall",
      hazardDrivers: ["Continuous scree drift above lower hamlet"],
      vulnerableGroups: {
        childrenUnder5: 98,
        elderlyAbove65: 110,
        differentlyAbled: 16,
        pregnantWomen: 12,
        chronicMedicalCare: 22
      },
      roadAccess: "R1 & R5",
      nearestSafeSites: ["Safe Site A", "Safe Site C"],
      dataBaseline: "Census 2011 baseline: 1,210 demo-adjusted to 1,450",
      scoreBreakdown: {
        hazardScore: 28,
        populationFactor: 16,
        vulnerability: 12,
        routeFragility: 15
      },
      whyPriority1: "Moderate immediate hazard; population can shelter in local upper masonry structures if highway cut closes."
    },
    {
      id: "VIL-05",
      code: "E",
      name: "Village E",
      localName: "Joshimath Lower Slopes (जोशीमठ निचला ढलान)",
      district: "Chamoli",
      coords: [30.550, 79.565],
      population: 2100,
      households: 460,
      priorityPopulation: 800,
      riskScore: 65,
      relocationPriority: 5,
      availableRelocationWindowHours: 24,
      estimatedRelocationTimeHours: 9,
      safetyBufferHours: 15,
      status: "MODERATE",
      hazard: "Subsidence & Drainage Choking",
      hazardDrivers: ["Subsurface seepage acceleration from continuous rainfall"],
      vulnerableGroups: {
        childrenUnder5: 160,
        elderlyAbove65: 190,
        differentlyAbled: 32,
        pregnantWomen: 22,
        chronicMedicalCare: 45
      },
      roadAccess: "R5",
      nearestSafeSites: ["Safe Site E", "Safe Site C"],
      dataBaseline: "Census 2011 baseline: 1,820 demo-adjusted to 2,100",
      scoreBreakdown: {
        hazardScore: 24,
        populationFactor: 18,
        vulnerability: 11,
        routeFragility: 12
      },
      whyPriority1: "Monitored subsidence zone. Gradual movement profile gives an extended 24h evacuation buffer."
    },
    {
      id: "VIL-06",
      code: "F",
      name: "Village F",
      localName: "Girothi High Valley (गिरोथी उच्च घाटी)",
      district: "Chamoli",
      coords: [30.450, 79.510],
      population: 980,
      households: 210,
      priorityPopulation: 350,
      riskScore: 58,
      relocationPriority: 6,
      availableRelocationWindowHours: 24,
      estimatedRelocationTimeHours: 6,
      safetyBufferHours: 18,
      status: "WATCH",
      hazard: "Local Nallah Overflow",
      hazardDrivers: ["Stream runoff across foot trail"],
      vulnerableGroups: {
        childrenUnder5: 68,
        elderlyAbove65: 84,
        differentlyAbled: 12,
        pregnantWomen: 8,
        chronicMedicalCare: 18
      },
      roadAccess: "R3",
      nearestSafeSites: ["Safe Site B", "Safe Site D"],
      dataBaseline: "Census 2011 baseline: 830 demo-adjusted to 980",
      scoreBreakdown: {
        hazardScore: 22,
        populationFactor: 12,
        vulnerability: 12,
        routeFragility: 12
      },
      whyPriority1: "Higher elevation settlement with safe upper ridges; stream crossing requires monitoring."
    },
    {
      id: "VIL-07",
      code: "G",
      name: "Village G",
      localName: "Sema Lower Terrace (सेमा निचला टेरेस)",
      district: "Chamoli",
      coords: [30.435, 79.475],
      population: 1650,
      households: 380,
      priorityPopulation: 500,
      riskScore: 52,
      relocationPriority: 7,
      availableRelocationWindowHours: 24,
      estimatedRelocationTimeHours: 7,
      safetyBufferHours: 17,
      status: "WATCH",
      hazard: "Soil Saturation & Runoff",
      hazardDrivers: ["Field waterlogging and minor slope creep"],
      vulnerableGroups: {
        childrenUnder5: 110,
        elderlyAbove65: 140,
        differentlyAbled: 18,
        pregnantWomen: 14,
        chronicMedicalCare: 26
      },
      roadAccess: "R2 & R3",
      nearestSafeSites: ["Safe Site A", "Safe Site B"],
      dataBaseline: "Census 2011 baseline: 1,410 demo-adjusted to 1,650",
      scoreBreakdown: {
        hazardScore: 19,
        populationFactor: 14,
        vulnerability: 10,
        routeFragility: 9
      },
      whyPriority1: "Low overall velocity flood risk. Drainage channels currently clear."
    },
    {
      id: "VIL-08",
      code: "H",
      name: "Village H",
      localName: "Tapovan Edge (तपोवन किनारा)",
      district: "Chamoli",
      coords: [30.495, 79.635],
      population: 1620,
      households: 350,
      priorityPopulation: 420,
      riskScore: 45,
      relocationPriority: 8,
      availableRelocationWindowHours: 24,
      estimatedRelocationTimeHours: 6,
      safetyBufferHours: 18,
      status: "NORMAL",
      hazard: "Minor Erosion",
      hazardDrivers: ["Turbulent water flow in rocky channel"],
      vulnerableGroups: {
        childrenUnder5: 105,
        elderlyAbove65: 132,
        differentlyAbled: 15,
        pregnantWomen: 11,
        chronicMedicalCare: 24
      },
      roadAccess: "R5",
      nearestSafeSites: ["Safe Site C", "Safe Site E"],
      dataBaseline: "Census 2011 baseline: 1,390 demo-adjusted to 1,620",
      scoreBreakdown: {
        hazardScore: 16,
        populationFactor: 12,
        vulnerability: 9,
        routeFragility: 8
      },
      whyPriority1: "Bedrock foundation. Stable terrain and ample distance from active debris paths."
    }
  ],

  // 5 SAFE SITES (Shelters / Receiving Centers)
  // Operational capacity = min(shelter, water, sanitation, healthcare, food, access)
  safeSites: [
    {
      id: "SITE-01",
      code: "A",
      name: "Safe Site A",
      facilityName: "Gopeshwar Community College Campus",
      coords: [30.412, 79.335],
      elevation: "1,550m ASL (High Ridge - 140m above river level)",
      operationalCapacity: 1100, // min(1200, 1100, 1150, 1400, 1250)
      capacities: {
        shelterCapacity: 1200,
        waterCapacity: 1100,
        sanitationCapacity: 1150,
        healthcareCapacity: 1400,
        foodCapacity: 1250,
        accessCapacity: 1500
      },
      constrainedBy: "WATER",
      constrainedReason: "Capacity constrained by municipal gravity pipeline intake (1,100 person-days equivalent). Additional water bowsers required to expand to 1,200.",
      readiness: "READY",
      status: "OPERATIONAL",
      roadAccess: "Open (Double-lane paved access via NH-58 link)",
      powerBackup: "125 kVA Silent DG Set (Operational)",
      waterSupplyStatus: "92% Reservoir Full",
      sanitationStatus: "88% Fully Functional Bio-toilets (42 units)",
      foodStockDays: "85% (5 days rations stored)",
      healthcareStatus: "Available",
      healthcareFacility: "Gopeshwar District Hospital (2.1 km, 8 min ambulance ETA)",
      actionRequired: "Coordinate auxiliary water tanker dispatch from Chamoli Municipal Depot."
    },
    {
      id: "SITE-02",
      code: "B",
      name: "Safe Site B",
      facilityName: "Chamoli District Sports Complex",
      coords: [30.405, 79.320],
      elevation: "1,480m ASL (Terraced Sports Ground - safe from surge)",
      operationalCapacity: 750, // min(900, 750, 820, 780, 950)
      capacities: {
        shelterCapacity: 900,
        waterCapacity: 750,
        sanitationCapacity: 820,
        healthcareCapacity: 780,
        foodCapacity: 950,
        accessCapacity: 1000
      },
      constrainedBy: "WATER",
      constrainedReason: "Capacity constrained by WATER supply (750 person capacity). Secondary constraint: Healthcare bed capacity (780).",
      readiness: "READY",
      status: "OPERATIONAL",
      roadAccess: "Open (Direct stadium approach road)",
      powerBackup: "80 kVA Generator + Solar Microgrid",
      waterSupplyStatus: "76% Tanker Supply Linked",
      sanitationStatus: "90% Stadium Restrooms + 20 Mobile Pods",
      foodStockDays: "82% (4 days dry rations stored)",
      healthcareStatus: "Limited (Medical First Aid Post with 2 MOs)",
      healthcareFacility: "Chamoli Urban Primary Health Centre (1.4 km, 5 min ambulance ETA)",
      actionRequired: "Medical support coordination required: Mobilize mobile medical unit with oxygen."
    },
    {
      id: "SITE-03",
      code: "C",
      name: "Safe Site C",
      facilityName: "Pipalkoti Transit Camp & ITBP Base",
      coords: [30.430, 79.430],
      elevation: "1,340m ASL (Upper Plateau)",
      operationalCapacity: 1300, // min(1500, 1300, 1350, 1400, 1300)
      capacities: {
        shelterCapacity: 1500,
        waterCapacity: 1300,
        sanitationCapacity: 1350,
        healthcareCapacity: 1400,
        foodCapacity: 1300,
        accessCapacity: 1400
      },
      constrainedBy: "WATER & FOOD",
      constrainedReason: "Capacity constrained by Water and Dry Food reserves (1,300 capacity).",
      readiness: "READY",
      status: "OPERATIONAL",
      roadAccess: "Open via Route R2",
      powerBackup: "Dedicated Grid Feeder + 160 kVA DG",
      waterSupplyStatus: "89% Chlorinated Tanks",
      sanitationStatus: "94% Prefab Toilets (60 units)",
      foodStockDays: "86% (Community Kitchen Active)",
      healthcareStatus: "Available (ITBP Medical Wing + CHC Pipalkoti)",
      healthcareFacility: "Community Health Centre Pipalkoti (0.8 km, 3 min ETA)",
      actionRequired: "Food stockpile replenishment scheduled for T+6h."
    },
    {
      id: "SITE-04",
      code: "D",
      name: "Safe Site D",
      facilityName: "Nandaprayag Government Polytechnic",
      coords: [30.330, 79.325],
      elevation: "980m ASL (Elevated Plateau overlooking confluence)",
      operationalCapacity: 900, // min(1000, 950, 900, 1100, 980)
      capacities: {
        shelterCapacity: 1000,
        waterCapacity: 950,
        sanitationCapacity: 900,
        healthcareCapacity: 1100,
        foodCapacity: 980,
        accessCapacity: 1100
      },
      constrainedBy: "SANITATION",
      constrainedReason: "Capacity constrained by SANITATION facilities (900 person capacity due to soak-pit saturation).",
      readiness: "READY",
      status: "OPERATIONAL",
      roadAccess: "Open (South approach road)",
      powerBackup: "62.5 kVA DG Set",
      waterSupplyStatus: "94% Borewell + Gravity Line",
      sanitationStatus: "82% Bio-digester System",
      foodStockDays: "91% (5 days rations stored)",
      healthcareStatus: "Available",
      healthcareFacility: "Nandaprayag Primary Health Centre (1.2 km, 4 min ETA)",
      actionRequired: "Request 15 additional mobile chemical toilet units from District SDRF pool."
    },
    {
      id: "SITE-05",
      code: "E",
      name: "Safe Site E",
      facilityName: "Joshimath Cantonment Shelter Hall",
      coords: [30.558, 79.570],
      elevation: "1,890m ASL (Reinforced Military Cantonment Grounds)",
      operationalCapacity: 600, // min(800, 600, 650, 700, 750)
      capacities: {
        shelterCapacity: 800,
        waterCapacity: 600,
        sanitationCapacity: 650,
        healthcareCapacity: 700,
        foodCapacity: 750,
        accessCapacity: 650
      },
      constrainedBy: "WATER",
      constrainedReason: "Capacity constrained by WATER line intake (600 person limit).",
      readiness: "STANDBY",
      status: "RESERVE",
      roadAccess: "Restricted (Heavy vehicles restricted, light 4x4 permitted)",
      powerBackup: "50 kVA DG Set",
      waterSupplyStatus: "70% Overhead Storage",
      sanitationStatus: "85% Permanent Barrack Facilities",
      foodStockDays: "95% (Military composite rations)",
      healthcareStatus: "Available (Military Hospital Joshimath 1.0 km)",
      healthcareFacility: "Military Hospital Joshimath (1.0 km, 4 min ETA)",
      actionRequired: "Standby reserve site. Activate if northern ridge habitations require refuge."
    }
  ],

  // ROAD NETWORK GRAPH (Routes R1 to R5)
  // Explaining time-feasibility: R1 is shorter (8km, 25min) but closure window is 10h < 11h required.
  // R2 is longer (12.4km, 42min) but closure window is 16h > 11h required -> FEASIBLE!
  routes: [
    {
      id: "ROUTE-01",
      code: "R1",
      name: "Route R1 — Helang River Gorge Highway",
      distanceKm: 8.0,
      travelTimeMin: 25,
      status: "AT RISK",
      closureRisk: "HIGH",
      estimatedClosureWindowHours: 10,
      confidence: "High (PWD Sensor & CCTV feed)",
      affectedVillages: ["Village A", "Village D"],
      isTimeFeasibleForVillageA: false, // 10h < 11h required
      reason: "Shortest route, BUT estimated closure window is only 10h. Relocation requires 11h. Fails safety buffer!",
      hazardExposure: "Passes through active scree fall chute at Chainage km 14.5; river inundation risk within 10 hours.",
      coordinates: [
        [30.485, 79.545], // Village A
        [30.495, 79.530],
        [30.505, 79.510], // River gorge
        [30.470, 79.440],
        [30.430, 79.380],
        [30.412, 79.335]  // Safe Site A
      ]
    },
    {
      id: "ROUTE-02",
      code: "R2",
      name: "Route R2 — Upper Ridge Bypass via Pipalkoti (RECOMMENDED)",
      distanceKm: 12.4,
      travelTimeMin: 42,
      status: "OPEN",
      closureRisk: "LOW",
      estimatedClosureWindowHours: 16,
      confidence: "High (PWD Patrol Inspected T-1h)",
      affectedVillages: ["Village A", "Village B", "Village G"],
      isTimeFeasibleForVillageA: true, // 16h > 11h required
      reason: "Recommended route is NOT the shortest route. It is the safer time-feasible route (16h window > 11h required).",
      hazardExposure: "Upper terrace alignment 85m above high flood level; reinforced toe retaining walls; culverts cleared.",
      coordinates: [
        [30.485, 79.545], // Village A
        [30.475, 79.520],
        [30.460, 79.480],
        [30.440, 79.435], // Pipalkoti ridge
        [30.425, 79.380],
        [30.412, 79.335]  // Safe Site A
      ]
    },
    {
      id: "ROUTE-03",
      code: "R3",
      name: "Route R3 — South Hill Arterial Link",
      distanceKm: 18.2,
      travelTimeMin: 58,
      status: "OPEN",
      closureRisk: "LOW",
      estimatedClosureWindowHours: 22,
      confidence: "Medium (Remote satellite slope stability model)",
      affectedVillages: ["Village C", "Village F", "Village G"],
      isTimeFeasibleForVillageA: true,
      reason: "Secondary backup route. Long travel time but maximum clearance from riverbed.",
      hazardExposure: "High ridge elevation. Minor forest runoff over km 8, passable for high-clearance buses.",
      coordinates: [
        [30.512, 79.610],
        [30.480, 79.580],
        [30.450, 79.510],
        [30.435, 79.475],
        [30.330, 79.325]  // Safe Site D
      ]
    },
    {
      id: "ROUTE-04",
      code: "R4",
      name: "Route R4 — Rishi Valley Confluence Road",
      distanceKm: 6.5,
      travelTimeMin: 20,
      status: "HIGH CLOSURE RISK",
      closureRisk: "CRITICAL",
      estimatedClosureWindowHours: 6,
      confidence: "High (River gauge telemetry)",
      affectedVillages: ["Village B"],
      isTimeFeasibleForVillageA: false,
      reason: "Imminent closure: Rapid water rise will inundate low-lying culvert at km 3 within 6 hours.",
      hazardExposure: "Very close to active riverbed.",
      coordinates: [
        [30.498, 79.582],
        [30.480, 79.550],
        [30.450, 79.480]
      ]
    },
    {
      id: "ROUTE-05",
      code: "R5",
      name: "Route R5 — Joshimath-Gopeshwar National Highway 7",
      distanceKm: 24.0,
      travelTimeMin: 70,
      status: "OPEN",
      closureRisk: "LOW",
      estimatedClosureWindowHours: 18,
      confidence: "High (BRO Highway Clearance Unit Active)",
      affectedVillages: ["Village C", "Village D", "Village E", "Village H"],
      isTimeFeasibleForVillageA: true,
      reason: "Heavy multi-axle vehicular corridor connecting northern habitations.",
      hazardExposure: "General mountain highway terrain; one monitored landslide chute at Helang bypass.",
      coordinates: [
        [30.550, 79.565],
        [30.528, 79.525],
        [30.485, 79.545],
        [30.430, 79.430],
        [30.412, 79.335]
      ]
    }
  ],

  // ROUTE TIMELINE STATES (NOW, +4h, +8h, +10h, +12h, +18h)
  timelineStates: {
    "T0": {
      label: "NOW (T+0h)",
      r1Status: "OPEN",
      r1Risk: "LOW",
      r2Status: "OPEN",
      r2Risk: "LOW",
      r4Status: "AT RISK",
      note: "All major routes passable; rain onset observed in upper catchment."
    },
    "T4": {
      label: "+4h",
      r1Status: "AT RISK",
      r1Risk: "MODERATE",
      r2Status: "OPEN",
      r2Risk: "LOW",
      r4Status: "HIGH RISK",
      note: "Route R1 begins showing minor rock debris at Helang gorge; monitored closely."
    },
    "T8": {
      label: "+8h",
      r1Status: "HIGH RISK",
      r1Risk: "HIGH",
      r2Status: "OPEN",
      r2Risk: "LOW",
      r4Status: "BLOCKED",
      note: "Route R4 inundated. Route R1 scree chute saturated; speed restricted to 10 km/h."
    },
    "T10": {
      label: "+10h",
      r1Status: "BLOCKED",
      r1Risk: "CRITICAL",
      r2Status: "OPEN",
      r2Risk: "LOW",
      r4Status: "BLOCKED",
      note: "ROUTE R1 BLOCKED by 400m³ landslide debris at Helang. Route R2 remains fully OPEN."
    },
    "T12": {
      label: "+12h",
      r1Status: "BLOCKED",
      r1Risk: "CRITICAL",
      r2Status: "OPEN",
      r2Risk: "MODERATE",
      r4Status: "BLOCKED",
      note: "Route R1 completely closed. Village A convoys safely utilizing Route R2."
    },
    "T18": {
      label: "+18h",
      r1Status: "BLOCKED",
      r1Risk: "CRITICAL",
      r2Status: "AT RISK",
      r2Risk: "HIGH",
      r4Status: "BLOCKED",
      note: "End of available window. Route R2 experiencing heavy runoff at tail end."
    }
  },

  // EMERGENCY HELICOPTER EXTRACTION / CANDIDATE LANDING SITES
  candidateHelipads: [
    {
      id: "HELI-01",
      name: "Landing Site H1 — Gopeshwar Police Lines Parade Ground",
      coords: [30.415, 79.330],
      elevation: "1,520m ASL",
      terrain: "Reinforced Flat Asphalt / Grass (Suitable for Mi-17 & ALH Dhruv)",
      obstacleStatus: "Verified Clear (360° clearance, wires removed)",
      weatherVisibility: "6.2 km (Acceptable for VFR Operations)",
      roadAccess: "Immediate (Direct gate onto District Hospital Road)",
      medicalAccessTime: "8 min to District Hospital",
      verificationStatus: "AUTHORITY VERIFIED",
      verifiedBy: "Chamoli District Disaster Management Authority (DDMA)",
      capacityHelis: 3,
      fuelAvailability: "ATF Bowser available on 30 min notice"
    },
    {
      id: "HELI-02",
      name: "Landing Site H2 — Helang Upper Agricultural Terrace",
      coords: [30.520, 79.535],
      elevation: "1,680m ASL",
      terrain: "Terraced Field (Suitable for Light ALH / Chetak only)",
      obstacleStatus: "Caution: High Tension Power Line 340m East",
      weatherVisibility: "4.5 km (Marginal mountain mist)",
      roadAccess: "Pedestrian only (Foot trail to village road)",
      medicalAccessTime: "25 min mobile first aid post",
      verificationStatus: "FIELD VERIFICATION REQUIRED",
      verifiedBy: "Pending Drone Inspection",
      capacityHelis: 1,
      fuelAvailability: "None"
    }
  ],

  // RAPID DRONE / FIELD VERIFICATION MODULE
  droneVerificationTasks: [
    {
      id: "DRONE-01",
      targetSegment: "Route R1 — Helang Chute (Chainage km 14.5)",
      assignedAsset: "Chamoli DDMA QRT Drone Unit #2",
      purpose: "Inspect active scree slope and boulder stability over carriageway",
      status: "COMPLETED",
      timestamp: "T - 35 min",
      finding: "Active debris slide of approx. 120m³. Heavy boulders blocking one lane. Closure imminent within 3-4 hours.",
      impactOnRouting: "Confirmed recommendation to redirect all Village A buses to Route R2."
    },
    {
      id: "DRONE-02",
      targetSegment: "Route R2 — Pipalkoti Upper Bridge (Bridge #4)",
      assignedAsset: "SDRF Chamoli Drone Unit #1",
      purpose: "Structural clearance and flood clearance gauge verification",
      status: "COMPLETED",
      timestamp: "T - 20 min",
      finding: "Bridge deck clear. Freeboard is +4.2m above current water level. Structural integrity stable.",
      impactOnRouting: "Route R2 verified 100% FEASIBLE."
    }
  ],

  // AUTHORITY ACTION WORKFLOW (Responsibility categories)
  authorityActions: [
    {
      id: "ACT-01",
      category: "Approve Relocation Plan",
      responsibleAgency: "District Magistrate / DEOC Command",
      officer: "District Magistrate, Chamoli",
      target: "Village A (1,850 persons to Site A + Site B via Route R2)",
      status: "REQUESTED", // REQUESTED -> ASSIGNED -> IN PROGRESS -> COMPLETED
      priority: "CRITICAL",
      slaTime: "15 min"
    },
    {
      id: "ACT-02",
      category: "Activate Shelter Readiness",
      responsibleAgency: "Sub-Divisional Magistrate (SDM Gopeshwar)",
      officer: "SDM Gopeshwar & Chamoli Nagar Palika",
      target: "Safe Site A (1,100 cap) and Safe Site B (750 cap)",
      status: "ASSIGNED",
      priority: "HIGH",
      slaTime: "30 min"
    },
    {
      id: "ACT-03",
      category: "Request Medical Support",
      responsibleAgency: "Chief Medical Officer (CMO Chamoli)",
      officer: "Chief Medical Officer",
      target: "Deploy 2 Mobile Medical Units with oxygen concentrators to Safe Site B",
      status: "IN PROGRESS",
      priority: "HIGH",
      slaTime: "45 min"
    },
    {
      id: "ACT-04",
      category: "Request Sanitation & Water Support",
      responsibleAgency: "Jal Sansthan Chamoli",
      officer: "Executive Engineer, Jal Sansthan",
      target: "Dispatch 4 water tankers (8,000L each) to augment Site B water limit",
      status: "ASSIGNED",
      priority: "MEDIUM",
      slaTime: "60 min"
    },
    {
      id: "ACT-05",
      category: "Request Transport Mobilization",
      responsibleAgency: "Regional Transport Office (RTO) Chamoli",
      officer: "RTO & Uttarakhand Transport Corp (UTC)",
      target: "Requisition 48 buses (32-seater UTC) + 20 multi-axle shuttle mini-coaches",
      status: "IN PROGRESS",
      priority: "CRITICAL",
      slaTime: "40 min"
    },
    {
      id: "ACT-06",
      category: "Request Road Verification / PWD Escort",
      responsibleAgency: "Public Works Department (PWD) Chamoli",
      officer: "Executive Engineer, PWD Division Gopeshwar",
      target: "Station earthmover at Route R2 Pipalkoti cut; clear minor rolling stones",
      status: "COMPLETED",
      priority: "HIGH",
      slaTime: "Done"
    },
    {
      id: "ACT-07",
      category: "Request Emergency Access Assessment",
      responsibleAgency: "NDRF 8th Battalion & Air Force Liaison Officer",
      officer: "NDRF / Army Aviation Liaison Cell",
      target: "Standby aerial evacuation assessment at Landing Site H1 if ground corridors fail",
      status: "REQUESTED",
      priority: "STANDBY",
      slaTime: "On-call"
    }
  ],

  // GOVERNMENT ALERT INTEGRATION ABSTRACTION (SACHET / CAP)
  sachetIntegration: {
    endpoint: "/api/integrations/sachet",
    providerMode: "DEMO_ALERT_PROVIDER",
    capProtocolVersion: "CAP-v1.2",
    senderId: "IN-UT-CHAMOLI-DEOC-01",
    status: "CONNECTED_SIMULATED",
    lastAlertBroadcast: {
      identifier: "CAP-CHAMOLI-2026-RELOC-0091",
      scope: "Public",
      category: "Geo / Met",
      urgency: "Immediate",
      severity: "Severe",
      certainty: "Observed",
      headline: "FLASH FLOOD & RELOCATION DIRECTIVE — PIPAL TERRACES / VILLAGE A",
      instruction: "All designated residents of Village A: Prepare for pre-disaster transport departure via Route R2 to Gopeshwar Safe Site A & B. Follow ward volunteer instructions."
    }
  },

  // DATA & METHODOLOGY DOCUMENTATION
  methodologyNotes: {
    populationBaseline: "Census of India 2011 — Primary Census Abstract for Chamoli District. Figures are demo-adjusted to reflect 2026 rural habitational growth and temporal daytime/nighttime variations.",
    hazardModelling: "Multi-hazard overlay based on GSI Landslide Susceptibility Atlas of India, IMD Doppler Weather Radar rainfall accumulation products, and CWC Alaknanda/Dhauliganga stage discharge curves (Simulated scenario values).",
    carryingCapacityModel: "Operational Capacity = min(Usable Shelter, Water Supply person-days, Sanitation fixtures, Healthcare buffer, Food rations, Ingress route capacity). Accounts for real operational bottlenecks rather than mere plinth area.",
    relocationWindowModel: "Effective Relocation Window = min(Hazard Inundation Window, Road Passability Closure Window, Shelter Readiness Window). Safety Buffer = Effective Window - Required Transit Time.",
    routeFeasibilityModel: "Graph traversal comparing Route Closure Threshold against Estimated Evacuation Duration. A shorter route is disqualified if its closure window is less than the required transit time."
  },

  // ========================================================================
  // ADD-ON MODULE: RAPID AERIAL VERIFICATION + HUMAN & ANIMAL RESCUE INTEL
  // ========================================================================
  aerialVerification: {
    moduleName: "RAPID AERIAL VERIFICATION",
    moduleSubtitle: "AI-Assisted Human, Livestock & Ground Situation Verification",
    statusBadge: "● DEMO DRONE FEED",
    coreConcept: "PLAN → ACT → VERIFY → RESPOND → RE-PLAN",
    explanation: "AI-assisted aerial verification for post-relocation population, livestock, isolated habitation and ground-access assessment.",
    targetVillageId: "VIL-01",
    targetVillageName: "Village A (Pipal Terraces)",
    activeSensorMode: "COMBINED", // "RGB" | "THERMAL" | "COMBINED"

    // Top Metric Counters
    metrics: {
      peopleExpectedRemaining: 550,
      peopleDetectedEstimate: 537,
      peopleConfidence: "89%",
      peopleUnverified: 13,
      potentialMissedDetected: 18,
      potentialMissedConfidence: "84%",
      livestockExpectedRemaining: 287,
      livestockDetectedEstimate: 231,
      livestockConfidence: "81%",
      livestockUnverifiedGap: 56,
      isolatedLocationsCount: 4,
      criticalGroundFindings: 3
    },

    // Thermal Sensor Heat Signatures (AI-assisted thermal detection)
    thermalData: {
      humanHeatSignatures: 19,
      humanConfidence: "82%",
      animalHeatSignatures: 31,
      animalConfidence: "76%",
      thermalNote: "AI-assisted thermal detection — heat signatures require optical or ground correlation."
    },

    // Drone Flight Path Waypoints (Simulated coordinates across Village A)
    flightPath: [
      [30.481, 79.541],
      [30.484, 79.543],
      [30.487, 79.546],
      [30.489, 79.549],
      [30.488, 79.552],
      [30.485, 79.554],
      [30.482, 79.550],
      [30.483, 79.545]
    ],

    // Human Detections
    humanDetections: [
      {
        id: "HUM-01",
        label: "Upper Hamlet Cluster",
        coords: [30.487, 79.547],
        estimatedCount: 14,
        confidence: "91%",
        verificationStatus: "AI ESTIMATE",
        thermalCorroborated: true,
        notes: "Group assembled near community cistern. Awaiting scheduled batch 4 transit."
      },
      {
        id: "HUM-02",
        label: "Temple Ledge Terrace",
        coords: [30.489, 79.543],
        estimatedCount: 9,
        confidence: "88%",
        verificationStatus: "FIELD VERIFIED",
        thermalCorroborated: true,
        notes: "Verified by SDRF Scout Unit: 5 adults, 4 children sheltered in masonry shrine."
      },
      {
        id: "HUM-03",
        label: "POTENTIAL MISSED POPULATION (Old School Terrace)",
        coords: [30.482, 79.551],
        estimatedCount: 18,
        confidence: "84%",
        verificationStatus: "CRITICAL VERIFICATION REQUIRED",
        thermalCorroborated: true,
        isMissedGroup: true,
        notes: "Expected remaining: 0 for this sector. Aerial observation detects 18 potential persons. Access cut off by minor scree drift."
      }
    ],

    // Isolated Habitations
    isolatedStructures: [
      {
        id: "ISO-01",
        code: "H-01",
        name: "Malla Chhani Homestead",
        coords: [30.491, 79.544],
        peopleEstimate: 5,
        roadAccess: "BLOCKED",
        distanceFromSafeRouteKm: 1.8,
        verificationStatus: "VERIFICATION REQUIRED",
        priority: "CRITICAL",
        notes: "Slope slump observed 120m downstream of trail. Ground foot access severed."
      },
      {
        id: "ISO-02",
        code: "H-02",
        name: "Talla Dhar Hamlet (2 Dwellings)",
        coords: [30.493, 79.549],
        peopleEstimate: 4,
        roadAccess: "BLOCKED",
        distanceFromSafeRouteKm: 2.1,
        verificationStatus: "VERIFICATION REQUIRED",
        priority: "CRITICAL",
        notes: "Stream washout across connecting footbridge. Requires aerial winch or dinghy ferry."
      },
      {
        id: "ISO-03",
        code: "H-03",
        name: "Bhairav Tok Cattle Shed",
        coords: [30.480, 79.548],
        peopleEstimate: 3,
        roadAccess: "RESTRICTED",
        distanceFromSafeRouteKm: 0.9,
        verificationStatus: "FIELD VERIFIED",
        priority: "HIGH",
        notes: "Upper mule track passable on foot; 2 elderly residents refusing to leave livestock."
      },
      {
        id: "ISO-04",
        code: "H-04",
        name: "Ghat Tok Riverside Homestead",
        coords: [30.483, 79.555],
        peopleEstimate: 2,
        roadAccess: "BLOCKED",
        distanceFromSafeRouteKm: 1.4,
        verificationStatus: "CRITICAL VERIFICATION REQUIRED",
        priority: "CRITICAL",
        notes: "Water inundation at courtyard perimeter. Direct river surge exposure."
      }
    ],

    // Animal & Livestock Intelligence
    livestock: {
      estimatedTotal: 420,
      detectedEstimate: 287,
      verifiedCount: 231,
      unverifiedGap: 56,
      highRiskLocations: 3,
      evacuationStatus: "ANIMAL EVACUATION REQUIRED",
      humanPriority: "CRITICAL",
      animalPriority: "HIGH",
      priorityExplanation: "Human life safety remains the primary emergency priority. Animal evacuation is planned where operationally feasible.",

      speciesBreakdown: [
        { species: "Cattle (Cows / Oxen)", estimated: 120, detected: 108, confidence: "81%" },
        { species: "Buffalo", estimated: 65, detected: 58, confidence: "83%" },
        { species: "Goat", estimated: 110, detected: 64, confidence: "78%" },
        { species: "Sheep", estimated: 75, detected: 38, confidence: "75%" },
        { species: "Dog (Canine)", estimated: 28, detected: 10, confidence: "88%" },
        { species: "Horse (Equine / Ponies)", estimated: 22, detected: 9, confidence: "84%" }
      ],

      holdingSite: {
        id: "SITE-L02",
        name: "Livestock Transit Holding Camp L-02",
        location: "Pipalkoti State Agricultural Farm Grounds",
        capacity: 320,
        waterStatus: "Available (Gravity canal + 4 water troughs)",
        feedStockDays: "72% (4 days dry fodder & mineral blocks)",
        transportRequired: "6 multi-axle livestock carriers (requisitioned)",
        recommendedRoute: "Route R2 (Upper Ridge)",
        status: "FEASIBLE"
      },

      gapReason: "Potential animal verification gap of 56 head: Unscanned ravine dense canopy (35%), movement to upper forest ridge (45%), sheltered inside stone cow sheds (20%)."
    },

    // Critical Road Verification Telemetry
    roadVerification: {
      routeCode: "R2",
      routeName: "Route R2 — Upper Ridge Bypass via Pipalkoti",
      databaseStatus: "OPEN",
      aerialObservation: "Possible debris fan spreading across outbound carriageway at Chainage km 6.8.",
      aiConfidence: "78%",
      status: "FIELD VERIFICATION REQUIRED",
      verifiedState: "RESTRICTED", // triggers re-routing to R3 in closed loop
      potholeOrSlideVolume: "Est. 45 m³ colluvial gravel"
    },

    // Safe Site Aerial Verification
    safeSiteVerification: {
      siteCode: "SITE-01",
      siteName: "Safe Site A (Gopeshwar Community College)",
      expectedReadiness: "READY",
      aerialObservation: "Access road OPEN; Parking bays clear; Crowd density MODERATE; Perimeter secure.",
      visibleObstruction: "NONE",
      status: "AI-assisted site verification"
    },

    // Active Rescue & Authority Tasks Generated from Drone
    rescueTasks: [
      {
        id: "RES-001",
        title: "Rescue Priority: Sector 4 (Old School Terrace)",
        village: "Village A (Pipal Terraces)",
        detectedPersons: 18,
        confidence: "84%",
        groundAccess: "Route R2 restricted; Access via Route R3 South Ridge Trail",
        medicalNeed: "1 pregnant female and 3 infants identified by thermal scan",
        priority: "CRITICAL",
        status: "PENDING AUTHORITY ACTION", // PENDING -> ASSIGNED -> IN PROGRESS -> COMPLETED
        createdAt: "T+15 min (Drone DR-001)"
      },
      {
        id: "ANIMAL-007",
        title: "Livestock Rescue: East Cluster Corrals",
        village: "Village A (East Ridge)",
        animalCount: 56,
        species: "Mixed Livestock (28 Cattle, 28 Goats)",
        groundAccess: "Mule track passable with PWD escorts",
        holdingDestination: "Livestock Holding Camp L-02 (Pipalkoti)",
        priority: "HIGH",
        status: "PENDING AUTHORITY ACTION",
        createdAt: "T+22 min (Drone DR-003)"
      }
    ],

    // Drone Mission Log History
    missionHistory: [
      {
        id: "DR-001",
        village: "Village A",
        missionType: "Population Verification",
        started: "10:32 AM",
        coverage: "82%",
        findings: "18 potential missed persons at Old School Terrace",
        confidence: "84%",
        status: "Completed"
      },
      {
        id: "DR-002",
        village: "Village A",
        missionType: "Road Corridor Verification",
        started: "10:48 AM",
        coverage: "91%",
        findings: "Route R2 debris fan observed at km 6.8",
        confidence: "78%",
        status: "Verification Required"
      },
      {
        id: "DR-003",
        village: "Village A",
        missionType: "Livestock & Animal Scan",
        started: "11:05 AM",
        coverage: "78%",
        findings: "231/287 animals verified; 56 unverified gap",
        confidence: "81%",
        status: "Completed"
      },
      {
        id: "DR-004",
        village: "Village B",
        missionType: "Full Situation Assessment",
        started: "11:24 AM",
        coverage: "88%",
        findings: "Rishi Bend river level rising; culvert intact",
        confidence: "86%",
        status: "Completed"
      }
    ]
  }
};

/* ==========================================================================
   RAPID AERIAL VERIFICATION DATA ARCHITECTURE & API ABSTRACTION PROVIDERS
   ========================================================================== */

/**
 * Data Architecture Models:
 * - DroneMission: id, village, missionType, started, coverage, findings, confidence, status
 * - DroneDetection: id, missionId, type, latitude, longitude, confidence, status, timestamp, source
 * - HumanDetection: id, label, coords, estimatedCount, confidence, verificationStatus, thermalCorroborated, notes
 * - AnimalDetection: species, estimated, detected, confidence, riskLevel, holdingSite
 * - RoadVerification: routeCode, databaseStatus, aerialObservation, aiConfidence, status, verifiedState
 * - IsolationDetection: id, code, name, coords, peopleEstimate, roadAccess, distanceFromSafeRouteKm, priority
 * - VerificationTask: id, type, requestedBy, assignedTeam, status, resultTimestamp
 * - RescueTask: id, location, potentialPersons, confidence, access, nearestAccess, priority, status
 * - AnimalRescueTask: id, location, estimatedAnimals, species, access, holdingSite, priority, status
 */

/**
 * Drone Verification API Abstraction Layer
 * Supports pluggable providers: DemoDroneProvider (active), RealDroneProvider (future)
 */
const DroneVerificationProvider = {
  isDemo: true,
  providerName: "DemoDroneProvider",

  /**
   * Fetch current sortie telemetry
   */
  getTelemetry() {
    return {
      altitudeMeters: 120,
      groundSpeedKmh: 28,
      batteryLevelPct: 84,
      sensorStatus: "RGB 4K + FLIR Boson 640 Nominal",
      gpsLock: "RTK 3D Differential Fix (Chamoli Station)",
      windKnots: 8.5
    };
  },

  /**
   * Fetch mission detections for a village
   */
  getDetections(villageId = "VIL-01") {
    return RAKSHA_DATA.aerialVerification.humanDetections;
  },

  /**
   * Fetch animal census telemetry
   */
  getLivestockTelemetry(villageId = "VIL-01") {
    return RAKSHA_DATA.aerialVerification.livestock;
  }
};

/**
 * AI Computer Vision Detection Engine Abstraction Layer
 * Pluggable engine: DemoDetectionEngine (active heuristics), YOLO / Thermal-AI (future)
 */
const DetectionEngine = {
  engineName: "DemoDetectionEngine (Probabilistic Heuristics)",
  version: "v2.6-hackathon",
  classificationType: "AI-assisted detection (Probabilistic)",

  /**
   * Filter detection by confidence threshold
   */
  filterByConfidence(detections, minConfidence = 70) {
    return detections.filter(d => parseInt(d.confidence) >= minConfidence);
  }
};

// Export to window for browser runtime
if (typeof window !== "undefined") {
  window.DroneVerificationProvider = DroneVerificationProvider;
  window.DetectionEngine = DetectionEngine;
}

/* ==========================================================================
   GOVERNMENT ALERT PROVIDER & CELL BROADCAST ABSTRACTION (DEMO_ALERT_PROVIDER=true)
   ========================================================================== */
const GovernmentAlertProvider = {
  isDemo: true,
  providerName: "DemoAlertProvider (Simulation)",
  protocolVersion: "CAP-v1.2 / CBS-Integrated Draft",
  channels: [
    { name: "Cell Broadcast", status: "SIMULATED ACTIVE", note: "No mobile network congestion bypass" },
    { name: "SMS Gateway", status: "SIMULATED QUEUED", note: "Standard telco bulk dispatch" },
    { name: "App Notification", status: "ACTIVE", note: "RAKSHA resident client push" }
  ],

  /**
   * Dispatch simulated public emergency broadcast
   */
  dispatchPublicAlert(alertPayload) {
    return {
      status: "DISPATCHED",
      provider: "DemoAlertProvider",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channelsDelivered: ["Cell Broadcast — DEMO", "SMS — DEMO", "App Notification — DEMO"],
      disclaimer: "Simulated government alert integration. Production deployment requires authorized SACHET/CAP/CBS credentials."
    };
  },

  /**
   * Dispatch operational NDRF response alert
   */
  dispatchNdrfAlert(alertPayload) {
    return {
      status: "SENT → RECEIVED",
      targetUnit: "NDRF 8th Battalion / SDRF Joshimath Base",
      priority: alertPayload.priority || "CRITICAL",
      village: alertPayload.village || "Village A",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }
};

/* ==========================================================================
   NDRF RESPONSE DASHBOARD DATASET & TASK WORKFLOW STATE
   ========================================================================== */
const NDRF_DATA = {
  unitName: "NDRF 8th Bn — Quick Response Team (QRT Sector 4)",
  commandCenter: "Joshimath Forward Staging Post",
  activeAlerts: [
    {
      id: "NDRF-ALERT-01",
      villageId: "VIL-01",
      villageName: "Village A (Pipal Terraces)",
      potentialPersons: 18,
      roadStatus: "Route R2 BLOCKED (Debris at km 6.8)",
      nearestAccess: "Route R3 South Ridge Trail",
      priority: "CRITICAL",
      status: "ALERT RECEIVED", // ALERT RECEIVED -> TASK ACCEPTED -> RESPONSE IN PROGRESS -> RESOLVED
      timestamp: "10:38 AM",
      details: "18 potential persons detected at Old School Terrace via aerial thermal scan. Direct road access cut off by scree fall."
    },
    {
      id: "NDRF-ALERT-02",
      villageId: "VIL-02",
      villageName: "Village B (Rishi Bend)",
      potentialPersons: 9,
      roadStatus: "Route R4 at high flood risk",
      nearestAccess: "Route R5 Highway Link",
      priority: "HIGH",
      status: "ALERT RECEIVED",
      timestamp: "10:45 AM",
      details: "Elderly stranded cluster near lower culvert. River surge warning issued by CWC gauge."
    }
  ],
  animalRescues: [
    {
      id: "NDRF-ANIMAL-01",
      villageId: "VIL-03",
      villageName: "Village C (Dhauli Terraces)",
      estimatedLivestock: "~56 head (Cattle & Goats)",
      holdingSite: "Livestock Holding Camp L-02",
      priority: "HIGH",
      status: "PENDING DEPLOYMENT",
      details: "Mandi cattle pens cut off by small washouts. Transport carriers standing by at Pipalkoti."
    }
  ],
  emergencyAccess: {
    villageName: "Village A",
    groundAccess: "BLOCKED",
    helipads: [
      { code: "H-1", name: "Village A School Football Field", distanceKm: 0.6, status: "CLEAR", windSpeedKnots: 11 },
      { code: "H-2", name: "Pipalkoti Valley Staging Helipad", distanceKm: 4.8, status: "CLEAR", windSpeedKnots: 8 }
    ],
    recommendedBackupCorridor: "Route R3 Ridge Foot-Trail"
  }
};

/* ==========================================================================
   OFFLINE INCIDENT LOCAL CACHE
   ========================================================================== */
const OFFLINE_INCIDENT_CACHE = {
  lastSynchronized: "10:42 AM",
  status: "ONLINE", // "ONLINE" | "DEGRADED" | "OFFLINE"
  cachedHabitationsCount: 8,
  cachedRescueTasksCount: 3,
  cachedSafeSitesCount: 5,
  cachedRoutesCount: 5,
  queuedActions: []
};

// Export to window
if (typeof window !== "undefined") {
  window.GovernmentAlertProvider = GovernmentAlertProvider;
  window.NDRF_DATA = NDRF_DATA;
  window.OFFLINE_INCIDENT_CACHE = OFFLINE_INCIDENT_CACHE;
}


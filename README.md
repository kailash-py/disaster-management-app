# SANKATMOCHAN ()
### Intelligent Pre-Disaster Relocation & Decision Support System
**Smart India Hackathon 2026 — Problem Statement SIH26191**
*"Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations"*

---

## 🎯 30-Second Core Product Story
> **"SANKATMOCHAN turns disaster warnings into coordinated action."**  
> **Plan → Alert → Relocate → Verify → Respond → Safe.**

The judge must understand the product within 30 seconds:
```
HAZARD
  ↓
RED ZONE
  ↓
RELOCATION PLAN
  ↓
AUTHORITY APPROVAL
  ↓
PUBLIC ALERT
  ↓
RELOCATION
  ↓
AERIAL VERIFICATION
  ↓
NDRF RESPONSE IF REQUIRED
  ↓
SAFE
```

---

## 👥 1. 3 Clean Roles & Demo Credentials
The application is strictly organized around 3 clear roles with demo credentials:

| Role | Username / Mobile | Password / OTP | Purpose |
| :--- | :--- | :--- | :--- |
| **District Authority / DM** | `authority` | `demo123` | High-level command, relocation planning, capacity allocation, alert dispatch |
| **NDRF / Response Team** | `ndrf` | `ndrf123` | Actionable rescue alerts, animal rescue, emergency access assessment |
| **Resident** | `9999999999` | `123456` | Simple, clutter-free emergency evacuation directive & distress help |

> **DEMO ENVIRONMENT — NO REAL PERSONAL DATA**

---

## ⚡ 2. 11-Step Rapid 30-Second Evaluator Demo Flow
Click the prominent **`⚡ RUN 30s RAPID DEMO`** button in the header to run the full end-to-end evaluation flow:

1. **Step 1 (0s): Hazard Increases** — Real-time telemetry detects increasing rainfall across the Chamoli catchment.
2. **Step 2 (3s): Village A becomes RED ZONE** — Slope saturation exceeds 91%, crossing critical threshold.
3. **Step 3 (6s): Relocation Plan Generated** — Deterministic multi-site allocation (Site A: 1,100 + Site B: 750 = 1,800 people).
4. **Step 4 (9s): Authority Approves** — District Magistrate signs off on evacuation mission.
5. **Step 5 (12s): Public Alert + NDRF Alert Generated** — Dispatched via simulated `GovernmentAlertProvider`.
6. **Step 6 (15s): Residents Receive Simulated Alert** — Displays clean emergency evacuation directive screen.
7. **Step 7 (18s): Relocation Starts** — 1,240 people moving / relocated; live status updates.
8. **Step 8 (21s): Aerial Verification Detects** — UAV-QRT-01 reconnaissance detects 18 persons, 56 livestock, and R2 blockage.
9. **Step 9 (24s): NDRF Dashboard Receives Rescue Alert** — Tactical QRT team alerted for Old School Terrace.
10. **Step 10 (27s): NDRF Accepts Task** — Status advances to `TASK ACCEPTED` → `RESPONSE IN PROGRESS`.
11. **Step 11 (30s): Route Recalculated to R3** — Closed-loop re-routing activates Plan B; Final state: `SAFE / RESCUE IN PROGRESS`.

---

## 🌦️ 3. Real-Time Weather API Integration (Open-Meteo)
Integrated live weather intelligence using the **Open-Meteo Weather API**:
- **Multi-Village Coordinates:** Automatically fetches live telemetry using each village's stored latitude and longitude (e.g. Village A: `30.485, 79.545`).
- **Live Metrics:**
  - 🌡️ Temperature (°C)
  - 🌧️ Rainfall / Precipitation (mm)
  - 💧 Humidity (%)
  - 💨 Wind Speed (km/h)
  - ☁️ Weather condition from WMO interpretation codes
  - 📊 Precipitation probability (%)
  - 🕐 Last updated timestamp
- **24-Hour Forecast Timeline:** `NOW → +3h → +6h → +12h → +24h` showing rain probability, precipitation, and temperature.
- **AI/Rule-Based Weather Risk Signal:** Categorized as `NORMAL`, `WATCH`, `HIGH`, `CRITICAL` based on configurable thresholds.
  - *Clearly labeled as: "AI/Rule-based Weather Risk Signal — Decision Support Only"*.
- **Weather → Relocation Engine Connection:** When weather deterioration is detected, the relocation window is constrained (e.g. -2h buffer), routes at risk increase, and the authority receives a warning: *"Weather deterioration detected — reassess relocation window."*
- **Offline / Failure Resilience:** In-memory caching (10 min validity). If offline or API fails, displays `⚠ LIVE WEATHER UNAVAILABLE` with the last update time.
- **Safety Rule:** Weather is an input alongside hazard, terrain, exposure, routes, and capacity. It is **never** presented as an autonomous flood prediction or automated evacuation order.

---

## 🏛️ 4. Authority Command Center & Metrics
- **Top Metrics:**
  1. Red Zone Habitations (1 Critical)
  2. People Requiring Relocation (1,800)
  3. Safe Capacity (2,750 person-capacity across 5 sites)
  4. Relocation Window (18h available vs 11h required)
  5. Routes at Risk (2 / 5 corridors at risk)
  6. Live Weather (Open-Meteo live feed + Risk badge)
- **Top Response Priorities (Right Panel):**
  - Village A: 1,800 people • 18h available • 11h required • `CRITICAL`
  - Action buttons: `[VIEW]` (pans map and highlights) and `[GENERATE PLAN]` (opens 10-step mission modal).
- **Send Alert Modal:**
  - `[ALERT NDRF]`: 🚨 NDRF Response Alert with location, road status, and headcount.
  - `[PUBLIC ALERT]`: 📢 Emergency Evacuation Alert dispatched via simulated Cell Broadcast, SMS, and App notification.

---

## 📊 5. Simplified Relocation Status
Replaced complex multi-step timelines with a clean **4-Stage Stepper**:
```
PLAN ✓      → 1,800 people identified
APPROVED ✓  → Authority approved by District Magistrate
MOVING ●    → 1,240 moving / relocated
SAFE ○      → 560 remaining (Only shows completed when all safe)
```

---

## 🚨 6. NDRF Response Dashboard (`/ndrf`)
Actionable, tactical interface for search and rescue units:
- **ACTIVE RESCUE ALERTS:**
  - Village A: 18 potential persons detected, Road R2 blocked, Priority: CRITICAL (`[VIEW LOCATION]`, `[ACCEPT TASK]`).
  - Village B: Stranded cluster, Priority: HIGH (`[VIEW]`, `[ACCEPT TASK]`).
- **ANIMAL RESCUE:**
  - Village C: ~56 livestock requiring assistance (`[VIEW TASK]`).
- **EMERGENCY ACCESS:**
  - Ground access: BLOCKED (`[ASSESS ALTERNATIVE ACCESS]` via Helipad H-1 and Ridge Trail).
- **Task Workflow:** 1-click status cycle:
  `ALERT RECEIVED` → `TASK ACCEPTED` → `RESPONSE IN PROGRESS` → `RESOLVED`. No bloated paperwork.

---

## 🛸 7. Simplified Aerial Verification
Single sidebar menu item: **🛸 Aerial Verification**.
Shows 3 prominent, actionable cards:
1. **PEOPLE:** Potential persons detected: 18 • Confidence: 84% • `[CREATE RESCUE TASK]`
2. **ANIMALS:** Potential livestock detected: 56 • East Ravine • `[CREATE ANIMAL TASK]`
3. **ROAD:** R2: Possible blockage • km 6.8 debris • `[VERIFY ROAD]`
- **Zero Identity Verification Rule:** Strictly situational detection. No Aadhaar numbers, personal names, phone numbers, or facial recognition.
- **Live Flight Simulation Canvas:** Interactive SVG flight path with RGB, Thermal FLIR, and Fused vision sensor modes.

---

## 📡 8. Government Alert Integration & Network Resilience
- **Integration Abstraction:** `GovernmentAlertProvider` with `DEMO_ALERT_PROVIDER=true`.
  - Dispatches simulated Cell Broadcast, SMS, and App notifications.
  - Labeled: *"Simulated government alert integration. Production deployment requires authorized government integration (SACHET/CAP/CBS)."*
  - No fake government credentials; no false claims of direct production government API connection.
- **Network Status Simulator:**
  - `🟢 NORMAL`: Cell Broadcast, SMS, App online.
  - `🟡 DEGRADED`: Cell Broadcast active; SMS retry and App retry queues engaged.
  - `🔴 CELLULAR OUTAGE`: *"Cellular network unavailable. Digital alerts queued. Fallback communication required: Radio / Satellite / Field communication."*
  - On reconnect: *"Queued alert delivery resumed."*
- **Offline Mode:** NDRF and Authority dashboards cache 8 villages, 3 rescue tasks, 5 safe sites, 5 routes locally. Offline actions are marked `QUEUED` with a `SYNC NOW` button.

---

## 📱 9. Simplified Resident Emergency Alert
When logging in as a resident or switching to Resident view:
```
🚨 EVACUATION ALERT
Your area: Village A
Risk: HIGH
Go to: Safe Site A
Recommended route: R2
Avoid: R1

[VIEW ROUTE]
[EMERGENCY HELP]
```
No complicated graphs or confusing technical jargon.

---

## 📚 10. Communication Architecture (Methodology)
```
SANKATMOCHAN
       ↓
Authorized Alert Gateway
       ↓
Government Alert Infrastructure
       ↓
NDRF / Response Authorities
       ↓
Residents
```
- Prototype: `DemoAlertProvider`
- Production: Authorized SACHET / CAP / Cell Broadcast integration.

---

## 📂 Project Structure
```
├── index.html            # Main SPA with Command Center, NDRF View, Resident View, Modals
├── styles.css            # Vanilla CSS design system (tokens, 4-stage stepper, weather, NDRF cards)
├── app.js                # Core controller: 3 roles, weather API, 30s demo runner, offline queue
├── relocation-engine.js  # Deterministic algorithms (Capacity, Window, Multi-site, Routes)
├── geo-data.js           # Chamoli dataset: villages, routes, sites, alert providers, NDRF data
└── README.md             # Complete documentation and evaluators' walkthrough
```

---

## 🏁 How to Run
1. Open `index.html` in any modern web browser (Edge, Chrome, Firefox).
2. No Node.js build step or local server required.
3. Click **`⚡ RUN 30s RAPID DEMO`** to demonstrate the complete closed-loop lifecycle to evaluators.

---

## 🏘️ 11. Permanent Relocation (Repeat-Flood Habitations) — NEW
Sidebar → **Permanent Relocation**. Emergency evacuation (Plan A/B) ke saath-saath un habitations ke liye **permanent safe resettlement site** jahan baar-baar baadh aati hai.
- **Flood Recurrence Score (0-100):** frequency 40% + severity 25% + current hazard 20% + floodplain exposure 15% (10-year flood history).
- **3 decisions:** `PERMANENT RELOCATION RECOMMENDED` / `EVALUATE` / `TEMPORARY EVACUATION + MONITOR`.
- **Permanent sites (P1–P5)** emergency Safe Sites se alag; hard gates: geological clearance, ≥30 m above flood level, outside red zone. Capacity = min(land, water, sanitation, power, access).
- **Allocation:** floodplain households ko nearest eligible site par assign; capacity gap aur "clearance pending" option dikhata hai.
- **Progress stepper:** `PROPOSED → GRAM SABHA CONSENT → DM APPROVED → CONSTRUCTION → RESETTLED`.
- Flood history & sites **DEMO / SIMULATED** hain. Existing files unchanged; naya code sirf `permanent-relocation.js` mein hai.

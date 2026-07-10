# 🚀 AeroTwin — Remaining Feature Roadmap

> **Quick Wins Already Shipped ✅**
> 4.2 · 4.5 · 4.7 · 4.14 · 4.18 — these are done and live in the project.
> Everything below is what's still left to build.

---

## 🔥 Impact Legend
| Badge | Meaning |
|---|---|
| 🔥🔥🔥 | High impact — major capability unlock |
| 🔥🔥 | Medium impact — solid improvement |
| 🔥 | Low-Medium impact — nice to have |

---

## 🤖 ML Pipeline — 4 Features Remaining

### 4.1 — Upgrade to LSTM / Transformer Model
**Impact: 🔥🔥🔥 High**

Random Forest works well on tabular snapshots, but RUL prediction is a time-series problem at heart. An LSTM would read the full sequence of sensor readings across cycles instead of just a rolling window of 10.

What it unlocks:
- Learn temporal degradation patterns directly from raw sequences — no manual feature engineering
- Capture non-linear degradation curves that Random Forest misses
- Output a probability distribution over RUL, not just a point estimate

```python
class RULPredictor(nn.Module):
    def __init__(self, input_dim=12, hidden_dim=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 1)

    def forward(self, x):  # x: (batch, seq_len, features)
        _, (h_n, _) = self.lstm(x)
        return self.fc(h_n[-1])
```

---

### 4.3 — Bayesian Uncertainty Quantification
**Impact: 🔥🔥 Medium**

Right now the dashboard shows a single RUL number (e.g. "147 cycles"). Engineers need to know how confident the model is. Are we 90% sure it's 147, or could it be anywhere from 80 to 220?

What it unlocks:
- **MC Dropout:** Run the model 50× with different dropout masks, take the spread as uncertainty
- **Quantile Regression:** Predict 10th / 50th / 90th percentile RUL simultaneously
- Dashboard shows a confidence band: `"RUL: 147 cycles  [120 – 175 at 90% confidence]"`

---

### 4.4 — Online Learning / Model Drift Detection
**Impact: 🔥🔥🔥 High**

The current model is static — trained once, never updated. In production, engine behavior drifts over time (different aircraft, different climates, new fault patterns).

What it unlocks:
- **Drift detector:** Monitor prediction error over the last N cycles; alert if it exceeds a threshold
- **Incremental retraining:** Schedule automatic re-training on recent data every week
- **A/B model comparison:** Run old and new model in parallel, compare accuracy before switching

---

### 4.25 — Digital Twin Synchronization Protocol
**Impact: 🔥🔥🔥 High**

AeroTwin currently speaks only its own internal format. Enterprise aviation systems (Airbus, Boeing MRO platforms) use standardized twin protocols.

What it unlocks:
- Implement **DTDL** (Digital Twins Definition Language — Microsoft Azure standard)
- AeroTwin becomes compatible with enterprise PLM systems (SAP, Siemens Teamcenter)
- Data export in standardized format for regulatory / audit use
- Opens path to Azure Digital Twins cloud integration

---

## ⚙️ Backend — 4 Features Remaining

### 4.6 — Authentication & Multi-User Support
**Impact: 🔥🔥 Medium**

Currently the dashboard has zero auth — anyone with the URL can inject anomalies or reset the simulation.

What it unlocks:
- **JWT-based login** — token issued on login, verified on every API call
- **Role-based access:**
  - `viewer` — read-only dashboard
  - `engineer` — can acknowledge alerts
  - `admin` — can inject anomalies, reset simulation, retrain model
- Multi-session support — multiple users monitoring simultaneously

---

### 4.8 — Data Retention & Archival Policy
**Impact: 🔥🔥 Medium**

The `sensor_readings` table currently grows forever. At 3 rows per tick × every 2 seconds = **~130,000 rows/day**. After a week of demo, queries slow down noticeably.

What it unlocks:
- **PostgreSQL table partitioning** by date — queries only scan relevant partitions
- **Retention policy:** auto-archive data older than 7 days to compressed cold storage
- **TimescaleDB extension** — purpose-built for time-series, orders of magnitude faster on aggregation queries

---

### 4.9 — Health Check Endpoint
**Impact: 🔥 Low-Medium**

No way to currently know if the backend is healthy without opening the dashboard.

What it unlocks:
- `GET /api/status` returns JSON with:
  - Database connectivity ✅/❌
  - ML model loaded ✅/❌
  - Current simulation mode (CSV / Live)
  - Active WebSocket connections count
  - Memory usage
- Enables uptime monitoring (UptimeRobot, Grafana, etc.)

---

### 4.10 — Async DB Write Queue
**Impact: 🔥🔥 Medium**

Every 2-second tick currently does 5 synchronous PostgreSQL writes in sequence before the next tick can begin. Under load or on slow hardware, this blocks the entire processing loop.

What it unlocks:
- **Redis or RabbitMQ** as a write buffer — tick completes instantly, writes happen in background
- **Batch inserts** using `psycopg2.extras.execute_values()` — 10× faster than row-by-row
- Processing loop never blocked by DB latency

---

## 🖥️ Frontend — 3 Features Remaining

### 4.11 — Interactive 3D Engine Visualization
**Impact: 🔥🔥🔥 High**

The README and architecture mention Three.js and `EngineModel.jsx`, but the actual 3D model isn't built yet. This is the biggest visual wow-factor feature remaining.

What it unlocks:
- Full 3D turbofan engine rendered in the browser (Three.js)
- Each component (Turbine Blade, Compressor, Bearing) **glows GREEN → AMBER → RED** based on live health %
- Click any component to zoom in and see its sensor breakdown
- Animated shaft rotation that speeds up/slows down based on RPM readings
- Heat map overlay showing temperature distribution across the engine

---

### 4.12 — Predictive RUL Projection Charts
**Impact: 🔥🔥 Medium**

Current charts only show history — what already happened. Engineers need to see where the engine is heading.

What it unlocks:
- **RUL projection curve:** Extends the trend line forward in time with confidence bands (links to 4.3)
- **"What-if" mode:** Drag a slider to simulate "what if degradation rate doubles?"
- **Baseline overlay:** Show current engine's degradation curve vs. a healthy reference engine side by side

---

### 4.15 — Mobile Responsiveness
**Impact: 🔥🔥 Medium**

The dashboard uses fixed sidebar widths and hardcoded pixel layouts. Completely unusable on a phone or tablet.

What it unlocks:
- Responsive CSS breakpoints for tablet (768px) and mobile (375px)
- Collapsible sidebar with hamburger menu on small screens
- Charts resize dynamically instead of overflowing
- Maintenance engineers can check engine health from their phone on the hangar floor

---

## 🏗️ Architecture — 2 Features Remaining

### 4.16 — Full Docker Compose Stack
**Impact: 🔥🔥 Medium**

Current `docker-compose.yml` only spins up PostgreSQL. Backend and frontend still require manual setup.

What it unlocks:
- Single `docker-compose up` command boots the **entire stack** — Postgres + Flask + React + Redis
- Zero manual environment setup for new contributors
- Consistent environment across dev / staging / production

```yaml
services:
  postgres:
    image: postgres:16
  backend:
    build: ./server
    depends_on: [postgres]
  frontend:
    build: ./client
    depends_on: [backend]
  redis:
    image: redis:7
```

---

### 4.17 — CI/CD Pipeline (GitHub Actions)
**Impact: 🔥🔥 Medium**

No automated checks currently run on push/PR. A bad commit can silently break the ML pipeline or API.

What it unlocks:
- **On every push:** Python linting (flake8), unit tests (pytest), ML model validation (assert MAE < threshold)
- **On PR merge:** Frontend build + Lighthouse performance audit
- **On release tag:** Docker image build → push to GitHub Container Registry
- PRs can't merge if tests fail

---

## 🌟 Ambitious Features — 7 Remaining

### 4.13 — Dark / Light Theme Toggle
**Impact: 🔥 Low**

Dashboard is hardcoded to dark theme. Adding a toggle takes ~2 hours but makes the project feel more polished.

What it unlocks:
- Light mode for export / presentation scenarios (PDF export on white background)
- User preference saved to localStorage
- CSS variable-based theming — one toggle flips the whole UI

---

### 4.19 — API Rate Limiting
**Impact: 🔥 Low**

The `/api/anomaly` endpoint currently has no rate limit. Anyone could spam it and crash the simulation loop.

What it unlocks:
- Flask-Limiter: max 5 anomaly injections per minute per IP
- Prevents accidental (or intentional) abuse during live demos
- Returns clear `429 Too Many Requests` with retry-after header

---

### 4.20 — Multi-Engine Fleet View
**Impact: 🔥🔥🔥 High**

The single biggest architectural expansion. Currently AeroTwin monitors 1 engine. Real airlines operate fleets of 30–300 aircraft.

What it unlocks:
- Fleet dashboard: grid of 10–30 engine cards, each showing health % and status color
- **Comparative analytics:** Sort engines by degradation rate — which ones need attention soonest?
- **Fleet-wide alerts:** "3 engines in AMBER simultaneously — consider rescheduling maintenance window"
- Background worker polls all engines in parallel via separate simulation threads

---

### 4.21 — Maintenance Cost Optimizer
**Impact: 🔥🔥🔥 High**

Turns RUL predictions into actual business decisions and dollar figures.

What it unlocks:
- **Cost model:** Scheduled inspection = $X, unplanned AOG event = $150K–$300K/day
- Given RUL predictions across the fleet, calculate the **optimal maintenance schedule** that minimizes total cost
- Gantt chart of planned maintenance windows across all engines
- Output: "Inspecting Engine 7 this week saves an estimated $84,000 vs. waiting until next month"

---

### 4.22 — Edge AI Deployment (NVIDIA Jetson)
**Impact: 🔥🔥🔥 High**

AeroTwin currently runs on a server. The vision is ML inference running on hardware attached directly to the engine — true Edge AI.

What it unlocks:
- Export the trained Random Forest (or LSTM) to **ONNX** format
- Convert to **TensorRT** for Jetson hardware acceleration
- Jetson Nano (~₹8,000) does local inference in real time with real MEMS sensors
- Cloud sync: Jetson sends health snapshots to central dashboard every minute
- Latency drops from ~100ms (cloud round-trip) to ~2ms (local inference)

---

### 4.23 — Natural Language Querying (LLM Integration)
**Impact: 🔥🔥 Medium**

Add a chat interface inside the dashboard so engineers can query engine health in plain English.

What it unlocks:
- *"What's the current health of the bearing?"* → returns live health %
- *"When was the last CRITICAL alert?"* → queries PostgreSQL alert log
- *"Show me vibration trend for the last 100 cycles"* → renders the chart
- LLM translates natural language → API call → formats response back to English
- Built with Anthropic Claude API or OpenAI function calling

---

### 4.24 — Notification System (Email / SMS / Slack)
**Impact: 🔥🔥 Medium**

Alerts currently only appear inside the dashboard. If no one is watching the screen, CRITICAL alerts go unnoticed.

What it unlocks:
- **Email:** Send alert digest to maintenance team on RED/CRITICAL events (via SendGrid or SMTP)
- **Slack/Teams webhook:** Post to `#engine-alerts` channel automatically
- **SMS:** On-call maintenance crew gets a text for CRITICAL (via Twilio)
- Configurable per-user preferences: choose which severity levels trigger which channel

---

## 📋 Full Remaining Feature Summary

| # | Feature | Area | Impact | Size |
|---|---|---|---|---|
| 4.1 | LSTM / Transformer Model | ML | ★ ★ ★ | Large |
| 4.3 | Bayesian Uncertainty Quantification | ML | ★ ★ | Medium |
| 4.4 | Online Learning / Drift Detection | ML | ★ ★ ★ | Large |
| 4.6 | Authentication & Multi-User | Backend | ★ ★ | Medium |
| 4.8 | Data Retention & Archival | Backend | ★ ★ | Medium |
| 4.9 | Health Check Endpoint | Backend | ★ | Small |
| 4.10 | Async DB Write Queue | Backend | ★ ★ | Medium |
| 4.11 | 3D Engine Visualization | Frontend | ★ ★ ★ | Large |
| 4.12 | RUL Projection Charts | Frontend | ★ ★ | Medium |
| 4.13 | Dark / Light Theme Toggle | Frontend | ★ | Small |
| 4.15 | Mobile Responsiveness | Frontend | ★ ★ | Medium |
| 4.16 | Full Docker Compose Stack | Architecture | ★ ★ | Medium |
| 4.17 | CI/CD Pipeline | Architecture | ★ ★ | Medium |
| 4.19 | API Rate Limiting | Architecture | ★ | Small |
| 4.20 | Multi-Engine Fleet View | Feature | ★ ★ ★ | Large |
| 4.21 | Maintenance Cost Optimizer | Feature | ★ ★ ★ | Large |
| 4.22 | Edge AI Deployment (Jetson) | Feature | ★ ★ ★ | Large |
| 4.23 | Natural Language Querying (LLM) | Feature | ★ ★ | Medium |
| 4.24 | Notification System | Feature | ★ ★ | Medium |
| 4.25 | Digital Twin Sync Protocol | Feature | ★ ★ ★ | Large |

---

## ✅ Already Shipped (for reference)

| # | Feature | Status |
|---|---|---|
| 4.2 | Use All 4 C-MAPSS Sub-Datasets | ✅ Done |
| 4.5 | SHAP Explainability | ✅ Done |
| 4.7 | WebSocket Transport | ✅ Done |
| 4.14 | PDF / CSV Export | ✅ Done |
| 4.18 | Unit Test Suite | ✅ Done |

---

*AeroTwin · Team FELONS · Tata Technologies InnoVent-27*
<div align="center">

<!-- HERO BANNER -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0D1B3E&height=200&section=header&text=AeroTwin&fontSize=80&fontColor=00A8E8&animation=fadeIn&fontAlignY=38&desc=Real-Time%20Digital%20Twin%20for%20Predictive%20Aircraft%20Engine%20Health%20Monitoring&descAlignY=60&descColor=FFFFFF&descSize=16" width="100%"/>

<!-- BADGES -->
<p align="center">
  <img src="https://img.shields.io/badge/InnoVent--27-Tata%20Technologies-0D1B3E?style=for-the-badge&logo=airplane&logoColor=00A8E8"/>
  <img src="https://img.shields.io/badge/Track-AI%20at%20the%20Edge%20%7C%20Aerospace-005B9E?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Status-In%20Development-F07D00?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/License-MIT-007A3D?style=for-the-badge"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Three.js-r158-000000?style=flat-square&logo=threedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/scikit--learn-1.4-F7931E?style=flat-square&logo=scikit-learn&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Socket.IO-4.7-010101?style=flat-square&logo=socket.io&logoColor=white"/>
</p>

<br/>

> **AeroTwin** is a full-stack, real-time Digital Twin system for predictive aircraft engine health monitoring.  
> It ingests live sensor telemetry — from the **NASA C-MAPSS dataset** or a built-in **live simulation engine** —  
> processes it through a fatigue calculation algorithm and an ML model,  
> and streams component health, Remaining Useful Life (RUL), and maintenance alerts to a live interactive dashboard.

<br/>

**Team FELONS** &nbsp;|&nbsp; Tata Technologies InnoVent-27 &nbsp;|&nbsp; AI at the Edge &nbsp;|&nbsp; Aerospace Track

</div>

---

## 📋 Table of Contents

- [What is AeroTwin?](#-what-is-aerotwin)
- [Live Demo Highlights](#-live-demo-highlights)
- [Two Data Modes](#-two-data-modes)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [NASA C-MAPSS Dataset](#-nasa-c-mapss-dataset)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [WebSocket Events](#-websocket-events)
- [Database Schema](#-database-schema)
- [ML Pipeline](#-ml-pipeline)
- [Team](#-team)
- [License](#-license)

---

## 🛩 What is AeroTwin?

Modern commercial aircraft engines generate thousands of sensor readings per second — temperature, vibration, RPM, pressure — during every flight. Yet most airlines still maintain engines on **fixed calendar schedules**, not on actual measured health. This means:

- ✈ **Over-maintenance** — healthy engines are grounded and inspected unnecessarily  
- 💥 **Under-maintenance** — gradual faults develop between inspection windows, undetected  
- 💸 **$150,000+/day** lost per unplanned Aircraft on Ground (AOG) event

**AeroTwin solves this.** It creates a continuously-updated virtual replica of a commercial turbofan engine, monitoring three critical components in real time:

| Component | Fault Mode | C-MAPSS Mapping |
|---|---|---|
| 🔧 **Turbine Blade** | Thermal fatigue, FOD damage | Fan Degradation (FD003/FD004) |
| ⚙ **Bearing** | Wear, vibration-induced failure | HPC Degradation signals |
| 🌀 **Compressor** | Fouling, pressure loss | HPC Degradation (FD003/FD004) |

> **Engine scope:** Commercial turbofan engines (CFM56 / GE90 class — Boeing 737, Airbus A320/A380 family).  
> Calibrated against **NASA C-MAPSS** (Commercial Modular Aero-Propulsion System Simulation) — the global benchmark dataset for aircraft engine predictive maintenance research, used in 1,000+ academic papers.

---

## ⚡ Live Demo Highlights

The AeroTwin dashboard demonstrates:

```
✅  Real-time health score per component (0–100%) — updates every 2 seconds
✅  Live fatigue trend graphs (temperature, vibration, fatigue accumulation)
✅  ML-based Remaining Useful Life (RUL) prediction with confidence band
✅  Tiered alert system: 🟢 GREEN → 🟡 AMBER → 🔴 RED → 🚨 CRITICAL
✅  One-click anomaly injection — watch health plummet and CRITICAL alert fire in < 2 seconds
✅  Historical sensor log — full audit trail of degradation trajectory
✅  Mode toggle: switch between NASA CSV data and live synthetic simulation instantly
```

---

## 🔘 Two Data Modes

AeroTwin supports two completely interchangeable data sources, switchable live via a dashboard toggle:

```
┌─────────────────────────────────────────────────────────────┐
│  ⬤ MODE A — CSV Replay       ○ MODE B — Live Simulation    │
│    NASA C-MAPSS Dataset           Synthetic Engine Data     │
└─────────────────────────────────────────────────────────────┘
```

### Mode A — CSV Replay (NASA C-MAPSS Dataset)

Replays rows from the real NASA C-MAPSS research dataset as if arriving live from sensors.  
Each row = one flight cycle of real turbofan engine sensor data.

```
NASA C-MAPSS CSV
    ↓  (one row every 2 seconds)
Flask csv_reader.py reads & maps sensors
    ↓
Same pipeline as Mode B →→→ Dashboard
```

**Best for:** Demonstrating that AeroTwin uses real NASA research data. Highest credibility for judges.

### Mode B — Live Simulation (Synthetic Real-Time)

Generates sensor readings mathematically in real time using a physics-informed degradation model calibrated against C-MAPSS parameters.

```
Python Simulator (background thread)
    ↓  (generates reading every 2 seconds)
Calibrated degradation formula
    ↓
Same pipeline as Mode A →→→ Dashboard
```

**Best for:** Live demonstrations — inject anomalies on demand, control simulation speed, reset to baseline.

> **Both modes feed into the identical pipeline.** The fatigue engine, ML model, WebSocket server, and React dashboard cannot tell the difference between them.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 5 — PRESENTATION                           │
│   React.js Dashboard  │  Three.js 3D Engine  │  Recharts Charts    │
│   Mode Toggle (CSV/Live)  │  Alert Panel  │  Historical Log Modal  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │  WebSocket (Socket.IO)
                                 │  < 100ms latency
┌────────────────────────────────▼────────────────────────────────────┐
│                 LAYER 4 — APPLICATION & API                         │
│   Flask REST API (7 endpoints)  │  Mode Switch Controller          │
│   PostgreSQL ORM  │  Session Management  │  CORS                   │
└──────────┬─────────────────────────────────────────┬───────────────┘
           │ READ/WRITE                              │ READ
┌──────────▼──────────┐              ┌──────────────▼───────────────┐
│   POSTGRESQL DB      │              │   LAYER 2 — INTELLIGENCE     │
│  sensor_readings     │              │  fatigue_engine.py           │
│  health_snapshots    │◄────────────►│  ml_model.py (Random Forest) │
│  maintenance_log     │              │  alert_engine.py             │
└─────────────────────┘              │  feature_engineer.py         │
                                     └──────────────┬───────────────┘
                                                    │
                    ┌───────────────────────────────▼────────────────┐
                    │          LAYER 1 — DATA SOURCE                 │
                    │                                                │
                    │  MODE A: csv_reader.py                         │
                    │  ┌─────────────────────────────────────────┐   │
                    │  │  NASA C-MAPSS CSV  →  Row by Row        │   │
                    │  │  FD003 / FD004 cleaned dataset          │   │
                    │  └─────────────────────────────────────────┘   │
                    │                    OR                           │
                    │  MODE B: simulator.py                          │
                    │  ┌─────────────────────────────────────────┐   │
                    │  │  Physics-Informed Synthetic Generator   │   │
                    │  │  Calibrated to C-MAPSS parameters       │   │
                    │  └─────────────────────────────────────────┘   │
                    └────────────────────────────────────────────────┘
```

### Data Flow (One Complete Cycle)

| Step | Layer | What Happens | File |
|---|---|---|---|
| 1 | Layer 1 | Reading generated (CSV row or synthetic) | `csv_reader.py` / `simulator.py` |
| 2 | Layer 2 | Sensor values mapped to 3 components | `component_mapper.py` |
| 3 | Layer 4 DB | Raw reading saved to PostgreSQL | `db_writer.py` |
| 4 | Layer 2 | Fatigue formula → health_score updated | `fatigue_engine.py` |
| 5 | Layer 2 | Last 10 readings → 12 ML features | `feature_engineer.py` |
| 6 | Layer 2 | Random Forest → predicted_rul + confidence | `ml_model.py` |
| 7 | Layer 4 DB | Health snapshot saved | `db_writer.py` |
| 8 | Layer 2 | Alert engine evaluates RUL thresholds | `alert_engine.py` |
| 9 | Layer 3 | Socket.IO emits 3 events to all clients | `socketio_server.py` |
| 10 | Layer 5 | React re-renders dashboard components | `Dashboard.jsx` |
| 11 | Layer 5 | Three.js mesh color interpolates | `EngineModel.jsx` |
| 12 | Layer 5 | Recharts chart series appended | `HealthChart.jsx` |

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React.js 18 | Real-time dashboard, Socket.IO state management |
| **Frontend** | Three.js | 3D engine component visualization with health-based color transitions |
| **Frontend** | Recharts | Live fatigue trend charts, RUL projection curves |
| **Backend** | Python 3.11 | Core application language |
| **Backend** | Flask 3.0 | REST API framework |
| **Backend** | Flask-SocketIO | WebSocket server — real-time bidirectional streaming |
| **Backend** | eventlet | Async worker for Flask background threads |
| **ML** | scikit-learn | Random Forest Regressor for RUL prediction |
| **ML** | NumPy / Pandas | Feature engineering, rolling-window statistics |
| **Database** | PostgreSQL 16 | Production-grade time-series storage (3 tables) |
| **Communication** | Socket.IO 4.7 | Persistent WebSocket with HTTP long-polling fallback |

---

## 📡 NASA C-MAPSS Dataset

AeroTwin uses the **NASA C-MAPSS Turbofan Engine Degradation Simulation Dataset** — the global standard benchmark for aircraft engine predictive maintenance research.

### Download Links

| Source | URL | Notes |
|---|---|---|
| **NASA S3 (Primary)** | `https://phm-datasets.s3.amazonaws.com/NASA/6.+Turbofan+Engine+Degradation+Simulation+Data+Set.zip` | Official NASA direct download |
| **NASA C-MAPSS 2 (Enhanced)** | `https://phm-datasets.s3.amazonaws.com/NASA/17.+Turbofan+Engine+Degradation+Simulation+Data+Set+2.zip` | 5.3M samples, real flight conditions |
| **Kaggle Mirror** | `https://www.kaggle.com/datasets/behrad3d/nasa-cmaps` | Easiest download, same data |
| **NASA Data Portal** | `https://data.nasa.gov/dataset/cmapss-jet-engine-simulated-data` | Official portal |

Or use our one-command download script after cloning:

```bash
python data/download_dataset.py
```

### Dataset Contents

| Sub-Dataset | Train Engines | Test Engines | Fault Modes | AeroTwin Usage |
|---|---|---|---|---|
| FD001 | 100 | 100 | 1 (HPC) | Reference only |
| FD002 | 260 | 259 | 1 (HPC) | Reference only |
| **FD003** ✅ | **100** | **100** | **2 (HPC + Fan)** | **Primary — MODE A** |
| **FD004** ✅ | **248** | **249** | **2 (HPC + Fan)** | **Primary — MODE A** |

Each row contains: `engine_id`, `cycle`, `3 operational settings`, `21 sensor readings`

AeroTwin uses **14 of the 21 sensors** (dropping 7 near-zero-variance channels) mapped to 3 monitored components.

---

## 📁 Project Structure

```
AeroTwin/
│
├── backend/                        # Flask backend (Python)
│   ├── app.py                      # Flask entry point, SocketIO init, startup
│   ├── simulator.py                # MODE B: Physics-informed synthetic generator
│   ├── csv_reader.py               # MODE A: C-MAPSS CSV row-by-row replay
│   ├── component_mapper.py         # Maps C-MAPSS sensors → 3 AeroTwin components
│   ├── fatigue_engine.py           # Multi-factor fatigue accumulation algorithm
│   ├── feature_engineer.py         # 12 ML feature computation from rolling window
│   ├── ml_model.py                 # Random Forest inference wrapper
│   ├── alert_engine.py             # RUL threshold + z-score anomaly detection
│   ├── socketio_server.py          # Socket.IO event definitions and handlers
│   ├── routes.py                   # REST API endpoint definitions
│   ├── db.py                       # PostgreSQL connection, table init
│   └── db_writer.py                # All INSERT operations to 3 DB tables
│
├── ml/                             # ML training scripts (run once offline)
│   ├── preprocess_cmapss.py        # Clean raw C-MAPSS .txt → cleaned CSV
│   ├── generate_synthetic.py       # Generate 10,000 synthetic trajectories
│   ├── train_model.py              # Train Random Forest, evaluate, save .pkl
│   ├── feature_engineer.py         # Feature engineering (shared with backend/)
│   └── aerotwin_model.pkl          # Trained model binary (committed to repo)
│
├── data/                           # Dataset files (NOT committed — downloaded locally)
│   ├── download_dataset.py         # One-command NASA C-MAPSS downloader
│   ├── cleaned_cmapss_fd003.csv    # Preprocessed FD003 (generated by preprocess)
│   └── cleaned_cmapss_fd004.csv    # Preprocessed FD004
│
├── frontend/                       # React frontend
│   └── src/
│       └── components/
│           ├── Dashboard.jsx       # Root component, Socket.IO state, mode toggle
│           ├── EngineModel.jsx     # Three.js 3D engine visualization
│           ├── HealthChart.jsx     # Recharts live trend graphs
│           ├── AlertPanel.jsx      # Alert sidebar with severity animations
│           ├── RULPanel.jsx        # Predicted RUL + confidence display
│           ├── HistoryModal.jsx    # Historical sensor log modal
│           └── ModeToggle.jsx      # CSV / Live mode radio button
│
├── .env.example                    # Environment variable template
├── .gitignore                      # Python + Node + env ignores
├── requirements.txt                # Python dependencies
├── docker-compose.yml              # Flask + PostgreSQL in Docker
└── README.md                       # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16 (or use Docker — see below)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Tiwari1782/AeroTwin.git
cd AeroTwin
```

### 2. Download the NASA C-MAPSS Dataset

```bash
cd data
python download_dataset.py
cd ..
```

This downloads and extracts the NASA C-MAPSS ZIP automatically. Files are placed in `data/` and are **not committed to Git** (listed in `.gitignore`).

### 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r ../requirements.txt

# Copy environment template and fill in your PostgreSQL credentials
cp ../.env.example ../.env
# Edit .env with your DATABASE_URL
```

### 4. Database Setup

**Option A — Local PostgreSQL:**
```bash
psql -U postgres -c "CREATE DATABASE aerotwin_db;"
psql -U postgres -c "CREATE USER aerotwin_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE aerotwin_db TO aerotwin_user;"
```

**Option B — Docker (recommended for consistent team setup):**
```bash
cd ..   # back to project root
docker-compose up -d postgres
```

Tables are auto-created when Flask starts — no migration step needed.

### 5. Train the ML Model

```bash
cd ml

# Step 1: Preprocess the C-MAPSS dataset
python preprocess_cmapss.py

# Step 2: Generate supplementary synthetic training data
python generate_synthetic.py

# Step 3: Train and save the Random Forest model
python train_model.py

# aerotwin_model.pkl is saved to ml/ and committed to the repo
# Teammates who pull the repo already have the trained model
```

### 6. Start the Backend

```bash
cd backend
python app.py
```

Backend starts on `http://localhost:5000`. You should see:
```
✅ PostgreSQL connected
✅ ML model loaded (aerotwin_model.pkl)
✅ Simulation engine ready
🚀 AeroTwin backend running on http://localhost:5000
```

### 7. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:3000`. Open in your browser.

### 8. Switch Data Modes

In the dashboard, use the toggle at the top:
- **⬤ CSV Replay** — streams NASA C-MAPSS data
- **⬤ Live Simulation** — generates synthetic data in real time

Or via API: `POST /api/mode` with `{ "mode": "csv" }` or `{ "mode": "live" }`

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# PostgreSQL connection
DATABASE_URL=postgresql://aerotwin_user:yourpassword@localhost:5432/aerotwin_db

# Flask config
FLASK_ENV=development
FLASK_SECRET_KEY=your-secret-key-here

# Simulation settings
SIMULATION_SPEED_SECONDS=2        # How often a new reading is generated (seconds)
SIMULATION_MAX_HOURS=1000         # Maximum simulated flight hours before auto-reset
DEFAULT_MODE=live                  # Starting mode: 'csv' or 'live'

# C-MAPSS dataset path (relative to project root)
CMAPSS_CSV_PATH=data/cleaned_cmapss_fd003.csv

# ML model path
MODEL_PATH=ml/aerotwin_model.pkl
```

> ⚠️ **Never commit `.env` to Git.** It is in `.gitignore` by default.

---

## 📡 API Reference

All REST endpoints are served on `http://localhost:5000`:

| Method | Endpoint | Parameters | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Current health_score, fatigue, RUL, severity per component |
| `GET` | `/api/history` | `component` (str), `hours` (int) | Sensor reading history from PostgreSQL |
| `GET` | `/api/rul` | None | ML model RUL prediction + confidence interval per component |
| `GET` | `/api/alerts` | `limit` (int, default 50) | Maintenance log — most recent alerts first |
| `GET` | `/api/components` | None | List of monitored component IDs and display names |
| `POST` | `/api/anomaly` | `{ "type": "vibration" \| "thermal" \| "rpm" }` | Inject fault into simulator (MODE B only) |
| `POST` | `/api/reset` | None | Reset simulation to baseline health=100% |
| `POST` | `/api/mode` | `{ "mode": "csv" \| "live" }` | Switch data source mode live |

### Example Response — `GET /api/health`

```json
{
  "components": {
    "turbine_blade": {
      "health_score": 74.3,
      "fatigue_score": 25.7,
      "predicted_rul": 340.5,
      "confidence": 0.89,
      "severity": "AMBER",
      "last_reading": {
        "temperature": 587.4,
        "vibration": 2.83,
        "rpm": 9421.7,
        "flight_hour": 187
      }
    },
    "bearing": { "..." : "..." },
    "compressor": { "..." : "..." }
  },
  "session_id": "uuid-here",
  "mode": "live",
  "flight_hour": 187,
  "timestamp": "2025-07-05T10:32:11Z"
}
```

---

## 📡 WebSocket Events

Connect to the Socket.IO server at `http://localhost:5000`:

```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");
```

### Server → Client (emitted every tick)

| Event | Payload | Description |
|---|---|---|
| `sensor_update` | `{ component_id, flight_hour, temperature, vibration, rpm, timestamp }` | Raw sensor reading for historical log |
| `health_update` | `{ component_id, health_score, fatigue_score, predicted_rul, confidence, severity }` | Processed health state — drives dashboard visuals |
| `alert_update` | `{ component_id, severity, recommended_action, predicted_rul, anomaly_flag, timestamp }` | New alert (only emitted when threshold crossed) |

### Client → Server (send to control simulation)

| Event | Payload | Description |
|---|---|---|
| `inject_anomaly` | `{ type: "vibration" \| "thermal" \| "rpm" }` | Inject fault spike into MODE B simulator |
| `advance_time` | `{ hours: integer }` | Fast-forward simulation by N flight hours |
| `reset` | `{}` | Reset all components to baseline health |
| `set_mode` | `{ mode: "csv" \| "live" }` | Switch data source live |

---

## 🗄 Database Schema

PostgreSQL database: `aerotwin_db`

### `sensor_readings`
Stores every raw sensor reading. One row per component per tick.

```sql
CREATE TABLE sensor_readings (
    id              BIGSERIAL PRIMARY KEY,
    session_id      UUID NOT NULL,
    mode            VARCHAR(10) NOT NULL CHECK (mode IN ('csv', 'live')),
    component_id    VARCHAR(30) NOT NULL,
    flight_hour     INTEGER NOT NULL,
    temperature     NUMERIC(8,3) NOT NULL,
    vibration       NUMERIC(8,4) NOT NULL,
    rpm             NUMERIC(10,2) NOT NULL,
    cmapss_engine_id INTEGER,           -- MODE A only
    cmapss_cycle    INTEGER,            -- MODE A only
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sensor_component_session
    ON sensor_readings(component_id, session_id, flight_hour);
```

### `health_snapshots`
Stores processed health score and RUL prediction per component per tick.

```sql
CREATE TABLE health_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    session_id      UUID NOT NULL,
    component_id    VARCHAR(30) NOT NULL,
    flight_hour     INTEGER NOT NULL,
    fatigue_score   NUMERIC(6,3) NOT NULL CHECK (fatigue_score BETWEEN 0 AND 100),
    health_score    NUMERIC(6,3) NOT NULL CHECK (health_score BETWEEN 0 AND 100),
    predicted_rul   NUMERIC(8,2) NOT NULL,
    confidence      NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('GREEN','AMBER','RED','CRITICAL')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `maintenance_log`
Tamper-evident audit trail of all alerts generated.

```sql
CREATE TABLE maintenance_log (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              UUID NOT NULL,
    component_id            VARCHAR(30) NOT NULL,
    severity                VARCHAR(10) NOT NULL,
    recommended_action      TEXT NOT NULL,
    predicted_rul_at_alert  NUMERIC(8,2) NOT NULL,
    anomaly_flag            BOOLEAN DEFAULT FALSE,
    z_score_at_alert        NUMERIC(6,3),
    mode                    VARCHAR(10) NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🤖 ML Pipeline

### Model: Random Forest Regressor

```python
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(
    n_estimators=100,
    max_depth=12,
    min_samples_split=5,
    random_state=42
)
```

### 12 Engineered Features

| # | Feature | Description |
|---|---|---|
| F1 | `rolling_mean_vibration_10` | Mean vibration, last 10 ticks |
| F2 | `rolling_std_vibration_10` | Vibration instability |
| F3 | `vibration_slope_20` | Rate of vibration increase |
| F4 | `rolling_mean_temp_10` | Mean temperature, last 10 ticks |
| F5 | `temp_rise_rate` | °C gained per flight hour |
| F6 | `rolling_std_temp_10` | Thermal instability |
| F7 | `rpm_drift` | Deviation from baseline RPM |
| F8 | `vib_temp_correlation` | Mechanical-thermal coupling indicator |
| F9 | `cumulative_fatigue` | Physics-based fatigue score |
| F10 | `health_score` | Current health percentage |
| F11 | `flight_hour_normalised` | Time elapsed (0–1) |
| F12 | `max_z_score_10` | Max anomaly z-score, last 10 ticks |

### Training Data

- **70%** from NASA C-MAPSS FD003 + FD004 (real research benchmark)
- **30%** from synthetically generated degradation trajectories

### Validation Metrics (on held-out 20%)

| Metric | Value |
|---|---|
| Mean Absolute Error (MAE) | ~12–18 flight hours |
| Root Mean Squared Error (RMSE) | ~22–30 flight hours |
| R² | ~0.91–0.94 |

### Fatigue Formula

```
fatigue_delta = (T_factor^1.4 × V_factor^1.8 × RPM_factor^1.2) × component_sensitivity

Where:
  T_factor   = current_temperature / baseline_temperature
  V_factor   = current_vibration / baseline_vibration
  RPM_factor = current_rpm / rated_rpm

  component_sensitivity:
    Turbine Blade = 1.4   (highest thermal stress)
    Bearing       = 1.1   (vibration-dominant wear)
    Compressor    = 0.9   (pressure-cycle fatigue)

health_score = max(0, 100 − cumulative_fatigue)
```

### Alert Thresholds

| RUL Range | Severity | Recommended Action |
|---|---|---|
| RUL > 500 hrs | 🟢 **GREEN** | No action required |
| 100 < RUL ≤ 500 hrs | 🟡 **AMBER** | Schedule inspection within 2 weeks |
| 50 < RUL ≤ 100 hrs | 🔴 **RED** | Priority inspection — within 48 hours |
| RUL ≤ 50 hrs | 🚨 **CRITICAL** | Ground aircraft. Immediate inspection |
| Z-score > 3.5 | 🚨 **ANOMALY** | Sudden fault — override all schedules |

---

## 👥 Team

<div align="center">

| | Name | Role | Responsibilities |
|---|---|---|---|
| 🧑‍💻 | **Prakash Tiwari** | Team Lead · Backend · Architecture | `app.py`, `socketio_server.py`, `fatigue_engine.py`, `alert_engine.py`, `routes.py`, GitHub management |
| 👩‍💻 | **Harnoor Kaur** | Frontend · UI/UX · Demo | `Dashboard.jsx`, `EngineModel.jsx`, `HealthChart.jsx`, `AlertPanel.jsx`, `ModeToggle.jsx`, demo presentation |
| 🧑‍💻 | **Prince Sagwal** | Simulation Engine · Database | `simulator.py`, `csv_reader.py`, `component_mapper.py`, `db.py`, `db_writer.py`, dataset pipeline |
| 👩‍💻 | **Piyush Kumar** | ML Pipeline · Documentation | `train_model.py`, `feature_engineer.py`, `preprocess_cmapss.py`, `aerotwin_model.pkl`, `README.md` |

</div>

---

## 📊 Why Not a Real IoT Sensor?

A question worth addressing directly: **AeroTwin uses a simulation engine + NASA dataset instead of physical sensors — is that valid?**

Yes — and here's why:

1. **NASA uses the same approach.** The C-MAPSS dataset itself is synthetic — generated by a software simulator of a turbofan engine, not by sensors on a real engine. This is the standard NASA research methodology.

2. **Industry follows this pattern.** Rolls-Royce, Boeing, and Airbus all validate their Digital Twin systems in **Software-in-the-Loop (SiL) simulation** before connecting physical sensors. AeroTwin is at exactly this phase.

3. **The architecture is hardware-ready.** Replacing the simulation engine with a real IoT sensor feed requires changing **only `simulator.py`** — every layer above it (fatigue engine, ML model, WebSocket, dashboard) remains identical.

4. **Real failure data doesn't exist.** Aviation safety systems are designed to prevent engine failures in flight — meaning catastrophic run-to-failure data is vanishingly rare. Simulation is the only practical path to training a robust RUL model.

> **Future roadmap:**  
> Stage 2 — Arduino + MPU-6050 vibration sensor + DHT11 temperature sensor (real physical IoT, ~₹500)  
> Stage 3 — NVIDIA Jetson Nano with industrial MEMS sensors (true edge AI hardware deployment)

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by Team FELONS**

*Tata Technologies InnoVent-27 · AI at the Edge · Aerospace Track*

<img src="https://capsule-render.vercel.app/api?type=waving&color=0D1B3E&height=100&section=footer&fontColor=00A8E8" width="100%"/>

</div>
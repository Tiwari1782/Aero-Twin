# 📊 AeroTwin Dataset Guide
### *"What is this data? Where does it come from? What does s1, s2, s3 even mean?"*

> This guide explains the NASA C-MAPSS dataset in plain English — no aerospace engineering degree required.  
> If you've never seen a jet engine in your life, start here.

---

## ✈️ First Things First — What Are We Even Monitoring?

AeroTwin monitors the health of a **commercial turbofan engine** — the kind strapped under the wings of a Boeing 737 or Airbus A320.

A turbofan engine works like this (very simply):

```
Air comes in → Gets compressed → Fuel burns → Hot gas spins turbines → Thrust pushes aircraft forward
```

Three parts of this engine degrade over time and can fail:

| Component | What it does | Why it degrades |
|---|---|---|
| **Turbine Blade** | Spins inside extremely hot exhaust gas | Heat stress, thermal fatigue |
| **Compressor (HPC)** | Squeezes incoming air before burning | Blade fouling, pressure wear |
| **Bearing** | Keeps rotating shafts spinning smoothly | Vibration, friction wear |

Our job: **predict when these parts are going to fail**, before they actually do.

---

## 🛰️ What is the NASA C-MAPSS Dataset?

**C-MAPSS** stands for **Commercial Modular Aero-Propulsion System Simulation**.

NASA built a software simulator that mimics a real turbofan engine and ran it thousands of times — from a brand new engine all the way until it broke down. Each run is one "engine" in our dataset.

> **Important:** This data is NOT from actual physical sensors on a real aircraft.  
> NASA generated it using a simulation model — and that's completely normal and accepted in aerospace research.  
> Even Boeing and Rolls-Royce develop Digital Twins this way first.

The dataset has been used in **1,000+ research papers** worldwide and is the global standard for engine health prediction.

---

## 📁 What Files Are in This Dataset?

The dataset has **4 sub-datasets**, named FD001 through FD004.  
Each one has a `train` file and a `test` file.

```
train_FD001.csv   ← Training data for sub-dataset 1
test_FD001.csv    ← Test data for sub-dataset 1
train_FD002.csv
test_FD002.csv
train_FD003.csv   ← ✅ AeroTwin uses this (Primary)
test_FD003.csv    ← ✅ AeroTwin uses this (Primary)
train_FD004.csv
test_FD004.csv
```

### What's the difference between FD001, FD002, FD003, FD004?

| Sub-Dataset | No. of Engines | What Fault Happens | Used in AeroTwin? |
|---|---|---|---|
| FD001 | 100 engines | Only HPC (Compressor) degrades | Reference only |
| FD002 | 260 engines | Only HPC (Compressor) degrades | Reference only |
| **FD003** | **100 engines** | **HPC + Fan both degrade** | ✅ **Yes — Primary** |
| **FD004** | **248 engines** | **HPC + Fan both degrade** | ✅ **Yes — Primary** |

**Why does AeroTwin use FD003 and FD004?**  
Because they have **two simultaneous fault modes** (compressor AND fan degradation), which is more realistic and gives us richer data to train our ML model on.

### What's the difference between Train and Test files?

| File Type | What it contains | Why |
|---|---|---|
| **Train** (`train_FD001.csv`) | Full engine lifecycle — from cycle 1 to the final failure cycle | Used to train the ML model. RUL starts at max and counts down to 0. |
| **Test** (`test_FD001.csv`) | Partial engine lifecycle — stops somewhere before failure | Used to test: can our model predict the remaining life from an incomplete run? |

---

## 🔍 Understanding the Columns

Open any CSV file and you'll see these columns:

```
engine_id, cycle, op_setting_1, op_setting_2, op_setting_3,
s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12,
s13, s14, s15, s16, s17, s18, s19, s20, s21,
RUL
```

Let's break each one down.

---

### 🔢 `engine_id` — Which Engine is This?

Each engine in the dataset gets a unique number.  
Think of it like a car's VIN number — just identifies which unit we're tracking.

- In FD001: engines 1 through 100
- In FD003: engines 1 through 100

Every engine starts fresh at cycle 1 and runs until it fails. Different engines fail at different times.

---

### 🔄 `cycle` — Flight Cycle Number

One **cycle** = one complete flight (takeoff → cruise → landing).

- Cycle 1 = the very first flight of this engine (brand new)
- Cycle 150 = the 150th flight
- The last cycle in the training data = the flight where the engine failed

**Example:** If an engine's last row is cycle 191, that engine lasted 191 flights before breaking down.

---

### ⚙️ `op_setting_1`, `op_setting_2`, `op_setting_3` — Operating Conditions

These describe the **flight conditions** under which the engine ran during that cycle.

Think of it like: was this a short domestic hop or a long international flight? Hot climate or cold? High altitude or low?

| Column | What it represents | Typical Range |
|---|---|---|
| `op_setting_1` | Altitude / throttle condition | Around 0 (near-zero values) |
| `op_setting_2` | Mach number (flight speed) | Around 0 (near-zero values) |
| `op_setting_3` | Throttle resolver angle (power setting) | 100.0 (always max in FD001/FD003) |

> **For FD001 and FD003:** The engine always runs at the same operating condition (op_setting_3 = 100.0). So these columns don't vary much and you can mostly ignore them.  
> **For FD002 and FD004:** Six different flight conditions are mixed in — making prediction much harder.

---

## 🌡️ The 21 Sensor Readings (s1 through s21)

This is the core of the dataset. Each `s` column is a **sensor** measuring something physical inside the engine, sampled once per flight cycle.

Here's what every sensor actually means:

| Sensor | What it Measures | Unit | Where in the Engine |
|---|---|---|---|
| `s1` | Total temperature at fan inlet | °R (Rankine) | Front of engine — incoming air |
| `s2` | Total temperature at compressor inlet (LPC out) | °R | After low-pressure compressor |
| `s3` | Total temperature at HPC outlet | °R | After high-pressure compressor |
| `s4` | Total temperature at LPT outlet | °R | After low-pressure turbine |
| `s5` | Pressure at fan inlet | psia | Front of engine |
| `s6` | Total pressure at bypass duct | psia | Fan bypass stream |
| `s7` | Total pressure at HPC outlet | psia | After high-pressure compressor |
| `s8` | Physical fan speed | rpm | Fan at the front |
| `s9` | Physical core speed | rpm | Core shaft (compressor + turbine) |
| `s10` | Engine pressure ratio (EPR) | ratio | Overall engine pressure |
| `s11` | Static pressure at HPC outlet | psia | After high-pressure compressor |
| `s12` | Ratio of fuel flow to pressure | pps/psi | Fuel system |
| `s13` | Corrected fan speed | rpm (corrected) | Fan speed adjusted for temperature |
| `s14` | Corrected core speed | rpm (corrected) | Core speed adjusted for temperature |
| `s15` | Bypass ratio | ratio | How much air bypasses the core |
| `s16` | Burner fuel-air ratio | ratio | Combustion chamber |
| `s17` | Bleed enthalpy (extracted air) | — | Air bled off for cooling |
| `s18` | Demanded fan speed | rpm | What the fan *should* be doing |
| `s19` | Demanded corrected fan speed | rpm (corrected) | Target corrected fan speed |
| `s20` | HP Turbine coolant bleed | — | Cooling air to turbine blades |
| `s21` | LP Turbine coolant bleed | — | Cooling air to low-pressure turbine |

> **°R (Rankine)** is like Fahrenheit but starting from absolute zero. 518°R ≈ 58°F ≈ 14°C — roughly room temperature.  
> **psia** = pounds per square inch (absolute) — a pressure unit.

---

### 🚫 Which Sensors Are Useless?

Not all 21 sensors tell us something useful. Some barely change across the entire dataset (near-zero variance), which means they carry no information about degradation.

AeroTwin **drops these sensors** during preprocessing:

| Dropped Sensor | Why It's Dropped |
|---|---|
| `s1` | Nearly constant — no degradation signal |
| `s5` | Nearly constant — no degradation signal |
| `s6` | Nearly constant — no degradation signal |
| `s10` | Nearly constant — no degradation signal |
| `s16` | Nearly constant — no degradation signal |
| `s18` | Nearly constant — no degradation signal |
| `s19` | Nearly constant — no degradation signal |

---

### ✅ Which Sensors Actually Matter?

These 14 sensors show meaningful change as the engine degrades — and AeroTwin maps them to our 3 monitored components:

```
TURBINE BLADE HEALTH  ←  s3 (HPC temperature) + s4 (turbine exit temp) + s20 (turbine coolant bleed)
COMPRESSOR HEALTH     ←  s2 (compressor inlet temp) + s7 (HPC outlet pressure) + s11 (static pressure) + s17 (bleed enthalpy)
BEARING HEALTH        ←  s8 (fan speed) + s9 (core speed) + s13 (corrected fan speed) + s14 (corrected core speed)

Also used for context:  s12, s15, s21
```

**Why these groupings?**

- **Turbine Blade** — High temperatures and cooling air directly stress turbine blades. When `s3` or `s4` trends upward over time while `s20` changes, it signals blade degradation.
- **Compressor (HPC)** — The compressor's job is to build pressure. When pressure at the outlet (`s7`, `s11`) starts dropping for the same RPM, the compressor is fouling or wearing.
- **Bearing** — Bearings keep the shafts spinning at the right speed. When actual speed (`s8`, `s9`) drifts away from expected/corrected speed (`s13`, `s14`), it signals bearing wear.

---

### 🏁 `RUL` — Remaining Useful Life

**This is what we're trying to predict.**

RUL = **how many flight cycles does this engine have left before it fails?**

- RUL of 191 = engine will last 191 more flights
- RUL of 10 = engine is about to fail — ground it now
- RUL of 0 = engine has failed

In the **training data**, RUL is given to us (so the model can learn from it).  
In the **test data**, RUL is hidden — our model must predict it.

**How is RUL calculated in the training set?**

```
RUL = (total cycles this engine lasted) - (current cycle number)

Example: Engine ran for 191 cycles total.
  At cycle 1   → RUL = 191 - 1 = 190
  At cycle 100 → RUL = 191 - 100 = 91
  At cycle 191 → RUL = 0  (engine failed)
```

---

## 📐 Dataset Size at a Glance

| File | Engines | Total Rows | Max RUL | Notes |
|---|---|---|---|---|
| `train_FD001.csv` | 100 | 20,631 | 361 cycles | Single fault mode (HPC only) |
| `train_FD002.csv` | 260 | 53,759 | 377 cycles | Single fault mode, 6 operating conditions |
| `train_FD003.csv` | 100 | 24,720 | 524 cycles | ✅ Dual fault mode — AeroTwin primary |
| `train_FD004.csv` | 248 | ~61,000 | ~543 cycles | ✅ Dual fault mode, 6 operating conditions |

Each row = 1 flight cycle for 1 engine = 1 snapshot of all 21 sensor readings.

---

## 🧠 How AeroTwin Uses This Data

Here's the full journey from raw CSV to the health dashboard:

```
raw CSV row (1 flight cycle)
        │
        ▼
  component_mapper.py
  Maps s3,s4,s20 → Turbine | s2,s7,s11,s17 → Compressor | s8,s9,s13,s14 → Bearing
        │
        ▼
  fatigue_engine.py
  Applies physics formula:  fatigue = (T_factor^1.4) × (V_factor^1.8) × (RPM_factor^1.2)
  Updates: health_score = 100 - cumulative_fatigue
        │
        ▼
  feature_engineer.py
  Creates 12 ML features from last 10 readings:
  rolling averages, standard deviations, slopes, z-scores
        │
        ▼
  ml_model.py  (Random Forest — 100 trees)
  Predicts: how many flight cycles until failure?  →  predicted_RUL
        │
        ▼
  alert_engine.py
  🟢 health > 70%  →  GREEN (Normal)
  🟡 health 40–70% →  AMBER (Schedule inspection)
  🔴 health 20–40% →  RED (Inspect within 48 hrs)
  🚨 health < 20%  →  CRITICAL (Ground the aircraft)
        │
        ▼
  Dashboard (React + Three.js)
  3D engine lights up with component colors — updated every 2 seconds
```

---

## 🔬 What Does a Degrading Engine Look Like in This Data?

As an engine approaches failure, here's what you'd see in the sensor readings:

| Sensor | Early Life (Cycle 1) | Late Life (Last Cycle) | Why |
|---|---|---|---|
| `s3` (HPC temp) | ~1583°R | ~1615°R | Engine running hotter as it degrades |
| `s4` (Turbine exit temp) | ~1400°R | ~1445°R | Less efficient = more heat escapes |
| `s7` (HPC pressure) | ~14.62 psia | ~14.10 psia | Compressor losing pressure efficiency |
| `s9` (Core speed) | ~9046 rpm | ~9070 rpm | Core working harder to compensate |
| `s11` (Static pressure) | ~47.47 | ~46.10 | Pressure loss signature of HPC wear |

The changes are subtle — just a few percent over hundreds of cycles. That's exactly why we need ML: the human eye can't reliably spot the trend in time.

---

## 💡 Common Questions

**Q: Why are sensor values so large? (e.g., s1 = 518.67)**  
A: Temperature values are in Rankine (°R), not Celsius. 518°R ≈ 14°C ≈ 57°F — just ambient air temperature. Turbine exit temperatures hit ~1400°R ≈ 778°C, which is realistic for turbine sections.

**Q: Why do some sensors barely change between cycles?**  
A: In FD001/FD003, the engine always runs at the same throttle setting (single operating condition). Sensors that only change with operating condition will appear constant. That's why we drop s1, s5, s6, etc.

**Q: Is this real flight data from an actual airline?**  
A: No. C-MAPSS is a physics-based software simulation created by NASA. No real aircraft sensors were used. But the physics are calibrated to real turbofan behavior, and it's the accepted standard for research.

**Q: What does "run-to-failure" mean?**  
A: Every engine in the training dataset was simulated all the way from brand new until it completely failed. This is rare in real aviation (failures are prevented), which is why simulation is necessary.

**Q: Why is FD003 better than FD001 for AeroTwin?**  
A: FD003 has two simultaneous fault modes (HPC + Fan), meaning both the compressor and fan degrade together — which is more realistic and gives our three-component model (Turbine, Compressor, Bearing) more meaningful training signals.

---

## 📚 Citation

> Saxena, A., Goebel, K., Simon, D., & Eklund, N. (2008).  
> *Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation.*  
> International Conference on Prognostics and Health Management (PHM).  
> NASA Ames Research Center.

Dataset available at: [data.nasa.gov](https://data.nasa.gov/dataset/cmapss-jet-engine-simulated-data)

---

*AeroTwin · Team FELONS · Tata Technologies InnoVent-27*
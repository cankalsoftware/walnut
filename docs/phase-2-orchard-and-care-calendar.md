# Phase 2: Orchard Care Calendar, Daily/Weekly Popups, Countdowns & Tuya Sensors

> **Status**: Active Blueprint  
> **Goal**: Deliver year-round walnut care scheduling (Pruning, Watering, Feeding, Harvesting, Winter Care), **Daily & Weekly Guidance Popups with Cycle Countdowns**, automated push notifications, and **Tuya Smart Sensor** front-display & settings integration.

---

## 1. Daily & Weekly Care Guidance Popups + Cycle Countdowns

To keep growers proactive throughout the season without overwhelming them, **WalnutIQ** implements a structured **Care Cycle & Countdown Engine**:

### 1.1 Live Care Cycles & Countdown Timers
Displayed on the Orchard Dashboard and Care Calendar:
- **💧 Watering Cycle Countdown**:
  - Tracks days/hours until the next deep-root irrigation cycle (e.g., `Every 7 days in July • Next soak in 2d 14h`).
  - Adjusts automatically if a Tuya soil moisture sensor reports `> 75%` moisture or rainfall.
- **🧪 Feeding & Foliar Spray Cycle Countdown**:
  - Tracks multi-stage nutrition windows:
    1. *Cycle 1 (Mar/Apr)*: Budbreak Nitrogen (40%) + Chelated Zinc spray countdown.
    2. *Cycle 2 (Apr/May)*: Pistillate bloom Boron pollination boost countdown.
    3. *Cycle 3 (June — Cutoff July 1)*: Kernel-fill Nitrogen (60%) + Potassium countdown.
    4. *Cycle 4 (Oct/Nov)*: Post-harvest Potassium & organic mulch replenishment.
- **❄️ Winter Chill & Pruning Countdown**:
  - Tracks cumulative chill hours (`0°C – 7.2°C`) toward variety target (`700–1,000 hrs`) and counts down to the January–February dormant pruning window.

### 1.2 Automated Daily & Weekly In-App Guidance Popups
- **Daily Orchard Briefing Popup (Morning Check-in)**:
  - Summarizes today's micro-climate (temp, moisture, sun), active countdowns, and a 30-second seasonal care tip (e.g., *"Avoid pruning today — high humidity increases bacterial canker risk"*).
- **Weekly Care & Countdown Digest Popup (Sunday/Monday Planning)**:
  - Summarizes upcoming watering/feeding cycles for the week ahead, recent YOLO nut growth delta (`+2.4 mm this week`), and unread highlights from the Grower Community chat.

---

## 2. Tuya Smart Orchard Sensor Plugin Architecture

We reserve dedicated UI slots on both the **Front Orchard Display (`index.tsx`)** and the **Settings & Sensor Hub (`analytics.tsx`)** for **Tuya Smart Sensors** (Zigbee / Wi-Fi / BLE gateways):

| Sensor Metric | Front Display Widget | Tuya Device Category | Agronomic Impact in WalnutIQ |
| :--- | :--- | :--- | :--- |
| **Soil Moisture (`%`)** | `68% Optimal (30cm depth)` | Tuya Smart Soil Moisture Probe | Pauses or triggers deep-watering countdowns |
| **Air & Soil Temp (`°C`)** | `14.2°C Air • 11.8°C Soil` | Tuya Temp & Humidity Sensor | Automatically logs Winter Chill Hours (`<7.2°C`) & Frost Alerts (`<1°C`) |
| **Sunlight & UV (`klux`)** | `48.5 klux • UV Index 6` | Tuya Light / Lux & UV Sensor | Warns of walnut husk sunburn risk when `Temp > 37°C` + high UV |
| **Weather & Humidity (`% RH`)** | `62% RH • Barometer Stable` | Tuya Mini Weather Station | Evaluates Walnut Blight infection risk during wet spring bloom |

### Tuya Integration Roadmap
- **UI Ready Now**: Sensor telemetry strip on the main Orchard dashboard + a **"Tuya Smart Sensors & Weather Plugin"** configuration panel in Settings/Analytics where users can toggle display widgets, set alert thresholds, and connect their Tuya account/devices.
- **API / SDK Hook (Future Phase)**: Connects via Tuya OpenAPI / Tuya Smart Home SDK or local MQTT bridge to stream real-time readings into local SQLite and Convex.

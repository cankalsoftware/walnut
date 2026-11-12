# WalnutIQ: Tree Care & AI Count — Master Project Plan

> **Official App Name**: **WalnutIQ: Tree Care & AI Count**  
> **Google Play Subtitle**: **Walnut Tree Care & AI Counter**  
> **Target Platforms**: Android (Google Play Store via Expo / EAS) + Companion Web App Portal  
> **Core Stack**: Expo (React Native + TypeScript + Expo Router), On-Device YOLO (`yolov8` / `yolo11` / `yolo26`), Hybrid Local-First Cache (with **14-day post-sync auto-purge**) + Convex Real-Time DB + Clerk Auth (Google & Email) + Tuya Smart Sensor Plugin Ready

---

## 1. Executive Summary

**WalnutIQ: Tree Care & AI Count** is an all-in-one smart walnut orchard and tree care application built with a sunlight-friendly **Light Walnut Green** design system. It delivers:

1. **Year-Round Walnut Care, Cycles & Countdowns**:
   - Covers **Pruning, Watering, Feeding/Fertilization, Pest/Blight Prevention, Harvesting, and Winter Care**.
   - **Daily & Weekly Guidance Popups** with live countdown timers and cycle trackers (watering intervals, NPK/Zinc/Boron feed windows, winter chill hours, and harvest hull-split readiness).
2. **Dual-Mode On-Device YOLO Computer Vision (`yolo/` & `weights/`)**:
   - **Mode 1 — In-Tree Canopy Counter**: Counts walnuts in the tree canopy across 4 quadrants and estimates total tree yield (nut count & kg).
   - **Mode 2 — Ground Harvest Finder**: Highlights fallen walnuts on the ground after shaking/harvesting using high-visibility neon AR bounding boxes to speed up picking.
   - **Mode 3 — Visual Growth & Health Analytics**: Tracks nut diameter progression (`mm`) and flags husk/leaf anomalies.
3. **Tuya Smart Orchard Sensor Integration (Front Display & Settings)**:
   - Displays live/plugin telemetry slots on the front Orchard screen and Settings menu for **Weather, Soil Moisture, Air/Soil Temperature, Sunlight/UV (Lux), and Humidity/Frost Watch** via Tuya sensor plugins.
4. **Grower Community & In-App Messaging**:
   - Real-time channels and 1-on-1 chat where growers share interactive **Tree Scan & Care Cards**.
5. **Hybrid Offline-First + Convex + Clerk Architecture (14-Day Local Purge)**:
   - Works **100% offline in the orchard** when cell signal is unavailable.
   - Automatically syncs to **Convex** & **Clerk** (Google Sign-In + Email login) as soon as the device reconnects online, enabling seamless sharing with the future **Web App**.
   - **Storage Optimization**: Once local scans and logs are confirmed synced to Convex, local raw cached records older than **14 days** are automatically purged to keep phone storage lean.

---

## 2. Documentation Index (Phase-by-Phase Blueprints)

All engineering, Google Play compliance, design, and YOLO processes are documented inside `docs/`:

1. **[00-MASTER-PLAN.md](./00-MASTER-PLAN.md)** — Master overview, locked-in decisions, and repository map.
2. **[01-UI-UX-DESIGN-SYSTEM.md](./01-UI-UX-DESIGN-SYSTEM.md)** — **Light Walnut Green** color palette, sunlight HUD tokens, Tuya sensor telemetry bar, and menu structure.
3. **[02-GOOGLE-PLAY-STORE-LISTING-AND-REQUIREMENTS.md](./02-GOOGLE-PLAY-STORE-LISTING-AND-REQUIREMENTS.md)** — Complete Google Play ASO store listing copy for **WalnutIQ: Tree Care & AI Count** (`Walnut Tree Care & AI Counter`), graphic specs, Data Safety answers, and release checklist.
4. **[phase-1-foundation-and-ui-shell.md](./phase-1-foundation-and-ui-shell.md)** — Completed workspace scaffolding, `/yolo` & `/weights` directories, theme engine, and 5-tab navigation shell.
5. **[phase-2-orchard-and-care-calendar.md](./phase-2-orchard-and-care-calendar.md)** — Annual walnut lifecycle, **Daily/Weekly Guidance Popups & Cycle Countdowns**, push notifications, and **Tuya Sensor Plugin** integration.
6. **[phase-3-yolo-vision-pipeline.md](./phase-3-yolo-vision-pipeline.md)** — Technical comparison of **YOLOv8 vs. YOLO11 vs. YOLO26** for canopy & ground walnut detection, Kaggle/Roboflow dataset guide, and `/weights` mobile inference pipeline.
7. **[phase-4-convex-clerk-and-community-chat.md](./phase-4-convex-clerk-and-community-chat.md)** — Hybrid Local SQLite + Convex + Clerk (Google & Email) sync engine, **14-day post-sync local data auto-purge**, and real-time Grower Chat.
8. **[phase-5-analytics-and-google-play-launch.md](./phase-5-analytics-and-google-play-launch.md)** — Seasonal nut sizing curves, yield calibration charts, Web App companion endpoints, and EAS production build commands.

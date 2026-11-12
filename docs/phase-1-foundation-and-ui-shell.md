# Phase 1: Foundation, Workspace Structure & UI Shell

> **Status**: Active / In Progress  
> **Goal**: Establish the project repository, `/yolo` training workspace, `/weights` model storage, Light Walnut Green design system, and the 5-tab Expo Router application shell.

---

## 1. Objectives of Phase 1

1. **Workspace Scaffolding**:
   - Create `/docs` for phase-by-phase technical blueprints.
   - Create `/yolo` with dataset YAML templates (`walnut_canopy.yaml`, `walnut_ground.yaml`), training script (`train.py`), and mobile export pipeline (`export_weights.py`).
   - Create `/weights` with `canopy/` and `ground/` subdirectories and `manifest.json` so the mobile app knows which weight file, input resolution (`640x640`), and confidence thresholds to load.
2. **Expo Application Initialization**:
   - Configure TypeScript, Expo Router (`app/`), and clean module aliases (`@/*`).
   - Configure `app.json` for Google Play Store (`package: "com.walnutiq.analysis"`, camera permissions, notification permissions, adaptive icon background in Light Walnut Green `#DCEAD5`).
3. **Light Walnut Green Design System (`src/theme/`)**:
   - Implement color tokens, spacing scale, typography presets, and sunlight-readable contrast tokens.
4. **5-Tab Navigation Shell & Initial Functional Screens**:
   - Build the complete 5-tab layout (`Orchard`, `Care Calendar`, `Vision AI`, `Grower Hub`, `Analytics`) so you can immediately navigate every screen and experience the workflows while we connect the live native bindings in subsequent phases.

---

## 2. Step-by-Step Process in Phase 1

### Step 1.1: `/yolo` & `/weights` Setup
- **`yolo/configs/walnut_canopy.yaml`**: Defines classes for in-tree detection:
  - `0: walnut_green` (intact green husk in canopy)
  - `1: walnut_hull_split` (maturing walnut with splitting green hull)
  - `2: walnut_blight_damaged` (darkened/blighted walnut for health analytics)
- **`yolo/configs/walnut_ground.yaml`**: Defines classes for post-harvest ground picking:
  - `0: walnut_in_shell` (clean brown walnut on soil/grass/leaves)
  - `1: walnut_in_hull` (fallen walnut still partially inside dark/green hull)
- **`yolo/scripts/train.py`**: Command-line script using `ultralytics` YOLO to train either `--task canopy` or `--task ground` and output best weights.
- **`yolo/scripts/export_weights.py`**: Converts trained `.pt` files into mobile-optimized `.tflite` (FP16/INT8) and `.onnx` files and automatically copies them into `weights/canopy/` or `weights/ground/` while updating `weights/manifest.json`.

### Step 1.2: Theme & Agronomic Data Engine
- **`src/theme/colors.ts`**: Central source of truth for Light Walnut Green (`#CFE3C4` / `#6B9E58`), Bark Charcoal (`#1A2616`), Walnut Shell (`#8C5A32`), and AR HUD neon colors.
- **`src/data/walnutLifecycle.ts`**: Pre-loaded agronomic database of walnut tree phenology stages, annual care tasks (Pruning, Watering, Feeding, Harvesting, Winter Care), and default sample trees/chat channels so the app feels rich and functional out of the box.

### Step 1.3: Core Screens Implementation
- **`app/(tabs)/_layout.tsx`**: Custom styled bottom tab bar with Light Walnut Green active indicators and a raised center **Vision AI** scanner button.
- **`app/(tabs)/index.tsx`**: Orchard Dashboard with Phenology Ring, Weather/Chill-Hours widget, Today's Care Queue, and Tree Cards.
- **`app/(tabs)/calendar.tsx`**: Year-Round Care Calendar filterable by Pruning, Watering, Feeding, Harvest, and Winter Care with push notification toggles.
- **`app/(tabs)/scanner.tsx`**: Dual-Mode Vision AI interface (`Canopy Counter`, `Ground Harvest Finder`, `Health & Growth`) with live bounding-box overlay simulation and `/weights/manifest.json` integration.
- **`app/(tabs)/community.tsx`**: Grower Community & Messaging hub with channels, direct messages, and interactive **Shareable Tree Scan Cards**.
- **`app/(tabs)/analytics.tsx`**: Growth Analytics, Yield Estimation calibration charts, Tree Registry, and Hybrid Local + Convex/Clerk sync status panel.

---

## 3. Deliverables Checklist for Phase 1

- [x] `docs/` directory with complete phase-by-phase plans
- [x] `yolo/` directory with configs, training script, and mobile weight exporter
- [x] `weights/` directory with `canopy/`, `ground/`, and `manifest.json`
- [x] Expo + TypeScript + Expo Router configuration (`package.json`, `app.json`, `tsconfig.json`)
- [x] `src/theme/colors.ts` (Light Walnut Green design tokens)
- [x] `src/data/walnutLifecycle.ts` (Walnut care calendar, trees, and community seed data)
- [x] All 5 interactive tab screens in `app/(tabs)/`

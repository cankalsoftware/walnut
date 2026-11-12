# UI/UX Design System & Menu Architecture ("Light Walnut Green")

## 1. Design Philosophy: Built for the Orchard

Unlike indoor productivity apps, **Walnut Analysis** will be used:
1. **Outdoors under bright midday sun** (checking irrigation, scanning tree canopies).
2. **Under dappled shade and brown leaf litter** (during autumn harvest ground picking).
3. **Indoors in the evening** (reviewing seasonal yield analytics and chatting with other walnut growers).

Therefore, our design system pairs a signature **Light Walnut Green** palette (inspired by fresh *Juglans regia* green husks and spring foliage) with **high-contrast bark charcoals**, **warm walnut shell ambers**, and **high-visibility neon AR overlays** for the camera HUD.

---

## 2. Color Palette Specification

### Primary Brand & Surface Tokens (Light Mode — Default Field View)

| Token Name | Hex Code | RGB | Visual Role |
| :--- | :--- | :--- | :--- |
| `walnutGreen.50` (`Orchard Mist`) | `#F4F8F1` | `244, 248, 241` | Main screen background canvas — warm off-white green that cuts harsh sunlight glare |
| `walnutGreen.100` (`Soft Husk`) | `#E6F0E0` | `230, 240, 224` | Secondary background, section containers, subtle card headers |
| `walnutGreen.200` (`Light Walnut Green`) | `#CFE3C4` | `207, 227, 196` | **Signature Light Walnut Green**: Active filter pills, calendar task cards, user chat bubbles, highlight badges |
| `walnutGreen.300` (`Spring Leaf`) | `#A8CC96` | `168, 204, 150` | Borders, progress bar tracks, inactive icon tints |
| `walnutGreen.500` (`Walnut Canopy`) | `#6B9E58` | `107, 158, 88` | **Primary Action Color**: Primary buttons, active bottom tab indicator, FAB background |
| `walnutGreen.700` (`Deep Grove`) | `#3E6B30` | `62, 107, 48` | Pressed button states, high-contrast headers, verified grower badges |
| `walnutGreen.900` (`Bark Charcoal`) | `#1A2616` | `26, 38, 22` | Primary typography & headings (14.5:1 contrast ratio on Orchard Mist) |

### Earth & Shell Secondary Tokens (Walnut Wood & Harvest)

| Token Name | Hex Code | Visual Role |
| :--- | :--- | :--- |
| `walnutShell.100` (`Parchment Kernel`) | `#F7EFE6` | Harvest summary cards, dormant/winter care cards |
| `walnutShell.500` (`Roasted Shell`) | `#8C5A32` | Secondary accents, trunk metric icons, harvest mode badges |
| `walnutShell.700` (`Heartwood`) | `#5C381B` | High-contrast labels on warm cards |

### Camera AR & Vision HUD Tokens (High-Visibility Field Overlay)

When finding brown walnuts on brown soil/leaves or green walnuts among green leaves, standard UI colors blend into the background. We use dedicated high-visibility vision tokens:

| Token Name | Hex Code | Usage in YOLO Scanner |
| :--- | :--- | :--- |
| `hudGlass` | `rgba(17, 24, 15, 0.78)` | Translucent dark backdrop for camera controls |
| `canopyBox` | `#00E676` (Electric Emerald) | Bounding box for walnuts detected in tree canopy |
| `groundBox` | `#CCFF00` (High-Vis Harvest Lime) | Bounding box & pulsing beacon for fallen walnuts on the ground |
| `hullSplitBox` | `#FFAB00` (Amber Gold) | Bounding box for split-hull harvest-ready walnuts |
| `anomalyBox` | `#FF5252` (Coral Red) | Highlight for blight spots, sunburn, or husk fly damage |

---

## 3. Typography & Hierarchy

- **Display / Numbers (Yield Counts, Tree Age, Chill Hours)**: Bold geometric sans-serif with `tabular-nums` enabled so live YOLO counters never jitter horizontally as numbers increment.
- **Body & Agronomic Guides**: Clean, legible humanist sans (`Inter` / System Roboto on Android) with generous `1.45` line-height for easy reading outdoors.
- **Minimum Touch Target**: `48dp × 48dp` across all buttons, checkboxes, and camera mode switches for glove-friendly operation.

---

## 4. Navigation & Menu Structure

### Bottom Navigation Bar (5 Tabs)

```text
+-----------------------------------------------------------------------+
|  [ 🌳 Orchard ]  [ 📅 Care ]   ( 📷 Vision AI )  [ 💬 Hub ]  [ 📊 Stats ] |
+-----------------------------------------------------------------------+
```

1. **🌳 Orchard (`index.tsx`)**
   - Top Bar: Orchard Switcher Dropdown (`"My Walnut Grove ▾"`), Weather/Frost Badge, Notification Bell.
   - Hero Card: **Walnut Phenology Ring** (shows current biological stage of the walnut tree, e.g., *Stage 4: Nut Sizing & Shell Hardening*, days until harvest, and winter chill hours accumulated).
   - Quick Actions Row: `+ Log Watering`, `+ Log Feeding`, `Scan Tree`, `Ground Picker`.
   - Today's Care Queue: Interactive checklist of due tasks.
   - My Trees Snapshot: Horizontal scroll of registered walnut trees with their latest YOLO nut count and health status.

2. **📅 Care Calendar (`calendar.tsx`)**
   - Season Filter Pills: `All Seasons` | `❄️ Winter Care` | `🌱 Spring Pruning/Feed` | `☀️ Summer Water` | `🍂 Harvest`.
   - Interactive Monthly/Timeline Calendar with color-coded task dots.
   - **Smart Care Protocol Cards**:
     - *Pruning*: Structural training (years 1–4) vs. mature canopy light-penetration pruning.
     - *Watering*: Soil moisture & evapotranspiration (ETc) deep-soak reminders.
     - *Feeding*: Nitrogen + Zinc spring boost, Boron pollination spray, Potassium autumn root prep.
     - *Harvest*: Hull split check, shaking window, ground picking, washing & drying temperature alerts.
     - *Winter Care*: Trunk whitewashing (sunscald prevention), chill-hour tracking, dormant copper/oil sprays.
   - Push Notification Toggle per task (`Remind me at 7:00 AM` + `48h Frost Warning`).

3. **📷 Vision AI (`scanner.tsx` — Elevated Center Button)**
   - Top Segmented Switcher:
     1. **`🌳 Canopy Count`** (In-tree YOLO yield estimation)
     2. **`🍂 Ground Finder`** (Post-harvest fallen nut detector)
     3. **`🔍 Health & Growth`** (Nut diameter & leaf/husk inspection)
   - Center Viewfinder: Live camera feed with real-time YOLO bounding boxes, confidence pill, and target reticle.
   - Bottom HUD Sheet:
     - Live Counter (`"42 Walnuts in View"` | `"Est. Tree Total: ~380 Nuts / 4.6 kg"`).
     - Tree Selector (`"Assign to: Tree #03 - Chandler"`).
     - Capture / Lock Scan button + `"Share to Grower Chat"` button.

4. **💬 Grower Hub (`community.tsx`)**
   - Sub-Navigation Tabs: `Channels` | `Direct Messages` | `Shared Scans`.
   - Channels List:
     - `#general-orchard`
     - `#pruning-and-training`
     - `#watering-and-feeding`
     - `#yolo-yield-estimates`
     - `#pest-and-blight-sos`
     - `#harvest-and-drying`
   - Rich Chat Composer: Text input + Photo upload + **`Attach Tree Data Card`** (lets users attach a structured card containing their tree's variety, age, YOLO count, and recent care log directly into the conversation).

5. **📊 Stats & Trees (`analytics.tsx`)**
   - Sub-Navigation Tabs: `Yield Analytics` | `Growth Curves` | `Tree Registry` | `Account & Sync`.
   - Charts:
     - **Canopy Count vs. Actual Harvested Weight** (calibrates the YOLO estimator over time).
     - **Seasonal Nut Size Growth Curve** (mm diameter from May to October).
     - **Water & Feeding Consistency Score**.
   - Cloud & Web Sync Status Card: Shows Clerk user profile (Google / Email), local SQLite offline queue status, and Convex real-time sync health.


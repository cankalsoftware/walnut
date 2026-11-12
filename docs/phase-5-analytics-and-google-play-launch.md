# Phase 5: Growth Analytics, Web Link & Google Play Store Launch

> **Status**: Planned  
> **Goal**: Provide deep visual analytics on walnut growth and yield accuracy, exportable orchard reports, Web App companion endpoints, and a production-ready Google Play Store release via Expo Application Services (EAS).

---

## 1. Visual Growth & Yield Analytics Suite

### 1.1 Seasonal Nut Size Progression Curve
- Tracks walnut diameter (`mm`) from **pea-size (May)** → **rapid sizing (June)** → **shell hardening (July)** → **hull split (September/October)**.
- Alerts the grower if nut sizing plateaus early in June (indicating water stress during the critical sizing window).

### 1.2 Canopy Estimate vs. Harvest Reality Calibration
- Compares the **YOLO Canopy Estimate** (e.g., `410 nuts / 5.1 kg`) against the **Actual Harvested Weight** logged after drying (e.g., `4.9 kg`).
- Displays an **AI Accuracy Score** (`96.1%`) and refines that tree's occlusion multiplier for future seasons.

### 1.3 Care Input vs. Yield Correlation
- Visualizes how watering consistency, spring nitrogen/zinc feeding, and winter chill hours correlate with nut yield across multiple trees or seasons.

---

## 2. Google Play Store Submission Checklist (EAS Build)

### 2.1 Android App Bundle (`.aab`) Configuration
- **Package ID**: `com.walnutiq.analysis` (or your preferred domain namespace)
- **Target SDK**: Android 15 (API Level 35 — required for new Google Play submissions)
- **Permissions Declared (`app.json`)**:
  - `android.permission.CAMERA` (Required for YOLO Canopy Counter & Ground Finder)
  - `android.permission.POST_NOTIFICATIONS` (Required for Pruning, Watering & Feeding Calendar reminders)
  - `android.permission.ACCESS_FINE_LOCATION` *(Optional — for pinning tree GPS coordinates in the orchard)*

### 2.2 Google Play Data Safety Section Answers
Because we use **Clerk** (Google/Email Auth) and **Convex** (Cloud Sync + Chat):
- **Data Encrypted in Transit**: Yes (HTTPS/WSS via Clerk & Convex).
- **Account Deletion Support**: Include an in-app `"Delete Account & Data"` button in Profile Settings (mandatory for Google Play apps with user accounts) that triggers a Convex mutation to purge user data and deletes the Clerk account.
- **Camera Usage Disclosure**: Clearly state that camera frames for YOLO walnut counting are processed **100% locally on the device**, and photos are only uploaded when the user explicitly chooses to save a cloud backup or share a scan card in the Grower Community chat.

### 2.3 EAS Build Commands
```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Configure EAS project
eas build:configure

# 3. Build Android Development Client (for testing native TFLite YOLO camera on your phone)
eas build --profile development --platform android

# 4. Build Production Android App Bundle (.aab) for Google Play Console
eas build --profile production --platform android
```


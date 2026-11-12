# Google Play Store Requirements & Official Listing Specification

> **Official App Title**: `WalnutIQ: Tree Care & AI Count`  
> **Primary ASO Subtitle / Focus**: `Walnut Tree Care & AI Counter`  
> **Android Package ID**: `com.walnutiq.analysis`  
> **Category**: Tools / Productivity / Agriculture & Gardening  
> **Content Rating**: Everyone (PEGI 3 / ESRB Everyone)

---

## 1. Google Play Store Listing Copy (ASO-Optimized)

### 1.1 App Title (Max 30 Characters)
```text
WalnutIQ: Tree Care & AI Count
```
*(30 characters exact — combines the distinctive **WalnutIQ** brand with high-volume search keywords **Tree Care** & **AI Count**).*

### 1.2 Short Description / Subtitle (Max 80 Characters)
```text
Walnut Tree Care & AI Counter: YOLO yield estimator, ground picker & care plan.
```
*(79 characters — directly leads with **Walnut Tree Care & AI Counter** for maximum Google Play search indexing).*

### 1.3 Full Description (Max 4,000 Characters — Ready for Play Console)
```text
WalnutIQ: Tree Care & AI Count is the complete Walnut Tree Care & AI Counter companion for backyard walnut tree owners, homesteaders, and commercial walnut orchard growers.

From winter dormancy and structural pruning to spring feeding, summer deep-root irrigation, YOLO camera yield estimation, and autumn ground harvest picking, WalnutIQ guides you through every day of the walnut growing year.

🌳 COMPLETE YEAR-ROUND WALNUT TREE CARE & COUNTDOWNS
• Pruning Guide & Reminders: Dormant central-leader training for young walnut trees and canopy sunlight thinning for mature bearing trees.
• Smart Watering Cycles: Countdown timers and deep-soak irrigation reminders tailored to critical nut-sizing (June–July) and kernel-fill phases.
• Feeding & Nutrition Schedules: Timely push alerts for spring Nitrogen + Zinc budbreak boosts, Boron pollination sprays, mid-summer NPK cutoffs, and post-harvest potassium.
• Winter Care & Chill Hours: Track winter chill-hour accumulation (0°C–7.2°C), receive spring frost warnings, and get reminders for trunk whitewashing and dormant oil/copper sprays.
• Daily & Weekly Care Popups: Stay on top of your orchard with automated daily briefings, weekly care digests, and live countdown timers to your next watering or feeding cycle.

📷 DUAL-MODE AI WALNUT COUNTER (POWERED BY ON-DEVICE YOLO VISION)
1. In-Tree Canopy Walnut Counter:
   Scan the North, East, South, and West quadrants of your walnut tree. WalnutIQ detects walnuts hanging in the branches and applies a canopy density occlusion model to estimate total nuts per tree and expected harvest weight (kg/lbs).
2. Post-Harvest Ground Walnut Finder:
   After shaking or windfall, switch to Ground Picker mode. High-visibility neon AR bounding boxes highlight fallen walnuts camouflaged among brown autumn leaves, grass, cracked hulls, and soil so you never leave nuts behind.
3. Visual Growth & Health Analytics:
   Track walnut diameter (mm) progression from May pea-size to October hull-split and log leaf/husk health checks.

🌡️ TUYA SMART ORCHARD SENSOR PLUGIN SUPPORT
• View live orchard micro-climate telemetry right on your dashboard: Soil Moisture (%), Air & Soil Temperature (°C/°F), Sunlight & UV Intensity (Lux), and Relative Humidity.
• Ready to link with Tuya-compatible smart soil moisture probes and orchard weather stations.

💬 GROWER COMMUNITY & IN-APP MESSAGING
• Connect with fellow walnut growers in topic channels (#pruning-and-training, #watering-and-feeding, #yolo-yield-estimates, #pest-and-blight-sos) or 1-on-1 direct messages.
• Share interactive Tree Scan & Care Cards directly in chat so experienced growers can review your walnut count, variety, nut size, and feeding history.

☁️ OFFLINE-FIRST FIELD RELIABILITY + CLOUD & WEB SYNC
• Built for real orchards with weak cellular reception: capture YOLO scans, check off tasks, and log care 100% offline.
• Automatically syncs to the cloud via Convex and Clerk (Google Sign-In & Email login) when you return online, and automatically cleans up synced local cache older than 14 days to keep your phone storage light.
```

---

## 2. Google Play Visual Asset Requirements

Before publishing to Google Play Console, prepare the following graphics using our **Light Walnut Green (`#CFE3C4` / `#6B9E58`)** brand palette:

| Asset Type | Dimensions | Format | Requirements & Design Notes |
| :--- | :--- | :--- | :--- |
| **Hi-Res App Icon** | `512 × 512 px` | 32-bit PNG | Max 1024 KB. Stylized walnut leaf + AI reticle on `#DCEAD5` Light Walnut Green background. |
| **Adaptive Foreground/Bg** | `432 × 432 px` (safe zone `288px`) | PNG / Vector | Configured in `app.json` under `android.adaptiveIcon`. |
| **Feature Graphic** | `1024 × 500 px` | PNG or JPEG | Displayed at the top of the Play Store listing. Show split view of Canopy YOLO Counter + Care Calendar. |
| **Phone Screenshots** | Min 4, Recommended 6 (`1080 × 1920 px` or `9:16`) | PNG or JPEG | 1. Orchard Dashboard & Tuya Sensors<br>2. YOLO Canopy Counter<br>3. YOLO Ground Harvest Finder<br>4. Care Calendar & Countdowns<br>5. Grower Chat & Shared Tree Card<br>6. Growth Analytics Curve |
| **10-inch & 7-inch Tablet** | `1080 × 1920 px` (or `16:9`) | PNG or JPEG | Required if targeting Google Play "Designed for Tablets" badge. |

---

## 3. Technical & Policy Compliance Checklist for Google Play

### 3.1 Target SDK & Build Format
- **Target API Level**: Android 15 (**API Level 35**) — mandatory for all new Google Play apps.
- **Upload Format**: **Android App Bundle (`.aab`)** built via `eas build --platform android --profile production`.
- **Play App Signing**: Enabled in Google Play Console (EAS automatically manages the upload keystore).

### 3.2 Android Permissions & Justification
Only request permissions strictly needed for core functionality:
1. **`android.permission.CAMERA`**:
   - *Used for*: On-device YOLO walnut canopy counting, post-harvest ground walnut detection, and optional tree photo sharing.
   - *Play Policy Note*: Does not require special restricted permission declaration, but must be disclosed in the Privacy Policy.
2. **`android.permission.POST_NOTIFICATIONS`** (Android 13+ runtime prompt):
   - *Used for*: Seasonal pruning, watering, feeding, frost watch, and daily/weekly care countdown notifications.
3. **`android.permission.ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`** *(Optional, requested only when pinning a tree or pairing Tuya BLE sensors)*:
   - *Used for*: Pinning walnut tree GPS coordinates in the orchard and local micro-climate weather lookup.
   - *Important*: Never request `ACCESS_BACKGROUND_LOCATION` unless strictly required, as Google Play heavily restricts background location.

### 3.3 Google Play Data Safety Questionnaire Answers
When filling out the **Data Safety** form in Google Play Console:
- **Does your app collect or share any of the required user data types?** → `Yes`
- **Is all of the user data collected by your app encrypted in transit?** → `Yes` (HTTPS/TLS via Clerk & Convex).
- **Do you provide a way for users to request that their data is deleted?** → `Yes` (Mandatory! We provide both an in-app `"Delete Account & Cloud Data"` button under Profile/Settings and a web deletion request link).
- **Declared Data Types**:
  - *Personal Info (Name, Email address, User IDs)*: Collected via Clerk (Google Sign-In / Email) for authentication and community chat profile.
  - *Photos and Videos*: Optional — YOLO inference runs 100% on-device; photos are only uploaded to Convex Storage when the user syncing/sharing a scan card.
  - *App Activity / Messages*: In-app community chat messages and shared orchard cards stored in Convex.

### 3.4 Google Play Testing Track Requirement (For Personal Developer Accounts)
- If publishing under a **Personal Google Play Developer Account** (created after Nov 2023), Google Play requires running a **Closed Testing track with at least 12–20 opted-in testers for 14 continuous days** before unlocking Production access.
- If publishing under an **Organization Google Play Developer Account** (with a D-U-N-S number), you can submit directly to Production after internal testing.

# 00 — Step-by-Step Running Guide ("Dummy" Friendly Manual)

This guide explains **where everything lives** and **the exact commands to type** to run:
1. **The Mobile App** (React Native + Expo — for Android & iOS)
2. **The Independent Web App** (`web-app/` — for **walnut.pinarlik.com** on Vercel)
3. **The Background Python Server & YOLO11 Pipeline** (`web-app/backend/` & `web-app/yolo/` — for Web Scraping, CLIP Auto-Sorting, Labeling & `.pt` Weight Preparation)
4. **The Shared Cloud Database & Login** (**Convex** + **Clerk**)

---

## Part 1: Folder Layout at a Glance

```text
walnut/                                 <-- MAIN ROOT (Mobile App + Shared Convex)
├── app/                                <-- MOBILE APP ONLY (Expo Router 5-tab screens)
├── src/                                <-- MOBILE APP ONLY (Theme, Services, Clerk/Convex Provider)
├── weights/                            <-- FINAL WEIGHTS (.pt & .tflite files used by Mobile App)
├── convex/                             <-- SHARED DATABASE (Used by BOTH Mobile App & Web App)
├── .env.local                          <-- MOBILE APP KEYS (Clerk + Convex)
│
├── web-app/                            <-- INDEPENDENT WEB APP (Deploy this folder to Vercel: walnut.pinarlik.com)
│   ├── src/                            <-- Web Portal & Admin Studio UI (React + Vite)
│   ├── vercel.json                     <-- Vercel deployment config for walnut.pinarlik.com
│   ├── .env.local                      <-- WEB APP KEYS (Same Clerk + Convex keys!)
│   ├── backend/
│   │   └── server.py                   <-- Python Background API Server (http://127.0.0.1:8000)
│   └── yolo/                           <-- ALL YOLO11, SCRAPING, CLIP & LABELING SCRIPTS
│       ├── requirements.txt            <-- Python libraries list
│       ├── configs/                    <-- walnut_canopy.yaml & walnut_ground.yaml
│       ├── scripts/                    <-- train.py & export_weights.py
│       └── dataset_builder/            <-- 1_scrape, 2_clip, 3_labeling, 4_import_walnutdata
│
├── docs/                               <-- Project plans & this running guide
└── research/                           <-- Academic papers & notes (ignored from public publishing)
```

---

## Part 2: One-Time Setup for Shared Clerk & Convex Keys

Both the **Mobile App** and the **Web App (`walnut.pinarlik.com`)** share the exact same database and user accounts.

### Step 1: Create Clerk Account (Login System)
1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and create an application called **WalnutIQ**.
2. Turn on **Email** and **Google** sign-in.
3. Go to **API Keys** and copy your **Publishable Key** (starts with `pk_test_...`).
4. Go to **JWT Templates** → **New Template** → choose **Convex**, and copy the **Issuer URL** (looks like `https://xxx.clerk.accounts.dev`).

### Step 2: Create Convex Account (Real-Time Database)
1. Open your terminal in the main `c:\Users\uyko7\Documents\VSCode\walnut` folder and run:
   ```bash
   pnpx convex dev
   ```
2. It will open your browser to log in to Convex, create the project, and give you your **Convex URL** (looks like `https://xxx.convex.cloud`).

### Step 3: Paste Keys into Both `.env.local` Files
1. **In Root `.env.local` (for Mobile App)**:
   ```ini
   EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
   CLERK_JWT_ISSUER_DOMAIN=https://your-issuer.clerk.accounts.dev
   ```
2. **In `web-app/.env.local` (for Web App / Vercel)**:
   ```ini
   VITE_CONVEX_URL=https://your-project.convex.cloud
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key
   VITE_ML_WORKER_URL=http://127.0.0.1:8000
   ```

---

## Part 3: How to Run the Mobile App (Expo / React Native)

Open a terminal in the **main root folder** (`c:\Users\uyko7\Documents\VSCode\walnut`):

```bash
pnpm exec expo start --clear
```
- **Recommended**: Scan the QR code with the **Expo Go (SDK 57)** app on your phone (or press **`w`** to preview in your browser). Only press **`a`** if you have Android Studio + Android SDK (`adb`) installed on your PC.
- *(Note: Always use `pnpm exec expo start --clear` or `npx expo start -c` instead of `pnpx`, so it uses the project's local Expo SDK 57 rather than downloading SDK 58).*
- The Mobile App works even when offline in the orchard and automatically purges synced local cache older than **14 days**.

---

## Part 4: How to Run the Web App (`web-app/`) & Background Worker

Because scraping, CLIP filtering, labeling, and YOLO11 training are heavy background jobs, they live inside `web-app/`.

### Step 1: Start the Python Background Worker (Terminal 1)
Open a terminal in the main folder and run:
```bash
python web-app/backend/server.py
```
*(Leave this terminal open — it runs on `http://127.0.0.1:8000` and executes your scraping, CLIP, labeling, and YOLO11 training jobs).*

### Step 2: Start the Independent Web App (Terminal 2)
Open a second terminal, go into `web-app/`, install its web packages once, and start it:
```bash
cd web-app
pnpm install
pnpm dev
```
- Open **`http://localhost:5173`** in your browser!
- You will see the **WalnutIQ Admin & Dataset Studio** where you can click buttons to run the Scraper, CLIP Filter, `labelImg` Labeling, `1wuming/WalnutData` Import, and YOLO11 Training while watching the live console output!

---

## Part 5: How to Deploy `web-app/` to `walnut.pinarlik.com` on Vercel

Because `web-app/` is completely separated from the mobile app, deploying to Vercel takes 2 minutes:

1. Push your repository to GitHub.
2. Go to [https://vercel.com/new](https://vercel.com/new) and import your GitHub repository.
3. **Important — Set Root Directory**:
   - Next to **Root Directory**, click **Edit** and select **`web-app`**.
4. **Add Environment Variables in Vercel**:
   - `VITE_CONVEX_URL` = your Convex URL
   - `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk Publishable Key
   - `VITE_ML_WORKER_URL` = `http://127.0.0.1:8000` (this lets your browser on `https://walnut.pinarlik.com` talk directly to your PC's local Python worker when `python web-app/backend/server.py` is running on your computer!).
5. Click **Deploy**.
6. In Vercel Project Settings → **Domains**, add **`walnut.pinarlik.com`** and add the CNAME record (`cname.vercel-dns.com`) in your `pinarlik.com` DNS settings.

---

## Part 6: Direct Terminal Commands for YOLO11, Scraping, CLIP & Labeling (Optional)

You can trigger every step either from the **Web App buttons** (`walnut.pinarlik.com` / `http://localhost:5173`) OR by typing these commands directly in your terminal from the project root:

### 1. Install Python Requirements (If Needed)
```bash
python -m pip install -r web-app/yolo/requirements.txt
python -m pip install ftfy regex git+https://github.com/ultralytics/CLIP.git
```

### 2. Scrape Missing Ground & Canopy Images (Bing / Flickr / DuckDuckGo)
```bash
python web-app/yolo/dataset_builder/1_scrape_images.py --target all --max-per-query 50
```

### 3. Filter Junk & Sort Classes with Zero-Shot CLIP (`ultralytics/CLIP`)
```bash
python web-app/yolo/dataset_builder/2_clip_filter_and_classify.py --export-yolo-cls
```

### 4. Label Bounding Boxes with `labelImg` & Split into Train/Val/Test
```bash
# Create classes.txt files:
python web-app/yolo/dataset_builder/3_prepare_for_labeling.py --setup-classes

# After drawing boxes in labelImg, finalize the 80/15/5 split:
python web-app/yolo/dataset_builder/3_prepare_for_labeling.py --finalize-splits
```

### 5. Import `1wuming/WalnutData` (Hugging Face 30,240 Canopy Images)
```bash
python web-app/yolo/dataset_builder/4_import_walnutdata_hf.py --source C:/Users/uyko7/Downloads/WalnutData --max-samples 3000
```

### 6. Train YOLO11 & Export `.pt` / `.tflite` to `/weights` for the Mobile App
```bash
# Train Mode 1: Canopy Counter (yolo11s.pt)
python web-app/yolo/scripts/train.py --mode canopy --arch yolo11 --epochs 100

# Train Mode 2: Ground Picker (yolo11n.pt)
python web-app/yolo/scripts/train.py --mode ground --arch yolo11 --epochs 100

# Export trained .pt to /weights/canopy/ & /weights/ground/ and update /weights/manifest.json:
python web-app/yolo/scripts/export_weights.py --mode canopy --weights web-app/yolo/runs/walnut_canopy_yolo11/weights/best.pt
python web-app/yolo/scripts/export_weights.py --mode ground --weights web-app/yolo/runs/walnut_ground_yolo11/weights/best.pt
```

---

## Part 7: Running the Background ML Worker in Docker on Your VPS (Production)

For production, **`https://walnut.pinarlik.com`** runs on **Vercel** (`web-app/`), while the heavy Python worker (`web-app/backend/server.py` + `web-app/yolo/`) runs independently inside **Docker on your VPS** (for example at **`https://ml-walnut.pinarlik.com`**).

### Step 1: Install Docker on Your VPS (One-Time), Clone Repo & Start
SSH into your Ubuntu/Debian VPS and install Docker + Docker Compose if not already installed:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```
*(Log out and back in once so your user can run `docker` without `sudo`.)*

Then clone the repo and start the container:
```bash
git clone <your-github-repo-url> walnut
cd walnut/web-app/backend
docker compose up -d --build
```
- **Check it is running**:
  ```bash
  docker compose ps
  docker compose logs -f
  curl http://127.0.0.1:8000/api/status
  ```
- **Persistent Volumes**: `docker-compose.yml` automatically mounts your VPS host folders (`datasets/`, `runs/`, `raw_scraped/`, `curated/`, `rejected_by_clip/`, and `/weights`) so your scraped photos and trained `.pt` / `.tflite` files are never lost when restarting the container.

### Step 2: Expose Your VPS Worker Over HTTPS (Required for Vercel)
Because `https://walnut.pinarlik.com` is HTTPS, browsers block calls to plain `http://`. Point a subdomain (e.g. **`ml-walnut.pinarlik.com`**) A-record to your VPS IP and add an HTTPS reverse proxy:

**Option A — Caddy (Automatic Free SSL)**:
```caddy
ml-walnut.pinarlik.com {
    reverse_proxy 127.0.0.1:8000
}
```

**Option B — Nginx + Certbot**:
```nginx
server {
    server_name ml-walnut.pinarlik.com;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Then run: `sudo certbot --nginx -d ml-walnut.pinarlik.com`

### Step 3: Link `walnut.pinarlik.com` (Vercel) to Your VPS Docker Worker
1. Open your Vercel project settings → **Environment Variables**.
2. Set:
   ```ini
   VITE_ML_WORKER_URL=https://ml-walnut.pinarlik.com
   ```
3. Redeploy Vercel. Now when you open **`https://walnut.pinarlik.com`**, the status badge will turn green (`● Python Worker Online`) and you can run scraping, CLIP filtering, and YOLO11 training on your VPS right from your browser!

---

## Part 8: Building & Deploying the Mobile App (`expo.dev` EAS vs. Local Build)

During development, you run **100% local Expo** (`pnpm exec expo start --clear`) with **Expo Go** on your phone — no `expo.dev` account is required yet.

When you are ready to build the **`.aab` / `.apk` for Google Play Store**:

### Option A: `expo.dev` EAS Cloud Build (Recommended on Windows)
1. Create a free account at [https://expo.dev](https://expo.dev).
2. Log in from the root project folder and configure EAS once:
   ```bash
   pnpx eas-cli login
   pnpx eas-cli build:configure
   ```
3. Build the Google Play production `.aab` (or an `.apk` to test on Android):
   ```bash
   # Production Android App Bundle (.aab) for Google Play Store:
   pnpx eas-cli build --platform android --profile production

   # Optional: Direct .apk for installing on your own Android phone:
   pnpx eas-cli build --platform android --profile preview
   ```
   *(Expo's cloud servers compile and sign your app — no Android Studio or Mac needed).*

### Option B: 100% Local Android Build (Without `expo.dev`)
If you prefer building locally on your Windows PC instead of using `expo.dev`:
1. Install **Android Studio**, **Android SDK**, **Java JDK 17**, and set `ANDROID_HOME`.
2. Generate native Android files and build:
   ```bash
   npx expo prebuild --platform android
   cd android
   ./gradlew bundleRelease
   ```



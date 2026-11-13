# WalnutIQ Background Process Engine (`background/`)

This folder isolates heavy **Admin, Scraping, CLIP Auto-Classification, Labeling, and YOLO11 Model Training** processes away from the grower-facing **Expo Mobile App**.

## How It Works

1. **`background/server.py` (FastAPI Background Worker on `http://localhost:8000`)**:
   - Runs background subprocesses for:
     - `yolo/dataset_builder/1_scrape_images.py` (Bing / Flickr / DuckDuckGo image scraper)
     - `yolo/dataset_builder/2_clip_filter_and_classify.py` (`ultralytics/CLIP` zero-shot filter)
     - `yolo/dataset_builder/3_prepare_for_labeling.py` (`labelImg` launcher & train/val/test splitter)
     - `yolo/dataset_builder/4_import_walnutdata_hf.py` (`1wuming/WalnutData` Hugging Face importer)
     - `yolo/scripts/train.py --arch yolo11` & `yolo/scripts/export_weights.py`
   - Streams live stdout logs, dataset counts, and `/weights/manifest.json` health to the **Admin Web App** (`app/admin.tsx`).

2. **Start the Background Server**:
   ```bash
   python background/server.py
   ```

3. **Open the Admin & Dataset Web Portal (Shared Clerk & Convex)**:
   ```bash
   pnpx expo start --web
   ```
   Then click **Admin & Dataset Studio** (or navigate to `http://localhost:8081/admin`).


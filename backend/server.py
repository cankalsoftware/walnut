from __future__ import annotations

"""
WalnutIQ Background Worker & Admin API Server (`background/server.py`)
----------------------------------------------------------------------
Separates heavy dataset & ML background processes from the Expo mobile app:
  1. Web Image Scraping (`1_scrape_images.py` — Bing / Flickr / DuckDuckGo)
  2. Zero-Shot CLIP Filtering & Classification (`2_clip_filter_and_classify.py`)
  3. Labeling Setup & Train/Val/Test Split (`3_prepare_for_labeling.py` / `labelImg`)
  4. Hugging Face `1wuming/WalnutData` Importer (`4_import_walnutdata_hf.py`)
  5. YOLO11 Training & `.pt` / `.tflite` Export (`train.py` & `export_weights.py`)

Run with:
  python background/server.py
Then open the Admin Web App (`pnpx expo start --web` -> `/admin`) to control and
monitor all background jobs in real time!
"""

import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent
YOLO_DIR = BACKEND_DIR / "yolo"
BUILDER_DIR = YOLO_DIR / "dataset_builder"
WEIGHTS_MANIFEST = REPO_ROOT / "weights" / "manifest.json"
ADMIN_WORKER_TOKEN = os.environ.get("ADMIN_WORKER_TOKEN", "").strip()

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

app = FastAPI(
    title="WalnutIQ Background ML & Dataset Admin API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobState:
    def __init__(self) -> None:
        self.active_job: str | None = None
        self.status: str = "IDLE"  # IDLE | RUNNING | COMPLETED | FAILED
        self.started_at: str | None = None
        self.finished_at: str | None = None
        self.logs: list[str] = [
            "[System] WalnutIQ Background Worker initialized and ready.",
            f"[System] Python executable: {sys.executable}",
        ]
        self.lock = threading.Lock()

    def append_log(self, line: str) -> None:
        with self.lock:
            self.logs.append(line.rstrip())
            if len(self.logs) > 200:
                self.logs = self.logs[-200:]


JOB_STATE = JobState()


def run_background_command(job_name: str, cmd: list[str]) -> bool:
    if JOB_STATE.status == "RUNNING":
        JOB_STATE.append_log(f"[!] Cannot start '{job_name}': '{JOB_STATE.active_job}' is already running.")
        return False

    def _worker() -> None:
        JOB_STATE.active_job = job_name
        JOB_STATE.status = "RUNNING"
        JOB_STATE.started_at = datetime.now(timezone.utc).isoformat()
        JOB_STATE.finished_at = None
        JOB_STATE.append_log(f"\n=== [START JOB: {job_name}] ===")
        JOB_STATE.append_log(f"$ {' '.join(cmd)}")

        try:
            proc = subprocess.Popen(
                cmd,
                cwd=str(REPO_ROOT),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            assert proc.stdout is not None
            for line in proc.stdout:
                JOB_STATE.append_log(line)
            code = proc.wait()
            JOB_STATE.finished_at = datetime.now(timezone.utc).isoformat()
            if code == 0:
                JOB_STATE.status = "COMPLETED"
                JOB_STATE.append_log(f"=== [COMPLETED: {job_name} (exit 0)] ===")
            else:
                JOB_STATE.status = "FAILED"
                JOB_STATE.append_log(f"=== [FAILED: {job_name} (exit {code})] ===")
        except Exception as exc:
            JOB_STATE.status = "FAILED"
            JOB_STATE.finished_at = datetime.now(timezone.utc).isoformat()
            JOB_STATE.append_log(f"[Error] {exc}")

    threading.Thread(target=_worker, daemon=True).start()
    return True


def count_images_in(folder: Path) -> int:
    if not folder.exists():
        return 0
    return sum(
        1 for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )


def count_labels_in(folder: Path) -> int:
    if not folder.exists():
        return 0
    return sum(
        1
        for p in folder.rglob("*.txt")
        if p.is_file() and p.name.lower() not in {"classes.txt", "readme.txt"}
    )


@app.get("/api/status")
def get_pipeline_status() -> dict[str, Any]:
    raw_dir = BUILDER_DIR / "raw_scraped"
    curated_dir = BUILDER_DIR / "curated"
    rejected_dir = BUILDER_DIR / "rejected_by_clip"
    datasets_dir = YOLO_DIR / "datasets"

    manifest_data = {}
    if WEIGHTS_MANIFEST.exists():
        try:
            manifest_data = json.loads(WEIGHTS_MANIFEST.read_text(encoding="utf-8"))
        except Exception:
            manifest_data = {}

    return {
        "job": {
            "activeJob": JOB_STATE.active_job,
            "status": JOB_STATE.status,
            "startedAt": JOB_STATE.started_at,
            "finishedAt": JOB_STATE.finished_at,
            "logs": JOB_STATE.logs[-45:],
        },
        "counts": {
            "rawScrapedTotal": count_images_in(raw_dir),
            "rawCanopy": count_images_in(raw_dir / "canopy"),
            "rawGround": count_images_in(raw_dir / "ground"),
            "curatedTotal": count_images_in(curated_dir),
            "curatedCanopy": count_images_in(curated_dir / "canopy"),
            "curatedGround": count_images_in(curated_dir / "ground"),
            "curatedLabels": count_labels_in(curated_dir),
            "rejectedByClip": count_images_in(rejected_dir),
            "datasetCanopyImages": count_images_in(datasets_dir / "walnut_canopy" / "images"),
            "datasetCanopyLabels": count_labels_in(datasets_dir / "walnut_canopy" / "labels"),
            "datasetGroundImages": count_images_in(datasets_dir / "walnut_ground" / "images"),
            "datasetGroundLabels": count_labels_in(datasets_dir / "walnut_ground" / "labels"),
        },
        "weightsManifest": manifest_data,
    }


class ScrapeRequest(BaseModel):
    target: str = "all"
    engine: str = "all"
    max_per_query: int = 40


@app.post("/api/jobs/scrape")
def trigger_scrape(req: ScrapeRequest) -> dict[str, Any]:
    cmd = [
        sys.executable,
        str(BUILDER_DIR / "1_scrape_images.py"),
        "--target",
        req.target,
        "--engine",
        req.engine,
        "--max-per-query",
        str(req.max_per_query),
    ]
    started = run_background_command(f"Scrape Images ({req.target} / {req.engine})", cmd)
    return {"started": started}


class ClipFilterRequest(BaseModel):
    confidence: float = 0.28
    export_yolo_cls: bool = True


@app.post("/api/jobs/clip-filter")
def trigger_clip_filter(req: ClipFilterRequest) -> dict[str, Any]:
    cmd = [
        sys.executable,
        str(BUILDER_DIR / "2_clip_filter_and_classify.py"),
        "--confidence",
        str(req.confidence),
    ]
    if req.export_yolo_cls:
        cmd.append("--export-yolo-cls")
    started = run_background_command("Zero-Shot CLIP Filter & Classify", cmd)
    return {"started": started}


class LabelingActionRequest(BaseModel):
    action: str = "setup_classes"  # setup_classes | finalize_splits | launch_labelimg
    target_folder: str = "ground"


@app.post("/api/jobs/labeling")
def trigger_labeling(req: LabelingActionRequest) -> dict[str, Any]:
    if req.action == "finalize_splits":
        cmd = [
            sys.executable,
            str(BUILDER_DIR / "3_prepare_for_labeling.py"),
            "--finalize-splits",
        ]
        started = run_background_command("Finalize Train/Val/Test Splits", cmd)
        return {"started": started}

    if req.action == "launch_labelimg":
        target_dir = BUILDER_DIR / "curated" / req.target_folder
        classes_file = target_dir / "classes.txt"
        cmd = ["labelImg", str(target_dir), str(classes_file)]
        started = run_background_command(f"Launch labelImg ({req.target_folder})", cmd)
        return {"started": started}

    cmd = [
        sys.executable,
        str(BUILDER_DIR / "3_prepare_for_labeling.py"),
        "--setup-classes",
    ]
    started = run_background_command("Setup classes.txt for Labeling", cmd)
    return {"started": started}


class ImportWalnutDataRequest(BaseModel):
    source_path: str = ""
    download_hf: bool = False
    remap_mode: str = "unified"
    max_samples: int = 3000


@app.post("/api/jobs/import-walnutdata")
def trigger_import_walnutdata(req: ImportWalnutDataRequest) -> dict[str, Any]:
    cmd = [
        sys.executable,
        str(BUILDER_DIR / "4_import_walnutdata_hf.py"),
        "--remap-mode",
        req.remap_mode,
        "--max-samples",
        str(req.max_samples),
    ]
    if req.download_hf:
        cmd.append("--download-hf")
    elif req.source_path.strip():
        cmd.extend(["--source", req.source_path.strip()])
    started = run_background_command("Import 1wuming/WalnutData (Hugging Face)", cmd)
    return {"started": started}


class TrainYoloRequest(BaseModel):
    mode: str = "canopy"  # canopy | ground | classify
    arch: str = "yolo11"
    epochs: int = 50
    batch: int = 16


@app.post("/api/jobs/train-yolo11")
def trigger_train_yolo(req: TrainYoloRequest) -> dict[str, Any]:
    cmd = [
        sys.executable,
        str(YOLO_DIR / "scripts" / "train.py"),
        "--mode",
        req.mode,
        "--arch",
        req.arch,
        "--epochs",
        str(req.epochs),
        "--batch",
        str(req.batch),
    ]
    started = run_background_command(f"Train {req.arch.upper()} ({req.mode})", cmd)
    return {"started": started}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    print(f"[WalnutIQ Background Worker] Starting FastAPI server on http://{host}:{port} ...")
    uvicorn.run(app, host=host, port=port)


from __future__ import annotations

"""
Step 4: Importer & Remapper for 1wuming/WalnutData (Hugging Face: nanmao/WalnutData)
------------------------------------------------------------------------------------
Repository: https://github.com/1wuming/WalnutData
Hugging Face: https://huggingface.co/datasets/nanmao/WalnutData

About WalnutData:
- 30,240 canopy images of green walnuts with 4 fine-grained occlusion/lighting classes:
    0: A1 (Front-lit, unoccluded green walnut)
    1: A2 (Backlit, unoccluded green walnut)
    2: B1 (Front-lit, leaf/branch-occluded green walnut)
    3. B2 (Backlit, leaf/branch-occluded green walnut)

What this importer does:
1. Can download `nanmao/WalnutData` from Hugging Face (with `--download-hf`) OR read
   from the folder where you downloaded/extracted it (`--source <folder>`).
2. By default (`--remap-mode unified`), remaps classes `0, 1, 2, 3` (A1, A2, B1, B2) ->
   Class `0` (`walnut_green`) so it merges cleanly with our 3-class `walnut_canopy.yaml`:
     0: walnut_green
     1: walnut_hull_split
     2: walnut_blight_damaged
3. Alternatively (`--remap-mode keep_4_classes`), preserves A1/A2/B1/B2 so you can train
   a specialized occlusion-aware canopy counter!

Usage:
  # Import from a local folder you downloaded from Hugging Face:
  python yolo/dataset_builder/4_import_walnutdata_hf.py --source C:/Downloads/WalnutData

  # Or download directly via huggingface_hub:
  python yolo/dataset_builder/4_import_walnutdata_hf.py --download-hf
"""

import argparse
import random
import shutil
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def download_from_huggingface(dest_dir: Path) -> Path:
    try:
        from huggingface_hub import snapshot_download
    except ImportError as exc:
        raise RuntimeError(
            "Install huggingface-hub first: `python -m pip install huggingface-hub`"
        ) from exc

    print(f"[HuggingFace] Downloading `nanmao/WalnutData` into {dest_dir} ...")
    snapshot_download(
        repo_id="nanmao/WalnutData",
        repo_type="dataset",
        local_dir=str(dest_dir),
    )
    return dest_dir


def remap_yolo_label_text(raw_text: str, remap_mode: str) -> str:
    """
    If remap_mode == 'unified', maps WalnutData classes 0..3 (A1, A2, B1, B2)
    to class 0 ('walnut_green').
    """
    out_lines: list[str] = []
    for line in raw_text.splitlines():
        parts = line.strip().split()
        if len(parts) < 5:
            continue
        if remap_mode == "unified":
            parts[0] = "0"
        out_lines.append(" ".join(parts))
    return "\n".join(out_lines) + ("\n" if out_lines else "")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import 1wuming/WalnutData (Hugging Face nanmao/WalnutData) into YOLO11 canopy dataset"
    )
    parser.add_argument(
        "--source",
        type=str,
        default=None,
        help="Path to local extracted WalnutData folder",
    )
    parser.add_argument(
        "--download-hf",
        action="store_true",
        help="Download nanmao/WalnutData directly from Hugging Face Hub",
    )
    parser.add_argument(
        "--remap-mode",
        choices=["unified", "keep_4_classes"],
        default="unified",
        help="'unified' maps A1/A2/B1/B2 -> 0 (walnut_green); 'keep_4_classes' preserves 0..3",
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=0,
        help="Optional cap on number of images to import (0 = import all, e.g. 3000 for fast iteration)",
    )
    args = parser.parse_args()

    builder_root = Path(__file__).resolve().parent
    yolo_root = builder_root.parent
    target_root = yolo_root / "datasets" / "walnut_canopy"

    if args.download_hf:
        source_dir = download_from_huggingface(builder_root / "walnutdata_hf_raw")
    elif args.source:
        source_dir = Path(args.source).resolve()
    else:
        print(
            "Please provide either `--source <path/to/WalnutData>` or `--download-hf`.\n"
            "Example:\n"
            "  python yolo/dataset_builder/4_import_walnutdata_hf.py --source C:/Users/uyko7/Downloads/WalnutData"
        )
        return

    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory not found: {source_dir}")

    all_images = [
        p for p in source_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ]
    label_lookup = {
        p.stem: p
        for p in source_dir.rglob("*.txt")
        if p.name.lower() not in {"classes.txt", "readme.txt"}
    }

    paired = [
        (img_p, label_lookup[img_p.stem])
        for img_p in all_images
        if img_p.stem in label_lookup
    ]

    print(
        f"[WalnutData Importer] Found {len(all_images)} images and {len(paired)} matched YOLO label files."
    )
    if not paired:
        print(
            "[!] No .txt labels matched yet. Check if the archive inside WalnutData (.zip/.tar) needs extracting first."
        )
        return

    random.seed(42)
    random.shuffle(paired)
    if args.max_samples > 0:
        paired = paired[: args.max_samples]
        print(f"[WalnutData Importer] Subsampled to {len(paired)} images (--max-samples={args.max_samples}).")

    n = len(paired)
    n_train = int(n * 0.80)
    n_val = int(n * 0.15)
    splits = {
        "train": paired[:n_train],
        "val": paired[n_train : n_train + n_val],
        "test": paired[n_train + n_val :],
    }

    for split_name, items in splits.items():
        img_out = target_root / "images" / split_name
        lbl_out = target_root / "labels" / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img_src, lbl_src in items:
            shutil.copy2(img_src, img_out / img_src.name)
            raw_txt = lbl_src.read_text(encoding="utf-8", errors="ignore")
            remapped_txt = remap_yolo_label_text(raw_txt, args.remap_mode)
            (lbl_out / lbl_src.name).write_text(remapped_txt, encoding="utf-8")

    print(f"[✓] Imported {len(paired)} WalnutData pairs into {target_root} (mode={args.remap_mode})")
    print(
        f"    Train: {len(splits['train'])} | Val: {len(splits['val'])} | Test: {len(splits['test'])}"
    )
    print("[→] Ready to train YOLO11 Canopy Detector:")
    print("    python yolo/scripts/train.py --mode canopy --arch yolo11")


if __name__ == "__main__":
    main()


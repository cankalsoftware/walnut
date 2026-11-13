"""
WalnutIQ: Tree Care & AI Count — Kaggle Dataset Ingestion & Split Utility
-------------------------------------------------------------------------
Once you download a walnut dataset from Kaggle (or Roboflow), drop the extracted
folder anywhere and run:

  python yolo/scripts/prepare_kaggle_dataset.py --source /path/to/kaggle_folder --task canopy
  python yolo/scripts/prepare_kaggle_dataset.py --source /path/to/kaggle_folder --task ground

What this script does:
1. Scans `--source` for all image files (.jpg, .jpeg, .png, .webp) and matching YOLO `.txt` labels.
2. Automatically creates the target structure expected by `yolo/configs/walnut_canopy.yaml` or `walnut_ground.yaml`:
   - yolo/datasets/walnut_<task>/images/{train,val,test}
   - yolo/datasets/walnut_<task>/labels/{train,val,test}
3. Splits the dataset 80% train / 15% val / 5% test (deterministic seed=42) and copies files over.
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare a downloaded Kaggle walnut dataset for YOLO training"
    )
    parser.add_argument(
        "--source",
        type=str,
        required=True,
        help="Path to the extracted Kaggle walnut dataset folder",
    )
    parser.add_argument(
        "--task",
        type=str,
        choices=["canopy", "ground"],
        default="canopy",
        help="Target model task: 'canopy' (in-tree count) or 'ground' (harvest picker)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for 80/15/5 train/val/test split",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source).resolve()
    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory not found: {source_dir}")

    yolo_root = Path(__file__).resolve().parent.parent
    target_root = yolo_root / "datasets" / f"walnut_{args.task}"

    # Gather all images recursively
    all_images = [
        p
        for p in source_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ]

    if not all_images:
        raise RuntimeError(f"No images found inside {source_dir}")

    # Match labels by stem name
    label_lookup = {
        p.stem: p
        for p in source_dir.rglob("*.txt")
        if p.name.lower() not in {"classes.txt", "readme.txt", "requirements.txt"}
    }

    paired = []
    unlabeled = 0
    for img_path in all_images:
        lbl_path = label_lookup.get(img_path.stem)
        if lbl_path is not None:
            paired.append((img_path, lbl_path))
        else:
            unlabeled += 1

    print(f"[WalnutIQ Dataset Prep] Found {len(all_images)} images ({len(paired)} with YOLO .txt labels, {unlabeled} unlabeled).")

    if not paired:
        print(
            "[!] Note: No matching YOLO .txt labels were found. "
            "If this Kaggle dataset uses COCO (.json) or Pascal VOC (.xml), or is raw images, "
            "let us know the folder structure and we will convert the annotations automatically!"
        )
        return

    random.seed(args.seed)
    random.shuffle(paired)

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
            shutil.copy2(lbl_src, lbl_out / lbl_src.name)

    print(f"[✓] Dataset prepared at: {target_root}")
    print(
        f"    Train: {len(splits['train'])} | Val: {len(splits['val'])} | Test: {len(splits['test'])}"
    )
    print(f"[→] Ready to train: python yolo/scripts/train.py --task {args.task}")


if __name__ == "__main__":
    main()


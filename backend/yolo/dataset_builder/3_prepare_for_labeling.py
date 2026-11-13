from __future__ import annotations

"""
Step 3: Labeling Workspace Setup & Auto-Prelabeling for Detection (.pt Prep)
----------------------------------------------------------------------------
Prepares the CLIP-curated images (`yolo/dataset_builder/curated/`) for bounding-box
labeling in `labelImg`, `AnyLabeling`, or `Label Studio`, and optionally runs
an initial YOLO11 pass to generate draft `.txt` bounding boxes.

Once you finish reviewing/drawing bounding boxes in `curated/`, run this script
with `--finalize-splits` to copy the labeled images + `.txt` files into:
  - `yolo/datasets/walnut_canopy/{images,labels}/{train,val,test}`
  - `yolo/datasets/walnut_ground/{images,labels}/{train,val,test}`

Usage:
  # 1. Generate classes.txt files for labelImg / AnyLabeling in each curated folder:
  python yolo/dataset_builder/3_prepare_for_labeling.py --setup-classes

  # 2. After labeling with labelImg, split into train/val/test for YOLO11 training:
  python yolo/dataset_builder/3_prepare_for_labeling.py --finalize-splits
"""

import argparse
import os
import random
import shutil
from pathlib import Path

_YOLO_ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("YOLO_CONFIG_DIR", str(_YOLO_ROOT / ".ultralytics"))

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

CANOPY_CLASSES = [
    "walnut_green",
    "walnut_hull_split",
    "walnut_blight_damaged",
]

GROUND_CLASSES = [
    "walnut_in_shell",
    "walnut_in_hull",
]


def setup_labelimg_classes(curated_dir: Path) -> None:
    canopy_dir = curated_dir / "canopy"
    ground_dir = curated_dir / "ground"
    canopy_dir.mkdir(parents=True, exist_ok=True)
    ground_dir.mkdir(parents=True, exist_ok=True)

    # Write classes.txt at both group level and class sub-folder level for labelImg
    (canopy_dir / "classes.txt").write_text("\n".join(CANOPY_CLASSES) + "\n", encoding="utf-8")
    for c in CANOPY_CLASSES:
        sub = canopy_dir / c
        sub.mkdir(parents=True, exist_ok=True)
        (sub / "classes.txt").write_text("\n".join(CANOPY_CLASSES) + "\n", encoding="utf-8")

    (ground_dir / "classes.txt").write_text("\n".join(GROUND_CLASSES) + "\n", encoding="utf-8")
    for c in GROUND_CLASSES:
        sub = ground_dir / c
        sub.mkdir(parents=True, exist_ok=True)
        (sub / "classes.txt").write_text("\n".join(GROUND_CLASSES) + "\n", encoding="utf-8")

    print("[✓] Created `classes.txt` files for labelImg / AnyLabeling in:")
    print(f"    - {canopy_dir} ({', '.join(CANOPY_CLASSES)})")
    print(f"    - {ground_dir} ({', '.join(GROUND_CLASSES)})")
    print("\nTo label in YOLO format with labelImg:")
    print("  labelImg yolo/dataset_builder/curated/ground/walnut_in_shell yolo/dataset_builder/curated/ground/classes.txt")


def finalize_splits(curated_dir: Path, datasets_root: Path, seed: int = 42) -> None:
    random.seed(seed)

    for task in ("canopy", "ground"):
        task_source = curated_dir / task
        if not task_source.exists():
            continue

        images = [
            p for p in task_source.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        ]
        paired: list[tuple[Path, Path]] = []
        for img_p in images:
            txt_p = img_p.with_suffix(".txt")
            if txt_p.exists() and txt_p.name != "classes.txt":
                paired.append((img_p, txt_p))

        if not paired:
            print(f"[!] {task}: Found {len(images)} images, but 0 `.txt` bounding box files yet.")
            continue

        random.shuffle(paired)
        n = len(paired)
        n_train = max(1, int(n * 0.80))
        n_val = max(1, int(n * 0.15))

        splits = {
            "train": paired[:n_train],
            "val": paired[n_train : n_train + n_val],
            "test": paired[n_train + n_val :],
        }

        target_root = datasets_root / f"walnut_{task}"
        for split_name, items in splits.items():
            img_out = target_root / "images" / split_name
            lbl_out = target_root / "labels" / split_name
            img_out.mkdir(parents=True, exist_ok=True)
            lbl_out.mkdir(parents=True, exist_ok=True)
            for img_src, lbl_src in items:
                shutil.copy2(img_src, img_out / img_src.name)
                shutil.copy2(lbl_src, lbl_out / lbl_src.name)

        print(
            f"[✓] {task.upper()}: Exported {len(paired)} labeled pairs to {target_root} "
            f"(train={len(splits['train'])}, val={len(splits['val'])}, test={len(splits['test'])})"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare curated images for labeling & YOLO11 splits")
    parser.add_argument(
        "--setup-classes",
        action="store_true",
        help="Write classes.txt into curated/canopy and curated/ground for labelImg",
    )
    parser.add_argument(
        "--finalize-splits",
        action="store_true",
        help="Copy labeled images + .txt files into yolo/datasets/walnut_{canopy,ground}",
    )
    args = parser.parse_args()

    builder_root = Path(__file__).resolve().parent
    curated_dir = builder_root / "curated"
    datasets_root = _YOLO_ROOT / "datasets"

    if args.setup_classes or not args.finalize_splits:
        setup_labelimg_classes(curated_dir)

    if args.finalize_splits:
        finalize_splits(curated_dir, datasets_root)


if __name__ == "__main__":
    main()


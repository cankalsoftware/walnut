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
import hashlib
import os
import random
import shutil
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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


def setup_labelimg_classes(curated_dir: Path, target: str = "all") -> None:
    curated_dir.mkdir(parents=True, exist_ok=True)
    if target in ("all", "canopy"):
        canopy_dir = curated_dir / "canopy"
        canopy_dir.mkdir(parents=True, exist_ok=True)
        (canopy_dir / "classes.txt").write_text("\n".join(CANOPY_CLASSES) + "\n", encoding="utf-8")
        for c in CANOPY_CLASSES:
            sub = canopy_dir / c
            sub.mkdir(parents=True, exist_ok=True)
            (sub / "classes.txt").write_text("\n".join(CANOPY_CLASSES) + "\n", encoding="utf-8")
        print(f"[Labeling] Created classes.txt in {canopy_dir} ({', '.join(CANOPY_CLASSES)})", flush=True)

    if target in ("all", "ground"):
        ground_dir = curated_dir / "ground"
        ground_dir.mkdir(parents=True, exist_ok=True)
        (ground_dir / "classes.txt").write_text("\n".join(GROUND_CLASSES) + "\n", encoding="utf-8")
        for c in GROUND_CLASSES:
            sub = ground_dir / c
            sub.mkdir(parents=True, exist_ok=True)
            (sub / "classes.txt").write_text("\n".join(GROUND_CLASSES) + "\n", encoding="utf-8")
        print(f"[Labeling] Created classes.txt in {ground_dir} ({', '.join(GROUND_CLASSES)})", flush=True)

    if target == "all":
        all_classes = CANOPY_CLASSES + GROUND_CLASSES
        (curated_dir / "classes.txt").write_text("\n".join(all_classes) + "\n", encoding="utf-8")
        print(f"[Labeling] Created combined classes.txt in {curated_dir}", flush=True)


def finalize_splits(curated_dir: Path, datasets_root: Path, target: str = "all", seed: int = 42) -> None:
    random.seed(seed)
    tasks = ("canopy", "ground") if target == "all" else (target,)

    for task in tasks:
        task_source = curated_dir / task
        if not task_source.exists():
            print(f"[Labeling] {task}: Folder {task_source} does not exist yet.", flush=True)
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
            print(f"[Labeling] {task}: Found {len(images)} images, but 0 `.txt` bounding box files yet.", flush=True)
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

        # Index existing images across train/val/test to prevent overwriting different images
        # or duplicating identical images across splits on subsequent runs.
        existing_by_name: dict[str, tuple[str, Path]] = {}
        for split_name in ("train", "val", "test"):
            split_img_dir = target_root / "images" / split_name
            if split_img_dir.exists():
                for existing_img in split_img_dir.iterdir():
                    if existing_img.is_file():
                        existing_by_name[existing_img.name] = (split_name, existing_img)

        added_new = 0
        updated_existing = 0
        renamed_collisions = 0

        for split_name, items in splits.items():
            img_out = target_root / "images" / split_name
            lbl_out = target_root / "labels" / split_name
            img_out.mkdir(parents=True, exist_ok=True)
            lbl_out.mkdir(parents=True, exist_ok=True)
            for img_src, lbl_src in items:
                src_size = img_src.stat().st_size
                existing = existing_by_name.get(img_src.name)

                if existing is not None:
                    existing_split, existing_path = existing
                    if existing_path.stat().st_size == src_size:
                        # Same image & size: update its label in its original split (no duplicate)
                        existing_lbl_dir = target_root / "labels" / existing_split
                        existing_lbl_dir.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(lbl_src, existing_lbl_dir / lbl_src.name)
                        updated_existing += 1
                        continue

                    # Same filename but DIFFERENT file size -> treat as a new image with hash prefix
                    file_hash = hashlib.md5(img_src.read_bytes()).hexdigest()[:8]
                    dest_img_name = f"{file_hash}_{img_src.name}"
                    dest_lbl_name = f"{Path(dest_img_name).stem}.txt"
                    # If that prefixed name also already exists with same size, just update label
                    if dest_img_name in existing_by_name:
                        ex_sp, ex_p = existing_by_name[dest_img_name]
                        if ex_p.stat().st_size == src_size:
                            ex_lbl_dir = target_root / "labels" / ex_sp
                            ex_lbl_dir.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(lbl_src, ex_lbl_dir / dest_lbl_name)
                            updated_existing += 1
                            continue
                    renamed_collisions += 1
                else:
                    dest_img_name = img_src.name
                    dest_lbl_name = lbl_src.name

                dest_img_path = img_out / dest_img_name
                shutil.copy2(img_src, dest_img_path)
                shutil.copy2(lbl_src, lbl_out / dest_lbl_name)
                existing_by_name[dest_img_name] = (split_name, dest_img_path)
                added_new += 1

        print(
            f"[Labeling] {task.upper()}: Processed {len(paired)} labeled pairs into {target_root} "
            f"(new={added_new}, updated={updated_existing}, renamed_diff_size={renamed_collisions})",
            flush=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare curated images for labeling & YOLO11 splits")
    parser.add_argument(
        "--target",
        type=str,
        choices=["all", "ground", "canopy"],
        default="all",
        help="Target section to prepare/split: all, ground, or canopy (default: all)",
    )
    parser.add_argument(
        "--setup-classes",
        action="store_true",
        help="Write classes.txt into CLIP_Curated/canopy and CLIP_Curated/ground for labelImg",
    )
    parser.add_argument(
        "--finalize-splits",
        action="store_true",
        help="Copy labeled images + .txt files into yolo/datasets/walnut_{canopy,ground}",
    )
    args = parser.parse_args()

    builder_root = Path(__file__).resolve().parent
    curated_dir = builder_root / "CLIP_Curated"
    datasets_root = _YOLO_ROOT / "datasets"

    if args.setup_classes or not args.finalize_splits:
        setup_labelimg_classes(curated_dir, target=args.target)

    if args.finalize_splits:
        finalize_splits(curated_dir, datasets_root, target=args.target)


if __name__ == "__main__":
    main()


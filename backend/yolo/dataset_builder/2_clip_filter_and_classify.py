from __future__ import annotations

"""
Step 2: Zero-Shot CLIP Image Filtering & Auto-Classification
------------------------------------------------------------
Integrates https://github.com/ultralytics/CLIP (or open_clip) to automatically:
  1. Reject non-orchard junk images from web scraping (e.g., walnut wood furniture,
     walnut cake/food recipes, packaged supermarket nuts, text charts).
  2. Classify valid walnut photos into our exact target classes:
     - canopy/walnut_green
     - canopy/walnut_hull_split
     - canopy/walnut_blight_damaged
     - ground/walnut_in_shell
     - ground/walnut_in_hull
  3. Optionally export a ready-to-train YOLO11-cls (`yolo11n-cls.pt`) classification
     dataset inside `yolo/datasets/walnut_classify/`.

Usage:
  python yolo/dataset_builder/2_clip_filter_and_classify.py --export-yolo-cls
"""

import argparse
import hashlib
import json
import random
import shutil
import sys
from pathlib import Path
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Positive orchard prompts mapped to (target_group, class_name)
POSITIVE_PROMPTS: list[tuple[str, str, str]] = [
    (
        "canopy",
        "walnut_green",
        "a photo of intact green walnuts hanging on a walnut tree branch with green leaves in an orchard",
    ),
    (
        "canopy",
        "walnut_hull_split",
        "a photo of a ripening walnut on a tree with its green outer hull cracking or splitting open",
    ),
    (
        "canopy",
        "walnut_blight_damaged",
        "a photo of a diseased walnut on a tree with black blight spots or rotten dark husk damage",
    ),
    (
        "ground",
        "walnut_in_shell",
        "a photo of fallen brown walnuts in their hard wrinkled shells lying on soil, grass, or autumn leaves",
    ),
    (
        "ground",
        "walnut_in_hull",
        "a photo of fallen walnuts on the ground still inside green or dark decaying husks among leaves",
    ),
]

# Negative prompts to filter out noisy web search results
NEGATIVE_PROMPTS: list[str] = [
    "a photo of wooden furniture, walnut wood planks, tables, or flooring",
    "a photo of baked food, walnut cake, brownies, salad, or kitchen recipes",
    "a photo of plastic retail packaging, nutrition labels, charts, or text documents",
    "a studio product photo of shelled walnut kernels in a white bowl",
]


def resolve_unique_dest(dest_dir: Path, src_path: Path) -> tuple[Path, bool]:
    """
    Returns (destination_path, already_exists_same_size).
    If a file with the same name exists:
      - same size -> reuse existing (skip duplicate copy)
      - different size -> prefix with 8-char MD5 hash so new image is not lost
    """
    src_size = src_path.stat().st_size
    candidate = dest_dir / src_path.name
    if not candidate.exists():
        return candidate, False
    if candidate.stat().st_size == src_size:
        return candidate, True

    file_hash = hashlib.md5(src_path.read_bytes()).hexdigest()[:8]
    prefixed = dest_dir / f"{file_hash}_{src_path.name}"
    if prefixed.exists() and prefixed.stat().st_size == src_size:
        return prefixed, True
    return prefixed, False


def load_clip_Backend():
    """
    Loads Ultralytics CLIP (`git+https://github.com/ultralytics/CLIP.git`)
    or falls back to `open_clip` if installed.
    """
    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        import clip  # type: ignore[import-not-found]  # ultralytics/CLIP

        model, preprocess = clip.load("ViT-B/32", device=device)
        tokenize = clip.tokenize
        print(f"[CLIP] Loaded ultralytics/CLIP (ViT-B/32) on {device}")
        return model, preprocess, tokenize, device
    except ImportError:
        try:
            import open_clip  # type: ignore[import-not-found]

            model, _, preprocess = open_clip.create_model_and_transforms(
                "ViT-B-32", pretrained="laion2b_s34b_b79k", device=device
            )
            tokenizer = open_clip.get_tokenizer("ViT-B-32")
            print(f"[CLIP] Loaded open_clip (ViT-B-32) on {device}")
            return model, preprocess, tokenizer, device
        except ImportError:
            return None, None, None, device


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Filter scraped images and auto-classify using Zero-Shot CLIP"
    )
    parser.add_argument(
        "--target",
        type=str,
        choices=["all", "ground", "canopy"],
        default="all",
        help="Which scraped section to filter: all, ground, or canopy (default: all)",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Input folder of raw scraped images (defaults to yolo/dataset_builder/raw_scraped)",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=0.28,
        help="Minimum CLIP positive score to accept an image (default: 0.28)",
    )
    parser.add_argument(
        "--export-yolo-cls",
        action="store_true",
        help="Also build yolo/datasets/walnut_classify/{train,val} for YOLO11-cls training",
    )
    args = parser.parse_args()

    builder_root = Path(__file__).resolve().parent
    yolo_root = builder_root.parent
    raw_dir = Path(args.input).resolve() if args.input else (builder_root / "raw_scraped")
    curated_dir = builder_root / "CLIP_Curated"
    rejected_dir = builder_root / "rejected_by_clip"

    if not raw_dir.exists():
        print(f"[!] Input directory {raw_dir} does not exist yet. Run `1_scrape_images.py` first.")
        sys.exit(1)

    scan_dir = (
        raw_dir / args.target
        if args.target != "all" and (raw_dir / args.target).exists()
        else raw_dir
    )

    all_images = [
        p for p in scan_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ]
    if not all_images:
        print(f"[!] No images found in {scan_dir} for target '{args.target}'.")
        sys.exit(1)

    active_positive_prompts = (
        POSITIVE_PROMPTS
        if args.target == "all"
        else [p for p in POSITIVE_PROMPTS if p[0] == args.target]
    )

    print(
        f"[CLIP] Target section: {args.target} | Confidence >= {args.confidence} | "
        f"Source: {scan_dir} ({len(all_images)} images)",
        flush=True,
    )
    print("[CLIP] Loading CLIP ViT-B/32 model...", flush=True)

    model, preprocess, tokenize, device = load_clip_Backend()
    if model is None:
        print(
            "[!] Neither `clip` nor `open_clip` is installed yet.\n"
            "    Install Ultralytics CLIP with:\n"
            "    python -m pip install ftfy regex git+https://github.com/ultralytics/CLIP.git"
        )
        sys.exit(1)

    import torch

    all_prompt_texts = [p[2] for p in active_positive_prompts] + NEGATIVE_PROMPTS
    num_positive = len(active_positive_prompts)

    with torch.no_grad():
        text_tokens = tokenize(all_prompt_texts).to(device)
        text_features = model.encode_text(text_tokens)
        text_features /= text_features.norm(dim=-1, keepdim=True)

    kept_records: list[dict] = []
    rejected_count = 0
    total_images = len(all_images)

    for idx, img_path in enumerate(all_images, 1):
        try:
            pil_img = Image.open(img_path).convert("RGB")
            img_input = preprocess(pil_img).unsqueeze(0).to(device)
            with torch.no_grad():
                image_features = model.encode_image(img_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)
                probs = (100.0 * image_features @ text_features.T).softmax(dim=-1).cpu().numpy()[0]

            best_idx = int(probs.argmax())
            best_score = float(probs[best_idx])

            # Reject if a negative prompt won or confidence is below threshold
            if best_idx >= num_positive or best_score < args.confidence:
                target_rejected_dir = rejected_dir / args.target
                target_rejected_dir.mkdir(parents=True, exist_ok=True)
                rej_dest, rej_exists = resolve_unique_dest(target_rejected_dir, img_path)
                if not rej_exists:
                    shutil.copy2(img_path, rej_dest)
                rejected_count += 1
                decision_label = f"REJECTED ({best_score:.2f})"
            else:
                target_group, class_name, _ = active_positive_prompts[best_idx]
                dest_folder = curated_dir / target_group / class_name
                dest_folder.mkdir(parents=True, exist_ok=True)
                dest_file, already_curated = resolve_unique_dest(dest_folder, img_path)
                if not already_curated:
                    shutil.copy2(img_path, dest_file)

                kept_records.append(
                    {
                        "file": str(dest_file.relative_to(builder_root)),
                        "target": target_group,
                        "class": class_name,
                        "clip_confidence": round(best_score, 4),
                    }
                )
                decision_label = f"{target_group}/{class_name} ({best_score:.2f})"

            if idx == 1 or idx % 5 == 0 or idx == total_images:
                pct = int((idx / total_images) * 100)
                print(
                    f"[CLIP] Progress {idx}/{total_images} ({pct}%) | "
                    f"Accepted: {len(kept_records)} | Rejected: {rejected_count} | "
                    f"{img_path.name} -> {decision_label}",
                    flush=True,
                )
        except Exception as exc:
            print(f"  [CLIP Skip] {img_path.name}: {exc}", flush=True)

    report_path = builder_root / "clip_classification_report.json"
    combined_records = kept_records
    if args.target != "all" and report_path.exists():
        try:
            existing = json.loads(report_path.read_text(encoding="utf-8"))
            if isinstance(existing, list):
                kept_files = {r["file"] for r in kept_records}
                preserved = [
                    r for r in existing
                    if isinstance(r, dict) and r.get("target") != args.target and r.get("file") not in kept_files
                ]
                combined_records = preserved + kept_records
        except Exception:
            combined_records = kept_records

    report_path.write_text(json.dumps(combined_records, indent=2), encoding="utf-8")

    print(f"\n[✓] CLIP Zero-Shot Filtering Complete! (section: {args.target})")
    print(f"    Accepted & Sorted: {len(kept_records)} orchard images -> {curated_dir}")
    print(f"    Rejected Junk:     {rejected_count} images -> {rejected_dir / args.target}")
    print(f"    Report saved to:   {report_path}")

    if args.export_yolo_cls and combined_records:
        cls_root = yolo_root / "datasets" / "walnut_classify"
        random.seed(42)
        by_class: dict[str, list[Path]] = {}
        for rec in combined_records:
            rec_path = builder_root / rec["file"]
            if rec_path.exists():
                by_class.setdefault(rec["class"], []).append(rec_path)

        for cls_name, files in by_class.items():
            existing_cls_files: dict[str, Path] = {}
            for sp in ("train", "val"):
                sp_dir = cls_root / sp / cls_name
                if sp_dir.exists():
                    for ef in sp_dir.iterdir():
                        if ef.is_file():
                            existing_cls_files[ef.name] = ef

            random.shuffle(files)
            n_train = max(1, int(len(files) * 0.8))
            splits = {"train": files[:n_train], "val": files[n_train:] or files[:1]}
            for split_name, split_files in splits.items():
                out_d = cls_root / split_name / cls_name
                out_d.mkdir(parents=True, exist_ok=True)
                for f in split_files:
                    ex = existing_cls_files.get(f.name)
                    if ex is not None:
                        if ex.stat().st_size == f.stat().st_size:
                            continue  # Already exported in train/val; skip duplicate
                        dest_cls_file, exists_prefixed = resolve_unique_dest(out_d, f)
                        if not exists_prefixed:
                            shutil.copy2(f, dest_cls_file)
                    else:
                        shutil.copy2(f, out_d / f.name)
                        existing_cls_files[f.name] = out_d / f.name

        print(f"[✓] Exported YOLO11-cls dataset to: {cls_root}")
        print("    Train classifier with: python yolo/scripts/train.py --mode classify --arch yolo11")


if __name__ == "__main__":
    main()


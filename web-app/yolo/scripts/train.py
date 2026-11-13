"""
WalnutIQ: Tree Care & AI Count — Unified YOLO Training Script
Supports YOLOv8, YOLO11, and YOLO26 architectures for:
  1. 'canopy' (In-tree walnut counting — defaults to 's' small scale for dense occluded clusters)
  2. 'ground' (Post-harvest ground walnut finder — defaults to 'n' nano scale for 30-60 FPS mobile sweeps)
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

# Keep Ultralytics settings & cache inside the project workspace
_YOLO_ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("YOLO_CONFIG_DIR", str(_YOLO_ROOT / ".ultralytics"))

from ultralytics import YOLO


def resolve_checkpoint(arch: str, size: str | None, mode: str, custom_model: str | None) -> str:
    if custom_model:
        return custom_model
    if mode == "classify":
        chosen_size = size if size else "n"
        return f"{arch}{chosen_size}-cls.pt"
    # Recommended defaults: 's' for small canopy nuts in foliage, 'n' for fast ground picking
    chosen_size = size if size else ("s" if mode == "canopy" else "n")
    return f"{arch}{chosen_size}.pt"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train YOLOv8 / YOLO11 / YOLO26 models for WalnutIQ: Tree Care & AI Count"
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["canopy", "ground", "classify"],
        required=True,
        help="Detector target: 'canopy' (in-tree count), 'ground' (fallen nut picker), or 'classify' (YOLO11-cls)",
    )
    parser.add_argument(
        "--arch",
        type=str,
        choices=["yolov8", "yolo11", "yolo26"],
        default="yolo11",
        help="YOLO architecture family: defaults to 'yolo11' (https://github.com/ultralytics/ultralytics)",
    )
    parser.add_argument(
        "--size",
        type=str,
        choices=["n", "s", "m"],
        default=None,
        help="Model scale: 'n' (Nano), 's' (Small), 'm' (Medium). Defaults to 's' for canopy, 'n' for ground.",
    )
    parser.add_argument(
        "--weights",
        type=str,
        default=None,
        help="Optional path to Kaggle/Roboflow pretrained .pt checkpoint to fine-tune from",
    )
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image resolution (640 or 960)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    args = parser.parse_args()

    yolo_dir = Path(__file__).resolve().parent.parent
    config_map = {
        "canopy": yolo_dir / "configs" / "walnut_canopy.yaml",
        "ground": yolo_dir / "configs" / "walnut_ground.yaml",
        "classify": yolo_dir / "datasets" / "walnut_classify",
    }
    data_yaml = config_map[args.mode]
    checkpoint = resolve_checkpoint(args.arch, args.size, args.mode, args.weights)

    print(f"[WalnutIQ YOLO] Mode: {args.mode} | Checkpoint: {checkpoint} | Config: {data_yaml}")
    model = YOLO(checkpoint)

    # Augmentations tuned specifically for canopy foliage vs ground leaf-litter
    is_ground = args.mode == "ground"
    results = model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(yolo_dir / "runs"),
        name=f"walnut_{args.mode}_{args.arch}",
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.5 if is_ground else 0.4,
        mosaic=1.0,
        mixup=0.15 if is_ground else 0.1,
        flipud=0.5 if is_ground else 0.0,
        degrees=45.0 if is_ground else 10.0,
    )

    print(f"[WalnutIQ YOLO] Training complete! Results saved to: {results.save_dir}")
    print(
        f"Next step: Run `python yolo/scripts/export_weights.py --mode {args.mode} "
        f"--weights {Path(results.save_dir) / 'weights' / 'best.pt'}`"
    )


if __name__ == "__main__":
    main()

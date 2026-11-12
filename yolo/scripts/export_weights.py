"""
Walnut Analysis — Mobile Weight Exporter
Copies your trained .pt file into the root /weights folder, exports mobile-ready
TFLite/ONNX formats, and updates /weights/manifest.json for the Expo app.
"""

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage and export trained YOLO weights to /weights")
    parser.add_argument(
        "--mode",
        type=str,
        choices=["canopy", "ground"],
        required=True,
        help="Target detector mode: 'canopy' or 'ground'",
    )
    parser.add_argument(
        "--weights",
        type=str,
        required=True,
        help="Path to the trained PyTorch .pt weight file",
    )
    parser.add_argument(
        "--format",
        type=str,
        choices=["tflite", "onnx", "pt_only"],
        default="tflite",
        help="Mobile export format (default: tflite)",
    )
    parser.add_argument("--imgsz", type=int, default=640, help="Inference input resolution")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent.parent
    weights_root = repo_root / "weights"
    target_dir = weights_root / args.mode
    target_dir.mkdir(parents=True, exist_ok=True)

    source_pt = Path(args.weights).resolve()
    if not source_pt.exists():
        raise FileNotFoundError(f"Trained weight file not found: {source_pt}")

    dest_pt = target_dir / f"walnut_{args.mode}.pt"
    shutil.copy2(source_pt, dest_pt)
    print(f"[Weights] Copied master PyTorch weight to: {dest_pt}")

    exported_mobile_file = dest_pt.name
    if args.format != "pt_only":
        try:
            from ultralytics import YOLO

            model = YOLO(str(dest_pt))
            export_path = model.export(format=args.format, imgsz=args.imgsz, half=True)
            exported_mobile_file = Path(export_path).name
            print(f"[Weights] Exported mobile weight: {export_path}")
        except Exception as exc:
            print(f"[Weights] Note: Mobile export skipped or requires runtime deps ({exc}). Kept .pt file.")

    manifest_path = weights_root / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {"models": {}}

    manifest["updatedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["models"][args.mode] = {
        "ptFile": f"weights/{args.mode}/{dest_pt.name}",
        "mobileFile": f"weights/{args.mode}/{exported_mobile_file}",
        "inputSize": args.imgsz,
        "ready": True,
        "updatedAt": manifest["updatedAt"],
    }

    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"[Weights] Updated {manifest_path}")


if __name__ == "__main__":
    main()


# WalnutIQ: Tree Care & AI Count — YOLO Training Workspace (`yolo/`)

Supports **YOLOv8**, **YOLO11**, and **YOLO26** for training or fine-tuning Kaggle/Roboflow walnut datasets into mobile weights stored in `../weights/`.

---

## Which YOLO Model Should You Use for Tree vs. Ground?

1. **In-Tree Canopy Counter (`--mode canopy`)**:
   - **Best Choice**: **`YOLO26s` (`yolo26s.pt`) or `YOLO11s` (`yolo11s.pt`)** at `imgsz=640` (or `960`).
   - **Why**: Walnuts in the tree grow in tight clusters of 2–5 green nuts camouflaged against green leaves.
     - **YOLO26** uses **NMS-free end-to-end inference + STAL (Small-Target-Aware Label Assignment)**, preventing touching walnuts in a cluster from suppressing each other during Non-Maximum Suppression.
     - **YOLO11** adds the **C2PSA Spatial Attention** block, which excels at separating spherical green walnut husks from leafy backgrounds.

2. **Post-Harvest Ground Walnut Finder (`--mode ground`)**:
   - **Best Choice**: **`YOLO26n` (`yolo26n.pt`) or `YOLO11n` (`yolo11n.pt`)** (Nano scale) at `imgsz=640`.
   - **Why**: Ground picking requires **30–60 FPS real-time camera sweeps** while walking over fallen leaves, grass, and hulls. Because the camera is close to the ground (`0.5m–2m`), the Nano model achieves `>95%` accuracy while running ultra-fast on Android phones.

---

## Quick Start Commands

```bash
# 1. Install dependencies
pip install -r yolo/requirements.txt

# 2. Train Canopy Counter (defaults to yolo26s.pt, or pass --arch yolo11 / yolov8)
python yolo/scripts/train.py --mode canopy --arch yolo26 --size s --epochs 120 --imgsz 640

# 3. Or fine-tune from a Kaggle pretrained .pt file
python yolo/scripts/train.py --mode canopy --weights path/to/kaggle_pretrained.pt --epochs 80

# 4. Train Ground Harvest Finder (defaults to yolo26n.pt for fast mobile inference)
python yolo/scripts/train.py --mode ground --arch yolo26 --size n --epochs 100 --imgsz 640

# 5. Export trained .pt to /weights folder (.pt + .tflite + manifest.json)
python yolo/scripts/export_weights.py --mode canopy --weights yolo/runs/walnut_canopy_yolo26/weights/best.pt
python yolo/scripts/export_weights.py --mode ground --weights yolo/runs/walnut_ground_yolo26/weights/best.pt
```

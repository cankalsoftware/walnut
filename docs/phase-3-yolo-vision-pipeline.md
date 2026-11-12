# Phase 3: YOLO Vision Pipeline — YOLOv8 vs. YOLO11 vs. YOLO26 & Dataset Guide

> **Status**: Active Blueprint  
> **Goal**: Select the optimal YOLO architecture (`YOLOv8`, `YOLO11`, or `YOLO26`), leverage Kaggle/Roboflow pretrained datasets, and deploy separate specialized weights in `/weights` for **In-Tree Canopy Counting** and **Post-Harvest Ground Picking**.

---

## 1. Model Architecture Review: YOLOv8 vs. YOLO11 vs. YOLO26 for Walnuts

You mentioned evaluating **YOLOv8**, **YOLO11**, or **YOLO26** (Ultralytics' latest generation) for training on Kaggle/local hardware and exporting `.pt` → mobile weights. Here is how they compare specifically for **tree canopy walnuts** and **fallen ground walnuts**:

| Architecture | Key Technical Advantage | Canopy Counter (Green-on-Green Small Objects) | Ground Harvest Finder (Brown-on-Leaves Real-Time Sweep) | Mobile TFLite / ONNX Export |
| :--- | :--- | :--- | :--- | :--- |
| **YOLOv8 (`yolov8n` / `yolov8s`)** | Battle-tested C2f backbone; widest community tutorial & export support | Good baseline, but can miss partially occluded green walnuts behind leaves | Very fast (`~18ms` on mobile GPU), reliable for clear fallen nuts | Rock-solid TFLite FP16/INT8 & ONNX export |
| **YOLO11 (`yolo11n` / `yolo11s`)** *(Strong All-Rounder)* | C3k2 + **C2PSA (Spatial Attention)** module; 22% fewer parameters than v8m with higher mAP | **Excellent** — the C2PSA spatial attention block specifically helps distinguish round green walnut husks from surrounding green walnut leaflets | **Excellent** — high recall on partially leaf-covered walnuts on the ground | Native Ultralytics export to `.tflite` and `.onnx` |
| **YOLO26 (`yolo26n` / `yolo26s`)** *(Best Edge & Small-Object Choice)* | **NMS-Free End-to-End** design + **ProgLoss + STAL (Small-Target-Aware Label Assignment)** | **Best in Class for Canopy** — STAL dramatically improves detection of tiny, distant walnuts high in the upper tree crown, and NMS-free inference prevents dense walnut clusters (3–5 nuts touching) from suppressing each other! | **Best in Class for Mobile Edge** — NMS-free output eliminates post-processing NMS bottlenecks on Android phones | Simpler output tensor (no custom NMS worklet needed in React Native!) |

### Expert Recommendation for Your Two Models:

1. **For Mode 1 — In-Tree Canopy Counter (`weights/canopy/`)**:
   - **Recommended Model**: **`yolo26s.pt` or `yolo11s.pt` trained at `imgsz=640` (or `960` for high-canopy shots)**.
   - **Why**: Walnuts grow in tight clusters of 2–5 nuts and share the exact same chlorophyll green color as the leaves until hull split.
     - **YOLO11's C2PSA spatial attention** focuses on the spherical specular highlight of the walnut husk.
     - **YOLO26's NMS-free end-to-end head + STAL** prevents adjacent touching walnuts in a cluster from having their bounding boxes merged or suppressed by Non-Maximum Suppression (NMS), which is the #1 cause of undercounting in orchard fruit/nut detection!

2. **For Mode 2 — Ground Harvest Finder (`weights/ground/`)**:
   - **Recommended Model**: **`yolo26n.pt` or `yolo11n.pt` (Nano size) exported to `FP16` / `INT8` TFLite at `imgsz=640`**.
   - **Why**: When picking walnuts off the ground, the user is walking and sweeping the phone camera continuously. You want **30–60 FPS zero-lag AR highlighting**. Since the camera is only `0.5m–2m` from the ground, the walnuts appear larger in frame (`40×40 px` to `120×120 px`), so the lightweight **Nano (`n`)** model achieves `>95%` mAP while running effortlessly on mid-range Android phones without heating the battery.

---

## 2. Kaggle & Roboflow Pretrained Data Strategy

Before labeling from scratch, you can accelerate training by combining existing public datasets on **Kaggle** and **Roboflow Universe**:

### 2.1 Datasets to Search & Combine
1. **Canopy Green Walnut Datasets**:
   - Search Kaggle & Roboflow Universe for:
     - `"green walnut detection"` / `"Juglans regia detection"`
     - `"walnut orchard canopy"` / `"walnut fruit detection YOLO"`
     - *Tip*: Green apple / green citrus / pistachio cluster datasets can also be used for **pre-training backbone weights** before fine-tuning on 300–500 walnut canopy images, because the spherical green-on-green leaf occlusion geometry is nearly identical.
2. **Ground Fallen Walnut Datasets**:
   - Search Kaggle & Roboflow Universe for:
     - `"walnut on ground"` / `"fallen walnut detection"` / `"walnut harvest"` / `"shell walnut dataset"`
   - **Crucial Augmentation for Ground Mode**: Fallen walnuts sit in harsh dappled shade mixed with dead brown walnut leaves and black hulls. In `yolo/scripts/train.py`, we enable:
     - `mosaic=1.0` & `mixup=0.15` (simulates walnuts partially buried under dead leaves)
     - `hsv_v=0.5` (trains the detector to handle both bright sunlit soil and deep tree shadow)
     - `degrees=180` / `flipud=0.5` (because ground camera orientation rotates freely as the user walks around the trunk)

---

## 3. Training & Staging Commands (`yolo/` → `weights/`)

Our updated `yolo/scripts/train.py` supports `--arch yolov8`, `--arch yolo11`, and `--arch yolo26`:

```bash
# 1. Train Canopy Counter (using YOLO11s or YOLO26s for dense clusters & small distant nuts)
python yolo/scripts/train.py --mode canopy --arch yolo26 --size s --epochs 120 --imgsz 640

# 2. Train Ground Harvest Finder (using YOLO11n or YOLO26n for fast 30+ FPS walking sweeps)
python yolo/scripts/train.py --mode ground --arch yolo26 --size n --epochs 100 --imgsz 640

# 3. Export & copy your trained .pt files into /weights/canopy and /weights/ground
python yolo/scripts/export_weights.py --mode canopy --weights yolo/runs/walnut_canopy/weights/best.pt
python yolo/scripts/export_weights.py --mode ground --weights yolo/runs/walnut_ground/weights/best.pt
```

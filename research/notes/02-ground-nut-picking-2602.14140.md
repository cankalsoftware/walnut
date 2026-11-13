# Paper Synthesis 02 — `arXiv:2602.14140` (On-Ground Nut Detection with YOLO11)

- **Title**: *Detection of On-Ground Chestnuts Using Artificial Intelligence Toward Automated Picking*
- **Authors**: Kaixuan Fang, Yuzhen Lu, Xinyang Mu
- **Paper URL**: https://arxiv.org/abs/2602.14140 (PDF: https://arxiv.org/pdf/2602.14140.pdf)
- **Subjects**: Computer Vision and Pattern Recognition (`cs.CV`); Artificial Intelligence (`cs.AI`)

---

## 1. Key Findings Relevant to WalnutIQ Mode 2 (Ground Harvest Finder)

1. **Orchard Floor Challenges**:
   - Detecting fallen brown nuts on orchard floors is challenging due to dappled canopy shadows, dried brown autumn leaves, soil clods, weeds, and partially split husks/burrs.
2. **YOLO11 Performance on Orchard Floors**:
   - The authors benchmarked 29 real-time detectors (including the **YOLOv11** family and RT-DETR).
   - **YOLO11** models (`yolo11n` / `yolo11s` for edge/mobile and `yolo11m` / `yolo11x` for high-accuracy benchmarks) demonstrated superior recall and real-time inference speed on small, camouflaged ground nuts compared to heavier transformer architectures.

---

## 2. How We Apply `arXiv:2602.14140` to WalnutIQ

1. **Architecture Selection (`yolo11n.pt`)**:
   - Validates our choice of **YOLO11** (`--arch yolo11`) for `walnut_ground.yaml`, where growers sweep their phone camera at waist height over soil, grass, and fallen walnut leaves.
2. **Data Augmentation Parameters in `yolo/scripts/train.py`**:
   - Following orchard-floor detection best practices, our ground training pipeline enables stronger brightness/shadow variance (`hsv_v=0.5`), vertical flips (`flipud=0.5`), rotational invariance (`degrees=45.0`), and `mosaic=1.0` + `mixup=0.15` to handle overlapping leaf litter and shadows.
3. **2-State Ground Taxonomy (`walnut_ground.yaml`)**:
   - `0: walnut_in_shell` (clean brown walnut shell on soil/grass/leaves)
   - `1: walnut_in_hull` (fallen walnut still inside green/black decaying husk)


# Paper Synthesis 01 — `arXiv:2502.20092v3` (`1wuming/WalnutData`)

- **Title**: *WalnutData: A UAV Remote Sensing Dataset of Green Walnuts and Model Evaluation*
- **Institution**: Laboratory of Computer Vision and Intelligent Perception, School of Information, Yunnan Normal University
- **Paper URL**: https://arxiv.org/html/2502.20092v3 (PDF: https://arxiv.org/pdf/2502.20092v3.pdf)
- **GitHub**: https://github.com/1wuming/WalnutData
- **Hugging Face**: https://huggingface.co/datasets/nanmao/WalnutData

---

## 1. Dataset Composition & 4-Class Taxonomy

The dataset contains **30,240 high-resolution canopy images** with **7,062,080 annotated green walnut bounding boxes** across 8 walnut orchard plots in Yangbi County, Dali, Yunnan.

Crucially, the authors divide green walnuts in the canopy into **4 lighting and occlusion classes**:
1. **`A1` (Front-lit, Unoccluded)**: Direct illumination, full green husk contour visible.
2. **`A2` (Backlit, Unoccluded)**: Against bright sky/sunlight; dark silhouette with high rim contrast.
3. **`B1` (Front-lit, Occluded)**: Partially hidden behind walnut leaflets or branches under front illumination.
4. **`B2` (Backlit, Occluded)**: Partially hidden behind foliage AND backlit (hardest detection case).

---

## 2. How We Apply `WalnutData` in WalnutIQ

1. **Direct Ingestion via `yolo/dataset_builder/4_import_walnutdata_hf.py`**:
   - Supports `--remap-mode unified` (mapping `A1, A2, B1, B2` → `0: walnut_green` to merge with `1: walnut_hull_split` and `2: walnut_blight_damaged`).
   - Supports `--remap-mode keep_4_classes` if we want to benchmark occlusion-aware canopy counting (`B1 + B2` ratio vs `A1 + A2` ratio).
2. **Empirical Occlusion Calibration**:
   - The ratio of occluded instances (`B1 + B2`) to unoccluded instances (`A1 + A2`) in `WalnutData` directly informs the canopy density occlusion multipliers (`1.35` open, `1.55` standard, `1.80` dense) in `weights/manifest.json` and `src/services/yoloService.ts`.


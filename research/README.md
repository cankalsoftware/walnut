# WalnutIQ Academic Research Vault (`research/`)

Because peer-reviewed computer vision research specifically targeting **walnut orchards (`Juglans regia`)** is scarce, this folder serves as:
1. Our **Literature & Benchmark Archive** (`research/papers/` & `research/notes/`)
2. Our **Proprietary WalnutIQ Research Lab** where we document our own dataset creation (Canopy + Ground + Hull-Split + Blight), YOLO11 model benchmarks, and Tuya microclimate sensor correlations.

---

## 1. Core Foundation Papers Stored in `research/`

| Paper ID | Title & Authors | Relevance to WalnutIQ | Links & Local Notes |
| :--- | :--- | :--- | :--- |
| **arXiv:2502.20092v3** | *WalnutData: A UAV Remote Sensing Dataset of Green Walnuts and Model Evaluation* (Yunnan Normal University) | **Mode 1 (Canopy Counter)**: 30,240 images & 7.06M annotated instances of green walnuts in tree canopies across 4 lighting & leaf-occlusion classes (`A1`, `A2`, `B1`, `B2`). | • [arXiv HTML](https://arxiv.org/html/2502.20092v3)<br>• [GitHub: 1wuming/WalnutData](https://github.com/1wuming/WalnutData)<br>• [Hugging Face: nanmao/WalnutData](https://huggingface.co/datasets/nanmao/WalnutData)<br>• [Technical Breakdown](./notes/01-canopy-walnutdata-2502.20092.md) |
| **arXiv:2602.14140** | *Detection of On-Ground Chestnuts Using Artificial Intelligence Toward Automated Picking* (Kaixuan Fang, Yuzhen Lu, Xinyang Mu) | **Mode 2 (Ground Harvest Picker)**: Benchmarks **YOLOv11** (`yolo11n` – `yolo11x`) on fallen orchard floor nuts amidst shadows, weeds, fallen leaves, and soil debris. | • [arXiv Abstract](https://arxiv.org/abs/2602.14140)<br>• [arXiv PDF](https://arxiv.org/pdf/2602.14140.pdf)<br>• [Technical Breakdown](./notes/02-ground-nut-picking-2602.14140.md) |

---

## 2. Why We Are Building Our Own WalnutIQ Dataset & Research

As shown by the literature gap:
- **`arXiv:2502.20092v3` (`1wuming/WalnutData`)** covers **green unripe walnuts in the canopy**, but does **not** include:
  - **Hull-split walnuts (`walnut_hull_split`)** needed to time harvest shaking and ethephon/water cutoffs.
  - **Walnut blight / husk fly damage (`walnut_blight_damaged`)** needed for tree health diagnostics.
  - **Fallen walnuts on the orchard floor (`walnut_in_shell`, `walnut_in_hull`)** after tree shaking.
- **`arXiv:2602.14140`** proves that **YOLO11** excels at detecting fallen brown nuts on complex orchard floors under leaf litter and shadows, but was trained on chestnuts rather than walnuts (`Juglans regia`).

Therefore, **WalnutIQ** bridges these two lines of research by building the first unified **Dual-Mode Walnut Vision Dataset** (`yolo/dataset_builder/` + `background/`) combining:
1. `1wuming/WalnutData` (30,240 canopy green walnut images)
2. Web-scraped + **Zero-Shot CLIP (`ultralytics/CLIP`)** curated + human-labeled (`labelImg`) images for **Ground Walnuts (`in_shell`, `in_hull`)**, **Hull-Split (`walnut_hull_split`)**, and **Walnut Blight (`walnut_blight_damaged`)**.
3. Field validation images captured directly from the **WalnutIQ Expo Mobile App** and synced via **Convex**.


# Trained Model Weights Directory (`weights/`)

Drop your trained YOLO files into the appropriate subfolder or use `python yolo/scripts/export_weights.py` to copy and quantize them automatically:

- **`weights/canopy/`**: Place your in-tree walnut counting weights here (`walnut_canopy.pt` / `walnut_canopy.tflite`).
- **`weights/ground/`**: Place your post-harvest ground picking weights here (`walnut_ground.pt` / `walnut_ground.tflite`).
- **`weights/manifest.json`**: Read by the Expo app to check model readiness, class labels, confidence thresholds, and occlusion multipliers.


import cv2
import os
import sys
from pathlib import Path

def main():
    project_root = Path(__file__).resolve().parent.parent.parent
    assets_dir = project_root / "core" / "assets"
    fixtures_dir = project_root / "core" / "test" / "fixtures"

    fixtures_dir.mkdir(parents=True, exist_ok=True)

    source_path = assets_dir / "test.png"
    if not source_path.exists():
        print(f"Error: {source_path} not found")
        sys.exit(1)

    img = cv2.imread(str(source_path))
    if img is None:
        print(f"Error: Failed to load {source_path}")
        sys.exit(1)

    print(f"Loaded {source_path}: shape={img.shape}")

    # Save frame.png (full image)
    frame_path = fixtures_dir / "frame.png"
    cv2.imwrite(str(frame_path), img)
    print(f"Saved {frame_path}")

    # Crop a template (e.g., 50x50 from center)
    h, w = img.shape[:2]
    cx, cy = w // 2, h // 2
    x1, y1 = cx - 25, cy - 25
    x2, y2 = cx + 25, cy + 25

    template = img[y1:y2, x1:x2]
    template_path = fixtures_dir / "template.png"
    cv2.imwrite(str(template_path), template)
    print(f"Saved {template_path}")

    # Also save a noise version for testing
    noise = img.copy()
    cv2.randn(noise, (0, 0, 0), (50, 50, 50))
    noise_path = fixtures_dir / "noise.png"
    # add noise
    noisy_img = cv2.add(img, noise)
    cv2.imwrite(str(noise_path), noisy_img)
    print(f"Saved {noise_path}")

if __name__ == "__main__":
    main()

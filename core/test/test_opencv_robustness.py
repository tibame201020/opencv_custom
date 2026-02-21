import pytest
import cv2
import numpy as np
import os
import sys
import shutil
from pathlib import Path
import allure

# Add core to sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.dto import OcrRegion

# Paths
PROJECT_ROOT = project_root.parent
FIXTURES_DIR = PROJECT_ROOT / "core" / "test" / "fixtures"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts" / "tests"

@pytest.fixture
def opencv_service():
    return OpenCvService()

@pytest.fixture
def fixtures():
    return {
        "frame": str(FIXTURES_DIR / "frame.png"),
        "template": str(FIXTURES_DIR / "template.png"),
        "noise": str(FIXTURES_DIR / "noise.png")
    }

def save_debug_artifacts(name, source_path, template_path, result=None):
    """Save debug images on failure."""
    out_dir = ARTIFACTS_DIR / name
    out_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy(source_path, out_dir / "frame.png")
    shutil.copy(template_path, out_dir / "template.png")

    # If we have a result object, dump it
    if result:
        with open(out_dir / "debug.json", "w") as f:
            import json
            try:
                # Convert MatchPattern or other objects to dict
                data = result.__dict__ if hasattr(result, "__dict__") else str(result)
                f.write(json.dumps(data, default=str, indent=2))
            except:
                f.write(str(result))

@allure.feature("OpenCV Robustness")
class TestOpenCvRobustness:

    def test_exact_match(self, opencv_service, fixtures):
        """Test finding an exact template in the frame."""
        source = cv2.imread(fixtures["frame"])
        template = cv2.imread(fixtures["template"])

        match = opencv_service.find_match(source, template)

        # Perfect match should have low score (SQDIFF)
        assert match.similar < 0.01, f"Expected < 0.01, got {match.similar}"

        # Verify coordinates (center of image)
        h, w = source.shape[:2]
        cx, cy = w / 2, h / 2

        try:
            assert abs(match.point[0] - cx) < 2
            assert abs(match.point[1] - cy) < 2
        except AssertionError:
            save_debug_artifacts("test_exact_match", fixtures["frame"], fixtures["template"], match)
            raise

    def test_noise_tolerance(self, opencv_service, fixtures):
        """Test finding template in a noisy frame."""
        source = cv2.imread(fixtures["noise"])
        template = cv2.imread(fixtures["template"])

        match = opencv_service.find_match(source, template)

        # With noise, similarity score will be higher
        # Expected noise impact depends on the noise level added in generation
        # SQDIFF_NORMED is 0..1.
        try:
            # Tolerating up to 0.4 difference for noise
            assert match.similar < 0.4, f"Match score too high: {match.similar}"

            # Should still find roughly the center
            h, w = source.shape[:2]
            cx, cy = w / 2, h / 2
            assert abs(match.point[0] - cx) < 5
            assert abs(match.point[1] - cy) < 5
        except AssertionError:
            save_debug_artifacts("test_noise_tolerance", fixtures["noise"], fixtures["template"], match)
            raise

    def test_hard_negative(self, opencv_service, fixtures, tmp_path):
        """Test matching against a completely different template."""
        source = cv2.imread(fixtures["frame"])
        template = cv2.imread(fixtures["template"])

        # Create inverted template
        inverted_template = cv2.bitwise_not(template)
        inv_path = tmp_path / "inverted.png"
        cv2.imwrite(str(inv_path), inverted_template)

        match = opencv_service.find_match(source, inverted_template)

        try:
            # Should have high difference (poor match)
            # SQDIFF: > 0.1 at least. Usually much higher.
            assert match.similar > 0.1, f"Match score too low (false positive): {match.similar}"
        except AssertionError:
            save_debug_artifacts("test_hard_negative", fixtures["frame"], str(inv_path), match)
            raise

    def test_roi_handling(self, opencv_service, fixtures):
        """Test matching within a specific ROI and restoring global coordinates."""
        source = cv2.imread(fixtures["frame"])
        template = cv2.imread(fixtures["template"])

        # Define ROI around center
        h, w = source.shape[:2]
        cx, cy = w // 2, h // 2

        # Template is 50x50. Let's make ROI 100x100 around center.
        x1 = int(cx - 50)
        y1 = int(cy - 50)
        x2 = int(cx + 50)
        y2 = int(cy + 50)

        # Ensure ROI is within bounds
        x1 = max(0, x1); y1 = max(0, y1)
        x2 = min(w, x2); y2 = min(h, y2)

        # Crop source to ROI
        roi_source = source[y1:y2, x1:x2]

        match = opencv_service.find_match(roi_source, template)

        try:
            # Should match well inside ROI
            assert match.similar < 0.01

            local_x, local_y = match.point

            # Global coordinates
            global_x = local_x + x1
            global_y = local_y + y1

            # Verify global center is correct
            assert abs(global_x - cx) < 2
            assert abs(global_y - cy) < 2

        except AssertionError:
            save_debug_artifacts("test_roi_handling", fixtures["frame"], fixtures["template"], match)
            raise

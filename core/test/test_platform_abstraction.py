import pytest
import os
import sys
from unittest.mock import MagicMock, patch
import numpy as np
from pathlib import Path

# Fix path to include core
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from service.platform.platform_service import PlatformService
from service.platform.adb.adb_platform import AdbPlatform
from service.platform.robot.robot_platform import RobotPlatform
from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.dto import MatchPattern, OcrRegion
from service.platform.adb.adb_key_code import AdbKeyCode

# --- Dummy Implementation for testing PlatformService base logic ---
class DummyPlatform(PlatformService):
    def start(self): return True
    def stop(self): return True
    def snapshot(self): return np.zeros((100, 100, 3), np.uint8)
    def click(self, x, y): return True
    def swipe(self, x1, y1, x2, y2, duration=500): return True
    def type_text(self, text): return True
    def key_event(self, key_code): return True

@pytest.fixture
def mock_opencv():
    service = MagicMock(spec=OpenCvService)
    # Default match result: 0.0 is perfect for SQDIFF
    service.find_match.return_value = MatchPattern(0.0, (50.5, 50.5))
    return service

class TestPlatformServiceBase:
    def test_find_image_logic(self, mock_opencv):
        platform = DummyPlatform(mock_opencv)
        # Mock _get_image_mat to avoid real file loading
        platform._get_image_mat = MagicMock(return_value=np.zeros((10, 10, 3), np.uint8))
        
        result = platform.find_image("anything.png", threshold=0.9)
        
        assert result == (50.5, 50.5)
        mock_opencv.find_match.assert_called_once()

    def test_click_image_delegation(self, mock_opencv):
        platform = DummyPlatform(mock_opencv)
        platform.find_image = MagicMock(return_value=(10.0, 20.0))
        platform.click = MagicMock(return_value=True)
        
        success = platform.click_image("btn.png")
        
        assert success is True
        platform.click.assert_called_with(10, 20)

    def test_find_image_with_region(self, mock_opencv):
        platform = DummyPlatform(mock_opencv)
        platform.snapshot = MagicMock(return_value=np.zeros((100, 100, 3), np.uint8))
        platform._get_image_mat = MagicMock(return_value=np.zeros((10, 10, 3), np.uint8))
        
        region = OcrRegion(10, 10, 50, 50)
        result = platform.find_image("btn.png", region=region)
        
        # OpenCv match point is relative to the sliced region
        # If match is at (5, 5) in 40x40 slice, absolute is (10+5, 10+5)
        # Our mock returns (50.5, 50.5) by default
        assert result == (50.5 + 10, 50.5 + 10)

    def test_ocr_delegation(self, mock_opencv):
        platform = DummyPlatform(mock_opencv)
        mock_opencv.ocr_character_from_mat.return_value = "ABC"
        
        region = OcrRegion(0, 0, 100, 100)
        text = platform.ocr_text("templates", region)
        
        assert text == "ABC"
        mock_opencv.ocr_character_from_mat.assert_called_once()

    def test_wait_image_timeout(self, mock_opencv):
        platform = DummyPlatform(mock_opencv)
        # Always return None (not found)
        platform.find_image = MagicMock(return_value=None)
        
        import time
        start = time.time()
        result = platform.wait_image("missing.png", timeout=1, frequency=0.1)
        duration = time.time() - start
        
        assert result is None
        assert duration >= 1.0

class TestAdbPlatform:
    @pytest.fixture
    def mock_adb(self):
        adb = MagicMock()
        adb.device_id = "test-device"
        # Mock binary path resolution
        adb._get_adb_bin.return_value = "adb"
        return adb

    def test_adb_click_command(self, mock_adb, mock_opencv):
        platform = AdbPlatform(mock_adb, mock_opencv)
        
        platform.click(100, 200)
        
        assert mock_adb.exec.called
        call_args = mock_adb.exec.call_args[0][0]
        # Command should contain coordinates
        assert "100 200" in call_args

    def test_adb_key_event_enum(self, mock_adb, mock_opencv):
        platform = AdbPlatform(mock_adb, mock_opencv)
        platform.key_event(AdbKeyCode.KEYCODE_HOME)
        
        call_args = mock_adb.exec.call_args[0][0]
        # Home key code is 3
        assert "keyevent 3" in call_args

    def test_adb_snapshot_flow(self, mock_adb, mock_opencv):
        platform = AdbPlatform(mock_adb, mock_opencv)
        mock_adb.get_snapshot.return_value = b'fake-bytes'
        
        with patch('service.core.opencv.mat_utility.MatUtility.convert_bytes_to_mat') as mock_conv:
            mock_conv.return_value = np.zeros((10,10,3), np.uint8)
            res = platform.snapshot()
            assert res is not None
            mock_adb.get_snapshot.assert_called_once()

class TestRobotPlatform:
    @patch('pyautogui.click')
    def test_robot_click(self, mock_click, mock_opencv):
        platform = RobotPlatform(mock_opencv)
        platform.click(500, 600)
        mock_click.assert_called_with(500, 600)

    @patch('pyautogui.write')
    def test_robot_type_text(self, mock_write, mock_opencv):
        platform = RobotPlatform(mock_opencv)
        platform.type_text("hello world")
        mock_write.assert_called_with("hello world")

    @patch('pyautogui.screenshot')
    def test_robot_snapshot(self, mock_ss, mock_opencv):
        platform = RobotPlatform(mock_opencv)
        # Mock PIL Image returned by pyautogui
        from PIL import Image
        mock_ss.return_value = Image.new('RGB', (100, 100))
        
        res = platform.snapshot()
        assert isinstance(res, np.ndarray)
        assert res.shape == (100, 100, 3)

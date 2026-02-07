import unittest
from pathlib import Path
from unittest.mock import MagicMock
from core.script.script_interface import ScriptInterface

class MockScript(ScriptInterface):
    def execute(self):
        pass

class TestScriptInterface(unittest.TestCase):
    def test_init_defaults(self):
        """測試 ScriptInterface 的預設值初始化"""
        mock_platform = MagicMock()
        mock_platform.device_id = None
        
        script = MockScript(mock_platform)
        
        # 驗證預設閾值
        self.assertEqual(script.default_threshold, 0.8)
        # 驗證裝置 ID 初始為 None (來自 platform.device_id)
        self.assertIsNone(script.deviceId)
        
    def test_image_root_calculation(self):
        """測試 image_root 的路徑計算是否正確"""
        mock_platform = MagicMock()
        mock_platform.device_id = "test_device"
        
        script = MockScript(mock_platform)
        
        # 取得 MockScript 定義所在目錄
        expected_dir = Path(__file__).parent.resolve() / "images"
        
        # 驗證 image_root 是否指向正確的 images 目錄
        # 注意：MockScript 在這裡定義，所以路徑應該與 test_script_interface.py 相同
        self.assertEqual(Path(script.image_root).resolve(), expected_dir)

if __name__ == '__main__':
    unittest.main()

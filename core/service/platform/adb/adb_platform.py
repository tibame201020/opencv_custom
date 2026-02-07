"""
ADB 平台服務 - 提供 Android 裝置控制功能
"""
import time
from typing import List, Optional, Tuple, Union
import numpy as np
from ..platform_service import PlatformService
from service.core.opencv.open_cv_service import OpenCvService
from service.core.opencv.mat_utility import MatUtility
from service.core.opencv.dto import MatchPattern, OcrRegion
from .adb import Adb
from .adb_command import AdbCommand
from .adb_key_code import AdbKeyCode


class AdbPlatform(PlatformService):
    """ADB 平台服務類別"""
    
    def __init__(self, adb: Adb, open_cv_service: OpenCvService):
        super().__init__(open_cv_service)
        self.adb = adb
        
    def _resolve_device(self, device_id: Optional[str] = None) -> str:
        """解析裝置 ID，優先使用參數，其次使用實例中的 ID"""
        if device_id:
            return device_id
        if self.device_id:
            return self.device_id
        if self.adb.device_id:
            return self.adb.device_id
        raise ValueError("Device ID not specified")

    # --- 平台生命週期 ---
    
    def start(self) -> bool:
        """啟動 ADB daemon 伺服器"""
        try:
            self.adb.exec(AdbCommand.DAEMON_START.get_command())
            return True
        except Exception:
            return False
    
    def stop(self) -> bool:
        """停止 ADB daemon 伺服器"""
        try:
            self.adb.exec(AdbCommand.DAEMON_CLOSE.get_command())
            return True
        except Exception:
            return False

    def restart(self) -> bool:
        """重啟 ADB daemon 伺服器"""
        return self.stop() and self.start()

    # --- 平台原子操作實作 ---

    def snapshot(self) -> Optional[np.ndarray]:
        """獲取截圖 Mat"""
        did = self._resolve_device()
        bytes_data = self.adb.get_snapshot(did)
        if bytes_data is None:
            return None
        return MatUtility.convert_bytes_to_mat(bytes_data)

    def click(self, x: int, y: int) -> bool:
        """模擬點擊"""
        did = self._resolve_device()
        stdout = self.adb.exec(AdbCommand.TAP.get_command_with_device_coords(
            did, int(x), int(y)
        ))
        return "error" not in stdout.lower()

    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration: int = 500) -> bool:
        """模擬滑動"""
        did = self._resolve_device()
        stdout = self.adb.exec(AdbCommand.SWIPE.get_command_with_device_swipe(
            did, int(x1), int(y1), int(x2), int(y2), duration
        ))
        return "error" not in stdout.lower()

    def type_text(self, text: str) -> bool:
        """模擬文字輸入"""
        did = self._resolve_device()
        stdout = self.adb.exec(
            AdbCommand.INPUT_TEXT.get_command_with_device_package(did, text)
        )
        return "error" not in stdout.lower()

    def key_event(self, key_code: Union[int, str, AdbKeyCode]) -> bool:
        """模擬按鍵事件"""
        did = self._resolve_device()
        if isinstance(key_code, AdbKeyCode):
            stdout = self.adb.exec(key_code.get_command(did))
        else:
            # 支援直接傳入數字或字串 code
            stdout = self.adb.exec(f"adb -s {did} shell input keyevent {key_code}")
        return "error" not in stdout.lower()

    # --- ADB 特有功能 ---

    def get_devices(self) -> List[str]:
        """取得裝置 ID 列表"""
        stdout = self.adb.exec(AdbCommand.DEVICE_LIST.get_command())
        if not stdout.startswith("List of devices attached"):
            return []
        
        device_id_list = []
        for line in stdout.split('\n'):
            if line.startswith("List of devices attached") or not line.strip():
                continue
            if "device" in line and "\t" in line:
                device_id = line.split("\t")[0].strip()
                if device_id:
                    device_id_list.append(device_id)
        return device_id_list
    
    def start_app(self, app_package: str) -> Optional[str]:
        """啟動應用程式"""
        did = self._resolve_device()
        launcher = self.adb.exec(
            AdbCommand.GET_ACTIVITY_BY_PACKAGE.get_command_with_device_package(did, app_package)
        ).strip()
        
        if launcher:
            return self.adb.exec(
                AdbCommand.START_APP.get_command_with_device_package(did, launcher)
            )
        return None

    def stop_app(self, app_package: str) -> str:
        """停止應用程式"""
        did = self._resolve_device()
        return self.adb.exec(AdbCommand.STOP_APP.get_command_with_device_package(did, app_package))
    
    def pull(self, android_path: str, disk_path: str) -> str:
        """從裝置拉取檔案"""
        did = self._resolve_device()
        return self.adb.exec(AdbCommand.PULL_DATA.get_command_with_device_paths(did, android_path, disk_path))
    
    def push(self, disk_path: str, android_path: str) -> str:
        """推送檔案到裝置"""
        did = self._resolve_device()
        return self.adb.exec(AdbCommand.PUSH_DATA.get_command_with_device_paths(did, disk_path, android_path))

    # --- 為了相容性保留的部分原有方法 (內部轉向新接口) ---

    def take_snapshot(self) -> Optional[np.ndarray]:
        return self.snapshot()

    def find_image_full(self, image_path: str) -> Optional[Tuple[float, float]]:
        return self.find_image(image_path)

    def click_image_full(self, image_path: str) -> bool:
        return self.click_image(image_path)

    def exec(self, command: str) -> str:
        """發送原生 ADB 命令"""
        return self.adb.exec(command)


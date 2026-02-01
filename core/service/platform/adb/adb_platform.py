"""
ADB 平台服務 - 提供 Android 裝置控制功能
"""
import time
from typing import List, Optional, Tuple
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
        super().__init__()
        self.adb = adb
        self.open_cv_service = open_cv_service
        
    def _resolve_device(self, device_id: Optional[str]) -> str:
        """解析裝置 ID，優先使用參數，其次使用 ADB 實例中的 ID"""
        if device_id:
            return device_id
        if self.adb.device_id:
            return self.adb.device_id
        raise ValueError("Device ID not specified in arguments or Adb instance")

    def get_open_cv_service(self) -> OpenCvService:
        """取得 OpenCV 服務實例"""
        return self.open_cv_service
    
    def restart(self) -> bool:
        """重啟 ADB daemon 伺服器"""
        try:
            self.adb.exec(AdbCommand.DAEMON_CLOSE.get_command())
            self.adb.exec(AdbCommand.DAEMON_START.get_command())
            return True
        except Exception:
            return False
    
    def close(self) -> bool:
        """關閉 ADB daemon 伺服器"""
        try:
            self.adb.exec(AdbCommand.DAEMON_CLOSE.get_command())
            return True
        except Exception:
            return False
    
    def start(self) -> bool:
        """啟動 ADB daemon 伺服器"""
        try:
            self.adb.exec(AdbCommand.DAEMON_START.get_command())
            return True
        except Exception:
            return False
    
    def get_devices(self) -> List[str]:
        """取得裝置 ID 列表"""
        stdout = self.adb.exec(AdbCommand.DEVICE_LIST.get_command())
        if not stdout.startswith("List of devices attached"):
            return []
        return self._read_device_list(stdout)
    
    def _read_device_list(self, stdout: str) -> List[str]:
        """從命令輸出讀取裝置 ID 列表"""
        device_id_list = []
        for line in stdout.split('\n'):
            if line.startswith("List of devices attached"):
                continue
            if "device" in line:
                device_id = line.split("\tdevice")[0].strip()
                if device_id:
                    device_id_list.append(device_id)
        return device_id_list
    
    def click(self, x: float, y: float, device_id: str = None) -> str:
        """點擊裝置上的座標"""
        did = self._resolve_device(device_id)
        return self.adb.exec(AdbCommand.TAP.get_command_with_device_coords(
            did, int(x), int(y)
        ))
    
    def key_event(self, adb_key_code: AdbKeyCode, device_id: str = None) -> str:
        """觸發按鍵事件"""
        did = self._resolve_device(device_id)
        return self.adb.exec(adb_key_code.get_command(did))
    
    def find_image(self, image_path: str, region: OcrRegion, device_id: str = None) -> Optional[Tuple[float, float]]:
        """在裝置螢幕上尋找影像（指定區域）"""
        did = self._resolve_device(device_id)
        src_bytes = self.adb.get_snapshot(did)
        if src_bytes is None:
            return None
        
        src = MatUtility.convert_bytes_to_mat(src_bytes)
        if src is None:
            return None
        
        src_region = MatUtility.slice_region_mat_from_source(src, region)
        target = self._get_image_mat(image_path)
        if target is None:
            return None
        
        # 檢查尺寸
        if target.shape[0] > src_region.shape[0] or target.shape[1] > src_region.shape[1]:
            return None
        
        pattern = self.open_cv_service.find_match(src_region, target)
        
        if pattern.get_similar() > 0.99:
            return (pattern.point[0] + region.x1, pattern.point[1] + region.y1)
        return None
    
    def find_image_full(self, image_path: str, device_id: str = None) -> Optional[Tuple[float, float]]:
        """在裝置螢幕上尋找影像（全螢幕）"""
        did = self._resolve_device(device_id)
        src_bytes = self.adb.get_snapshot(did)
        if src_bytes is None:
            return None
        
        src = MatUtility.convert_bytes_to_mat(src_bytes)
        if src is None:
            return None
        
        target = self._get_image_mat(image_path)
        if target is None:
            return None
        
        # 檢查尺寸
        if target.shape[0] > src.shape[0] or target.shape[1] > src.shape[1]:
            return None
        
        pattern = self.open_cv_service.find_match(src, target)
        
        if pattern.get_similar() > 0.99:
            return pattern.point
        return None
    
    def _get_image_mat(self, image_path: str) -> Optional[np.ndarray]:
        """取得圖片 Mat，處理相對路徑"""
        from pathlib import Path
        import os
        
        # 如果是相對路徑，從專案根目錄開始
        if not Path(image_path).is_absolute():
            # 從當前文件向上找到專案根目錄
            # adb_platform.py 在 py-version/service/platform/adb/
            # 需要向上 5 層到專案根目錄
            current_file = Path(__file__).resolve()
            project_root = current_file.parent.parent.parent.parent.parent
            full_path = project_root / image_path
        else:
            full_path = Path(image_path)
        
        if not full_path.exists():
            print(f"圖片路徑不存在: {full_path}")
            return None
        
        return MatUtility.get_mat_from_file(str(full_path))
    
    def find_image_with_similar(self, image_path: str, similar: float, device_id: str = None) -> Optional[Tuple[float, float]]:
        """在裝置螢幕上尋找影像（指定相似度）"""
        did = self._resolve_device(device_id)
        src_bytes = self.adb.get_snapshot(did)
        if src_bytes is None:
            return None
        
        src = MatUtility.convert_bytes_to_mat(src_bytes)
        if src is None:
            return None
        
        target = self._get_image_mat(image_path)
        if target is None:
            return None
        
        # 檢查尺寸
        if target.shape[0] > src.shape[0] or target.shape[1] > src.shape[1]:
            return None
        
        pattern = self.open_cv_service.find_match(src, target)
        
        if pattern.get_similar() > similar:
            return pattern.point
        return None
    
    def click_image(self, image_path: str, region: OcrRegion, device_id: str = None) -> bool:
        """點擊裝置上的影像（指定區域）"""
        did = self._resolve_device(device_id)
        point = self.find_image(image_path, region, did)
        if point is None:
            return False
        # find_image 已經加上了 region 的偏移，這裡直接使用
        stdout = self.click(point[0], point[1], did)
        return bool(stdout)
    
    def click_image_full(self, image_path: str, device_id: str = None) -> bool:
        """點擊裝置上的影像（全螢幕）"""
        did = self._resolve_device(device_id)
        point = self.find_image_full(image_path, did)
        if point is None:
            return False
        stdout = self.click(point[0], point[1], did)
        return bool(stdout)
    
    def click_image_with_similar(self, image_path: str, similar: float, device_id: str = None) -> bool:
        """點擊裝置上的影像（指定相似度）"""
        did = self._resolve_device(device_id)
        point = self.find_image_with_similar(image_path, similar, did)
        if point is None:
            return False
        stdout = self.click(point[0], point[1], did)
        return bool(stdout)
    
    def sleep(self, seconds: int) -> None:
        """執行緒休眠"""
        time.sleep(seconds)
    
    def exec(self, command: str) -> str:
        """發送 ADB 命令"""
        # 替換 adb 為 platform-tools\\adb.exe (Windows) 或 platform-tools/adb (Linux/Mac)
        import os
        if os.name == 'nt':
            command = command.replace("adb ", "platform-tools\\adb.exe ")
        else:
            command = command.replace("adb ", "platform-tools/adb ")
        return self.adb.exec(command)
    
    def swipe(self, x1: float, y1: float, x2: float, y2: float, device_id: str = None) -> str:
        """滑動（無持續時間）"""
        did = self._resolve_device(device_id)
        command = AdbCommand.SWIPE.get_command_with_device_swipe(
            did, int(x1), int(y1), int(x2), int(y2), -9999999
        )
        command = command.replace("-9999999", "")
        return self.adb.exec(command)
    
    def swipe_with_duration(self, x1: float, y1: float, x2: float, y2: float, 
                            durations: int, device_id: str = None) -> str:
        """滑動（指定持續時間）"""
        did = self._resolve_device(device_id)
        return self.adb.exec(AdbCommand.SWIPE.get_command_with_device_swipe(
            did, int(x1), int(y1), int(x2), int(y2), durations
        ))
    
    def drag(self, x1: float, y1: float, x2: float, y2: float, device_id: str = None) -> str:
        """拖曳（預設持續時間 1000ms）"""
        did = self._resolve_device(device_id)
        return self.adb.exec(AdbCommand.DRAG_DROP.get_command_with_device_swipe(
            did, int(x1), int(y1), int(x2), int(y2), 1000
        ))
    
    def drag_with_duration(self, x1: float, y1: float, x2: float, y2: float, 
                          durations: int, device_id: str = None) -> str:
        """拖曳（指定持續時間）"""
        did = self._resolve_device(device_id)
        return self.adb.exec(AdbCommand.DRAG_DROP.get_command_with_device_swipe(
            did, int(x1), int(y1), int(x2), int(y2), durations
        ))
    
    def drag_image_to_image(self, target1: str, target2: str, device_id: str = None) -> str:
        """拖曳目標1到目標2"""
        did = self._resolve_device(device_id)
        point1 = self.find_image_full(target1, did)
        point2 = self.find_image_full(target2, did)
        if point1 is None or point2 is None:
            return ""
        return self.adb.exec(AdbCommand.DRAG_DROP.get_command_with_device_swipe(
            did, int(point1[0]), int(point1[1]), int(point2[0]), int(point2[1]), 1000
        ))
    
    def drag_image_to_image_with_duration(self, target1: str, target2: str, 
                                         durations: int, device_id: str = None) -> str:
        """拖曳目標1到目標2（指定持續時間）"""
        did = self._resolve_device(device_id)
        point1 = self.find_image_full(target1, did)
        point2 = self.find_image_full(target2, did)
        if point1 is None or point2 is None:
            return ""
        return self.adb.exec(AdbCommand.DRAG_DROP.get_command_with_device_swipe(
            did, int(point1[0]), int(point1[1]), int(point2[0]), int(point2[1]), durations
        ))
    
    def take_snapshot(self, device_id: str = None) -> Optional[np.ndarray]:
        """取得裝置截圖 Mat"""
        did = self._resolve_device(device_id)
        bytes_data = self.adb.get_snapshot(did)
        if bytes_data is None:
            return None
        return MatUtility.convert_bytes_to_mat(bytes_data)
    
    def take_snapshot_to_file(self, image_file_name: str, device_id: str = None) -> None:
        """取得裝置截圖並儲存到檔案"""
        did = self._resolve_device(device_id)
        mat = self.take_snapshot(did)
        if mat is not None:
            MatUtility.write_to_file(image_file_name, mat)
    
    def start_app(self, app_package: str, device_id: str = None) -> Optional[str]:
        """啟動應用程式"""
        did = self._resolve_device(device_id)
        find_launcher = self.adb.exec(
            AdbCommand.GET_ACTIVITY_BY_PACKAGE.get_command_with_device_package(did, app_package)
        )
        if find_launcher and find_launcher.strip():
            return self.adb.exec(
                AdbCommand.START_APP.get_command_with_device_package(did, find_launcher.strip())
            )
        return None
    
    def stop_app(self, app_package: str, device_id: str = None) -> str:
        """停止應用程式"""
        did = self._resolve_device(device_id)
        return self.adb.exec(
            AdbCommand.STOP_APP.get_command_with_device_package(did, app_package)
        )
    
    def cleanup_app_data(self, app_package: str, device_id: str = None) -> str:
        """清理應用程式資料"""
        did = self._resolve_device(device_id)
        return self.adb.exec(
            AdbCommand.CLEAN_PACKAGE_DATA.get_command_with_device_package(did, app_package)
        )
    
    def wait_click_image(self, file_name: str, mill_seconds: int, frequency: int, device_id: str = None) -> bool:
        """等待影像出現並點擊"""
        if mill_seconds < 0:
            raise RuntimeError(f"{file_name} not found")
        
        did = self._resolve_device(device_id)
        point = self.find_image_full(file_name, did)
        if point is None:
            time.sleep(frequency / 1000.0)
            return self.wait_click_image(file_name, mill_seconds - frequency, frequency, did)
        else:
            self.click(point[0], point[1], did)
            return True
    
    def wait_image(self, file_name: str, mill_seconds: int, frequency: int, device_id: str = None) -> Optional[Tuple[float, float]]:
        """等待影像出現"""
        if mill_seconds < 0:
            raise RuntimeError(f"{file_name} not found")
        
        did = self._resolve_device(device_id)
        point = self.find_image_full(file_name, did)
        if point is None:
            time.sleep(frequency / 1000.0)
            return self.wait_image(file_name, mill_seconds - frequency, frequency, did)
        else:
            return point
    
    def get_app_list(self, device_id: str = None) -> str:
        """取得裝置應用程式列表"""
        did = self._resolve_device(device_id)
        return self.adb.exec(AdbCommand.GET_APPS.get_command_with_device(did))
    
    def type_text(self, text: str, device_id: str = None) -> str:
        """輸入文字"""
        did = self._resolve_device(device_id)
        return self.adb.exec(
            AdbCommand.INPUT_TEXT.get_command_with_device_package(did, text)
        )
    
    def connect(self, device_id: str) -> str:
        """連接裝置"""
        # 注意: connect 是針對特定 device_id，這裡不應該用 _resolve_device
        # 或者說，如果沒有傳，就用內建的？
        # connect cmd takes IP. device_id MUST be IP.
        return self.adb.exec(AdbCommand.CONNECT.get_command_with_device(device_id))
    
    def pull(self, android_path: str, disk_path: str, device_id: str = None) -> str:
        """從裝置拉取檔案"""
        did = self._resolve_device(device_id)
        return self.adb.exec(
            AdbCommand.PULL_DATA.get_command_with_device_paths(did, android_path, disk_path)
        )
    
    def push(self, disk_path: str, android_path: str, device_id: str = None) -> str:
        """推送檔案到裝置"""
        did = self._resolve_device(device_id)
        return self.adb.exec(
            AdbCommand.PUSH_DATA.get_command_with_device_paths(did, disk_path, android_path)
        )


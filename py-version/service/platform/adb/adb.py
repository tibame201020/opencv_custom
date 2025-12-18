"""
ADB 處理器 - 執行 ADB 命令
"""
import subprocess
from typing import Optional
from .adb_command import AdbCommand


class Adb:
    """ADB 處理器類別"""
    
    def exec(self, command: str) -> str:
        """
        執行 ADB 命令
        
        Args:
            command: ADB 命令字串
            
        Returns:
            標準輸出字串
        """
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'  # 使用 replace 來處理編碼錯誤
            )
            stdout = result.stdout if result.stdout else result.stderr
            return stdout if stdout else ""
        except Exception as e:
            print(f"Error executing command: {e}")
            return f"something error : {e}"
    
    def get_snapshot(self, device_id: str) -> Optional[bytes]:
        """
        取得 Android 裝置截圖
        
        Args:
            device_id: ADB 裝置 ID
            
        Returns:
            截圖位元組陣列，失敗時返回 None
        """
        try:
            command = AdbCommand.SCREEN_CAP.get_command_with_device(device_id)
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                timeout=10  # 添加超時
            )
            if result.returncode != 0:
                print(f"截圖命令失敗，返回碼: {result.returncode}")
            return result.stdout if result.returncode == 0 and result.stdout else None
        except subprocess.TimeoutExpired:
            print("DEBUG: 截圖命令超時")
            return None
        except Exception as e:
            print(f"Error getting snapshot: {e}")
            import traceback
            traceback.print_exc()
            return None


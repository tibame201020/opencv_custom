from script.script_interface import ScriptInterface
from service.platform.adb.adb_platform import AdbPlatform

class Sd_gundam_重複關卡Script(ScriptInterface):
    def __init__(self, platform: AdbPlatform):
        self.platform = platform
        self.platform_type = "android"
        super().__init__()

    def execute(self):
        print(f"Starting sd_gundam_重複關卡 (Android)...")
        
        # --- Useful Properties ---
        print(f"Device ID: {self.deviceId}")
        print(f"Image Root: {self.image_root}")
        print(f"Default Threshold: {self.default_threshold}")
        
        # --- Adb Platform Examples ---
        # self.platform.click(100, 100, self.deviceId)
        # self.platform.swipe(100, 100, 200, 200, self.deviceId)
        # self.platform.swipe_with_duration(100, 100, 200, 200, 500, self.deviceId)
        # self.platform.type_text("Hello", self.deviceId)
        # self.platform.key_event("KEYCODE_HOME", self.deviceId)
        # self.platform.start_app("com.example.package", self.deviceId)
        # self.platform.stop_app("com.example.package", self.deviceId)
        
        # --- Image Recognition ---
        # mat = self.platform.take_snapshot(self.deviceId)
        # found, point = self.platform.find_image_full("target_image.png", self.deviceId)
        # if found:
        #     self.platform.click(point[0], point[1], self.deviceId)
        
        # --- Click Image Shortcuts ---
        # self.platform.click_image_full("target.png", self.deviceId)
        # self.platform.click_image_with_similar("target.png", 0.9, self.deviceId)
        
        print("Done.")

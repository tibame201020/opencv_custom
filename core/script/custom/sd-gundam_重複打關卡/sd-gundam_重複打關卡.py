from script.script_interface import ScriptInterface
from service.platform.adb.adb_platform import AdbPlatform

class Sd-gundam_重複打關卡Script(ScriptInterface):
    def __init__(self, platform: AdbPlatform):
        self.platform = platform
        self.platform_type = "android"
        super().__init__()

    def execute(self):
        print(f"Starting sd-gundam_重複打關卡 (Android)...")
        
        # --- Useful Properties ---
        print(f"Device ID: {self.deviceId}")
        print(f"Image Root: {self.image_root}")
        print(f"Default Threshold: {self.default_threshold}")
        
        self.platform.connect(self.deviceId)
        self.platform.click_image("出擊準備.png")


        
        # --- Adb Platform Examples ---
        # self.platform.click(100, 100)
        # self.platform.swipe(100, 100, 200, 200, duration=500)
        # self.platform.input_text("Hello")
        # self.platform.key_event("KEYCODE_HOME")
        # self.platform.start_app("com.example.package")
        # self.platform.stop_app("com.example.package")
        # self.platform.app_info("com.example.package")
        
        # --- Image Recognition ---
        # result = self.platform.screenshot()
        # found, point = self.platform.find_image("target_image.png")
        # if found:
        #     self.platform.click(point[0], point[1])
        
        print("Done.")

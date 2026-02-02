from script.script_interface import ScriptInterface
from service.platform.adb.adb_platform import AdbPlatform

class TestScript(ScriptInterface):
    def __init__(self, platform: AdbPlatform):
        self.platform = platform
        self.platform_type = "android"
        super().__init__()

    def execute(self):
        print("Starting test (Android)...")
        # Your android automation code here
        # self.platform.click(100, 100)
        print("Done.")

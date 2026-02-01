from script.script_interface import ScriptInterface
from service.platform.adb.adb_platform import AdbPlatform

class Test_tapScript(ScriptInterface):
    def __init__(self, platform: AdbPlatform):
        self.platform = platform
        super().__init__()

    def execute(self):
        print("Starting test_tap...")
        # Your code here
        # self.platform.click(100, 100)
        print("Done.")

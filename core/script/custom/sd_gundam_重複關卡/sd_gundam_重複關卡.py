from script.script_interface import ScriptInterface
from service.platform.adb.adb_platform import AdbPlatform
from service.core.opencv.dto import OcrRegion

class Sd_gundam_重複關卡Script(ScriptInterface):
    
    target_images = [
            "images/繼續.png",
            "images/下一步.png",
            "images/再次挑戰.png",
            "images/確定.png",
        ]

    target_arr = [
        {
            "image": "繼續.png",
            "ocr": OcrRegion(1069, 629, 1163, 693)
        },
        {
            "image": "繼續.png",
            "ocr": OcrRegion(1069, 629, 1163, 693)
        },
        {
            "image": "再次出擊.png",
            "ocr": OcrRegion(799, 627, 919, 687)
        },
        {
            "image": "開始戰鬥.png",
            "ocr": OcrRegion(549, 622, 668, 680)
        },
        {
            "image": "挑戰.png",
            "ocr": OcrRegion(730, 630, 802, 681)
        },
        {
            "image": "出擊.png",
            "ocr": OcrRegion(1080, 631, 1147, 667)
        }
    ]
    
    def __init__(self, platform: AdbPlatform):
        self.platform = platform
        self.platform_type = "android"
        super().__init__()

    def execute(self):
        print(f"Starting sd_gundam_重複關卡 (Android)...")
        
        # --- 基礎屬性資訊 ---
        print(f"Device ID: {self.deviceId}")
        print(f"Image Root: {self.image_root}")
        print(f"Default Threshold: {self.default_threshold}")
    
        # 連接設備
        self.platform.connect(self.deviceId)
        
        while True:
            print("--- 掃描開始 ---")
            for target in self.target_arr:
                try:
                    image_path = f"{self.image_root}\\{target['image']}"
                    ocr_region = target["ocr"]

                    print(f"try find = {image_path}")
                    
                    # 尋找影像
                    point = self.platform.find_image(image_path, ocr_region, self.deviceId)
                    
                    print(f"point = {point}")

                    if point:
                        print(f"找到目標: {target['image']}，座標: {point}")
                        self.platform.click(point[0], point[1], self.deviceId)
                        # 點擊後可以稍微等待一下
                        self.platform.sleep(2)
                    else:
                        continue
                    self.platform.sleep(3)
                except Exception as e:
                    # 修正這裡的存取方式，並印出實際的錯誤訊息以便偵錯
                    print(f"處理 {target.get('image', '未知')} 時發生錯誤: {e}")
                    pass

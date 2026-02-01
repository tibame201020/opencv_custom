# ADB OpenCV Python 版本

這是 Java Spring Boot 版本的 Python 重構，功能完全一致。

## 功能

- **多平台支援**
  - ADB 平台：透過 ADB 控制 Android 裝置
  - Robot 平台：使用 pyautogui 控制本機桌面

- **影像辨識能力**
  - 模板匹配（Template Matching）
  - OCR 文字辨識（Character OCR）
  - 圖案辨識（Pattern OCR）

- **腳本化執行**
  - 支援多種腳本
  - 可擴展的腳本介面

## 安裝

```bash
pip install -r requirements.txt
```

## 使用方式

### 方式 1：使用主程式（推薦）

從 `py-version` 目錄執行：

```bash
cd py-version
python chaos_dream_script.py
```

### 方式 2：使用腳本執行器

從 `py-version` 目錄執行：

```bash
# 執行 Robot 腳本
python run_robot_script.py

# 或使用通用執行器
python run_script.py robot
python run_script.py adb
```

### 方式 3：使用模組方式執行

從專案根目錄（`opencv_custom`）執行：

```bash
cd ..
python -m py-version.main
```

### 注意事項

⚠️ **不要直接執行腳本文件**（如 `python script/robot/robot_script.py`），因為腳本使用相對導入，需要作為模組執行。

✅ **正確方式**：從 `py-version` 目錄執行 `main.py` 或 `run_robot_script.py`

## 專案結構

```
py-version/
├── service/
│   ├── core/
│   │   └── opencv/          # OpenCV 核心服務
│   │       ├── dto.py       # 資料傳輸物件
│   │       ├── mat_utility.py # Mat 工具類別
│   │       ├── open_cv_service.py # OpenCV 服務
│   │       └── ocr/         # OCR 服務
│   └── platform/            # 平台服務
│       ├── platform_service.py # 平台服務介面
│       ├── adb/             # ADB 平台
│       └── robot/           # Robot 平台
├── script/                  # 腳本
│   ├── script.py            # 腳本介面
│   └── robot/               # Robot 腳本
├── main.py                  # 主程式入口
├── requirements.txt         # 依賴套件
└── README.md               # 說明文件
```

## 與 Java 版本的對應關係

| Java | Python |
|------|--------|
| Spring Boot | 純 Python（無框架） |
| OpenCV Java | opencv-python |
| java.awt.Robot | pyautogui |
| ADB Process | subprocess |
| Lombok | dataclasses |

## 注意事項

1. ADB 工具需要放在 `platform-tools/` 目錄下
2. Windows 使用 `platform-tools\\adb.exe`
3. Linux/Mac 使用 `platform-tools/adb`
4. 確保已安裝 OpenCV 和相關依賴


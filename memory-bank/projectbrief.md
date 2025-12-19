# 專案簡介

## 專案名稱
adbOpenCv - Android 裝置自動化與影像辨識系統

## 專案目標
建立一個整合 OpenCV 影像辨識、ADB 裝置控制與 Java AWT Robot 的 Spring Boot 應用程式，用於自動化操作與影像分析。

## 核心需求
1. **多平台支援**
   - ADB 平台：透過 ADB 控制 Android 裝置（截圖、點擊、滑動等）
   - Robot 平台：使用 Java AWT Robot 控制本機桌面（截圖、影像辨識）

2. **影像辨識能力**
   - 模板匹配（Template Matching）
   - OCR 文字辨識（Character OCR）
   - 圖案辨識（Pattern OCR）

3. **腳本化執行**
   - 支援多種腳本（GearScript、EvilHunterScript、RobotScript）
   - 可擴展的腳本介面

## 技術棧
- **框架**：Spring Boot 3.3.0
- **語言**：Java 21
- **影像處理**：OpenCV 4.9.0-0
- **建置工具**：Maven
- **其他**：Lombok、Commons IO

## 專案結構
```
src/main/java/custom/tibame201020/adbOpenCv/
├── AdbOpenCvApplication.java    # 主應用程式入口
├── service/
│   ├── core/opencv/             # OpenCV 核心服務
│   └── platform/                # 平台服務（ADB、Robot）
└── script/                      # 腳本實作
    ├── gearScript/              # 裝備腳本
    ├── evilHunter/              # 遊戲腳本
    └── robot/                   # Robot 測試腳本
```

## 專案範圍
- 支援 Android 裝置自動化操作
- 支援本機桌面自動化操作
- 提供影像辨識與 OCR 功能
- 可擴展的腳本架構

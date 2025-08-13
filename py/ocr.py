import easyocr
from PIL import Image
import sys
import json

def ocr_from_image(image_path: str) -> list:
    """從圖片中辨識文字並回傳結果。"""
    reader = easyocr.Reader(['en', 'ch_tra'])

    try:
        # 直接使用 readtext 辨識，這裡省略了 region 參數，你可以根據需求自行加入
        result = reader.readtext(image_path)
    except FileNotFoundError:
        return []
    except Exception as e:
        # 處理圖片錯誤
        return []

    return result

if __name__ == "__main__":
    # 檢查是否有傳入圖片路徑參數
    if len(sys.argv) < 2:
        print("請提供圖片檔案路徑作為參數。", file=sys.stderr)
        sys.exit(1)

    image_file = sys.argv[1]

    full_image_result = ocr_from_image(image_file)

    # 格式化結果為易於解析的 JSON
    output_list = []
    for (bbox, text, prob) in full_image_result:
        output_list.append({
            "text": text,
            "confidence": prob,
            "bounding_box": bbox
        })

    # 將 JSON 格式的結果列印到標準輸出
    print(json.dumps(output_list, ensure_ascii=False))
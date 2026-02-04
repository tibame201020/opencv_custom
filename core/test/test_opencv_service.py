import cv2
import numpy as np
import pytest
import allure
import os
import shutil
from pathlib import Path
from core.service.core.opencv.open_cv_service import OpenCvService
from core.service.core.opencv.dto import OcrRegion, MatchPattern

@pytest.fixture
def opencv_service():
    return OpenCvService()

@allure.suite("OpenCV Core Tests")
class TestOpenCvService:

    def create_test_image(self, width=200, height=200, bg_color=(0, 0, 0), grayscale=False):
        """建立一個純色背景的測試影像"""
        if grayscale:
            img = np.zeros((height, width), np.uint8)
            img[:] = bg_color[0] if isinstance(bg_color, tuple) else bg_color
        else:
            img = np.zeros((height, width, 3), np.uint8)
            img[:] = bg_color
        return img

    @allure.title("Test find_match with exact match")
    @allure.description("Verify that find_match returns a perfect score (near 0 for SQDIFF) and correct coordinates for an exact match.")
    def test_find_match_exact(self, opencv_service):
        # Create source: 200x200 black with a 50x50 red square at (50, 50)
        source = self.create_test_image()
        cv2.rectangle(source, (50, 50), (100, 100), (0, 0, 255), -1)
        
        # Create target: the 50x50 red square
        target = np.zeros((51, 51, 3), np.uint8)
        target[:] = (0, 0, 255)
        
        match = opencv_service.find_match(source, target)
        
        # For TM_SQDIFF_NORMED, 0.0 is perfect match
        assert match.similar < 0.01
        # Center should be around (75, 75)
        # target width = 51, height = 51. start=(50,50)
        # center = 50 + 51/2 = 75.5
        assert abs(match.point[0] - 75.5) < 1.0
        assert abs(match.point[1] - 75.5) < 1.0

    @allure.title("Test ocr_character with synthetic templates")
    @allure.description("Verify OCR logic by programmatically drawing characters and matching them.")
    def test_ocr_character_logic(self, opencv_service, tmp_path):
        # Setup temporary template directory
        templates_dir = tmp_path / "templates"
        templates_dir.mkdir()
        
        # Create 'A' and 'B' templates (simple shapes to simulate characters)
        def draw_char(char_name, shape_func):
            img = np.zeros((30, 20, 3), np.uint8)
            shape_func(img)
            cv2.imwrite(str(templates_dir / f"{char_name}.png"), img)
            return img

        # A is a circle
        draw_char("A", lambda i: cv2.circle(i, (10, 15), 8, (255, 255, 255), -1))
        # B is a rectangle
        draw_char("B", lambda i: cv2.rectangle(i, (5, 5), (15, 25), (255, 255, 255), -1))

        # Create source image with "ABA" (Circle, Rectangle, Circle)
        # Note: The service uses grayscale for OCR
        source = self.create_test_image(width=100, height=50, grayscale=True)
        # Draw Circle at x=10
        cv2.circle(source, (20, 25), 8, 255, -1)
        # Draw Rectangle at x=40
        cv2.rectangle(source, (45, 15), (55, 35), 255, -1)
        # Draw Circle at x=70
        cv2.circle(source, (80, 25), 8, 255, -1)

        # Region covering the whole text area
        region = OcrRegion(x1=0, y1=0, x2=100, y2=50)
        
        # Call OCR from mat (avoids file I/O for source)
        result = opencv_service.ocr_character_from_mat(
            str(templates_dir), 
            source, 
            region, 
            threshold=0.8
        )
        
        assert result == "ABA"

    @allure.title("Test ocr_pattern with synthetic templates")
    def test_ocr_pattern_logic(self, opencv_service, tmp_path):
        templates_dir = tmp_path / "patterns"
        templates_dir.mkdir()
        
        # Pattern X: a cross
        def draw_cross(img):
            cv2.line(img, (5, 5), (15, 15), 255, 2)
            cv2.line(img, (5, 15), (15, 5), 255, 2)
            
        cross_img = np.zeros((20, 20), np.uint8)
        draw_cross(cross_img)
        cv2.imwrite(str(templates_dir / "cross.png"), cross_img)

        # Source with two crosses
        source = self.create_test_image(width=100, height=50, grayscale=True)
        # Offset 20
        region_1 = source[10:30, 10:30]
        draw_cross(region_1)
        # Offset 60
        region_2 = source[10:30, 60:80]
        draw_cross(region_2)

        region = OcrRegion(x1=0, y1=0, x2=100, y2=50)
        result = opencv_service.ocr_pattern_from_mat(str(templates_dir), source, region, 0.7)
        
        # Pattern OCR returns "crosscross" because it finds two matches
        assert "cross" in result
        assert len(result) >= 10

    @allure.title("Test path security in MatchOCRAdaptor")
    def test_template_loading_empty(self, opencv_service, tmp_path):
        # Point to an empty directory
        empty_dir = tmp_path / "nothing"
        empty_dir.mkdir()
        
        source = self.create_test_image()
        region = OcrRegion(0,0,10,10)
        
        result = opencv_service.ocr_character_from_mat(str(empty_dir), source, region, 0.8)
        assert result == ""

import http.server
import socketserver
import json
import cv2
import sys
import os
from pathlib import Path
from typing import Optional

# Setup project root
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from service.platform.robot.robot_platform import RobotPlatform
from service.core.opencv.open_cv_service import OpenCvService

class BridgeHandler(http.server.BaseHTTPRequestHandler):
    platform: Optional[RobotPlatform] = None
    
    def log_message(self, format, *args):
        # Suppress logging for faster performance
        return

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"ok")
        
        elif self.path == '/screenshot':
            try:
                if not BridgeHandler.platform:
                    service = OpenCvService()
                    BridgeHandler.platform = RobotPlatform(service)
                
                mat = BridgeHandler.platform.snapshot()
                if mat is not None:
                    _, buffer = cv2.imencode('.png', mat)
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.end_headers()
                    self.wfile.write(buffer.tobytes())
                else:
                    self.send_error(500, "Screenshot failed")
            except Exception as e:
                self.send_error(500, str(e))
        
        else:
            self.send_error(404, "Not Found")

def run_bridge(port):
    with socketserver.TCPServer(("127.0.0.1", port), BridgeHandler) as httpd:
        print(f"Bridge listening on port {port}")
        httpd.serve_forever()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    run_bridge(port)

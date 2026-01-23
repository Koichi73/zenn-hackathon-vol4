import requests
import os
import time
import sys

BASE_URL = "http://localhost:8000"
VIDEO_PATH = "backend/uploads/qiita_very_short.mov"

def wait_for_server():
    print("Waiting for server...")
    for _ in range(10):
        try:
            resp = requests.get(f"{BASE_URL}/health")
            if resp.status_code == 200:
                print("Server is up!")
                return True
        except requests.ConnectionError:
            pass
        time.sleep(1)
    print("Server failed to start.")
    return False

def test_upload():
    if not os.path.exists(VIDEO_PATH):
        print(f"Video file not found: {VIDEO_PATH}")
        return

    print(f"Uploading {VIDEO_PATH}...")
    with open(VIDEO_PATH, "rb") as f:
        files = {"file": f}
        try:
            resp = requests.post(f"{BASE_URL}/api/process-video", files=files)
            if resp.status_code == 200:
                data = resp.json()
                print("Success!")
                steps = data.get("steps", [])
                print(f"Received {len(steps)} steps.")
                
                for i, step in enumerate(steps):
                    print(f"Step {i+1}: {step.get('title')}")
                    img_url = step.get("image_url")
                    print(f"  Image URL: {img_url}")
                    
                    if img_url:
                        # Verify file exists
                        # URL is /static/images/filename.jpg
                        # File should be in backend/app/static/images/filename.jpg
                        filename = img_url.split("/")[-1]
                        local_path = f"backend/app/static/images/{filename}"
                        if os.path.exists(local_path):
                            print(f"  [OK] File exists at {local_path}")
                        else:
                            print(f"  [FAIL] File missing at {local_path}")
            else:
                print(f"Failed: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if wait_for_server():
        test_upload()

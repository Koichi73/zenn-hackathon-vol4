import requests
import time
import os
from dotenv import load_dotenv

# Load env to get port if needed, defaulting to 8000
load_dotenv()
PORT = os.getenv("PORT", "8000")
BASE_URL = f"http://localhost:{PORT}"
URL = f"{BASE_URL}/api/analyze"

# Using a fake GCS URL is fine because we just want to test the immediate response,
# although the background task might fail later (which is expected for this test).
DATA = {
    "manual_id": "test_manual_async_001",
    "video_url": "gs://test-bucket/test-video.mp4", 
    "title": "Async Test Video"
}

print(f"Testing {URL} with data: {DATA}")

start = time.time()
try:
    res = requests.post(URL, json=DATA)
    duration = time.time() - start
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
    print(f"Duration: {duration:.4f}s")
    
    if res.status_code == 202:
        if duration < 2.0:
            print("PASS: Response was immediate and 202 Accepted.")
        else:
            print("WARNING: Response was 202 but took longer than 2s.")
    else:
        print(f"FAIL: Expected 202, got {res.status_code}")

except Exception as e:
    print(f"FAIL: Request error: {e}")

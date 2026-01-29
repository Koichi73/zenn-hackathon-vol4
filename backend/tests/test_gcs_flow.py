import os
import sys
import time
import json
import requests
import uuid
from google.cloud import storage
from dotenv import load_dotenv

# Add backend root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.dirname(current_dir)
sys.path.append(backend_root)

# Load environment variables
load_dotenv(os.path.join(backend_root, ".env"))

# Config
BASE_URL = "http://localhost:8000"
VIDEO_PATH = os.path.join(backend_root, "uploads", "qiita_short.mov")
PROJECT_ID = os.getenv("PROJECT_ID")
BUCKET_NAME = os.getenv("BUCKET_NAME")
CREDENTIALS_PATH = os.path.join(backend_root, os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

print(f"--- Configuration ---")
print(f"Project ID: {PROJECT_ID}")
print(f"Bucket: {BUCKET_NAME}")
print(f"Video Path: {VIDEO_PATH}")
print(f"---------------------")

def upload_video_to_gcs():
    """Upload video to GCS directly (Simulating Frontend)"""
    print("\n[1. Simulating Frontend Upload]")
    
    if not os.path.exists(VIDEO_PATH):
        print(f"❌ Video file not found at {VIDEO_PATH}")
        return None, None

    manual_id = f"test_manual_{str(uuid.uuid4())[:8]}"
    # Fixed path structure requested by user: manuals/{manual_id}/video.mp4
    blob_name = f"manuals/{manual_id}/video.mp4"
    
    try:
        storage_client = storage.Client.from_service_account_json(CREDENTIALS_PATH)
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_name)
        
        filename = os.path.basename(VIDEO_PATH)
        print(f"Uploading {filename} to gs://{BUCKET_NAME}/{blob_name} ...")
        blob.upload_from_filename(VIDEO_PATH)
        
        # Make public not strictly necessary if backend uses service account, but good for testing if we want public URL
        # blob.make_public() 
        
        gcs_uri = f"gs://{BUCKET_NAME}/{blob_name}"
        # Or public URL: blob.public_url
        
        print(f"✅ Upload success: {gcs_uri}")
        return manual_id, gcs_uri
        
    except Exception as e:
        print(f"❌ Upload Failed: {e}")
        return None, None

def trigger_analysis_v2(manual_id, gcs_uri):
    """Call new API with GCS URL"""
    print("\n[2. Triggering Analysis API]")
    url = f"{BASE_URL}/api/analyze"
    
    payload = {
        "manual_id": manual_id,
        "video_url": gcs_uri,
        "title": "GCS Flow Verification Video"
    }
    
    print(f"Sending payload: {json.dumps(payload, indent=2)}")
    
    start_time = time.time()
    try:
        # Note: Sending JSON now, not multipart/form-data
        response = requests.post(url, json=payload)
        elapsed = time.time() - start_time
        
        print(f"Response Status: {response.status_code}")
        print(f"Time Taken: {elapsed:.2f}s")
        
        if response.status_code in [200, 202]:
            print("✅ API responded successfully")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ API Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ API Request Failed: {e}")
        return False

def main():
    if not all([PROJECT_ID, BUCKET_NAME, os.path.exists(CREDENTIALS_PATH)]):
        print("❌ Missing configuration. Check .env and credentials.")
        return

    # 1. Upload to GCS
    manual_id, gcs_uri = upload_video_to_gcs()
    if not manual_id:
        return

    # 2. Call Backend
    success = trigger_analysis_v2(manual_id, gcs_uri)
    if not success:
        return
        
    print("\n✅ Flow verification initiated successfully.")
    print("Check backend logs for processing progress.")

if __name__ == "__main__":
    main()

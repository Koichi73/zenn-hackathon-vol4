import os
import sys
import time
import json
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud import storage
from dotenv import load_dotenv

# Add backend root to path to ensure we can import if needed (though avoiding app imports for clean testing)
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.dirname(current_dir)
sys.path.append(backend_root)

# Load environment variables
load_dotenv(os.path.join(backend_root, ".env"))

# Config
BASE_URL = "http://localhost:8000"
VIDEO_PATH = os.path.join(backend_root, "uploads", "qiita_short.mov")
CREDENTIALS_PATH = os.path.join(backend_root, os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

print(f"--- Configuration ---")
print(f"Project ID: {os.getenv('PROJECT_ID')}")
print(f"Creds Path: {CREDENTIALS_PATH}")
print(f"Video Path: {VIDEO_PATH}")
print(f"---------------------")

def init_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        cred = credentials.Certificate(CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred, {
            'projectId': os.getenv("PROJECT_ID"),
            'storageBucket': os.getenv("BUCKET_NAME")
        })
    print("✅ Firebase initialized")

def check_connectivity():
    """Verify Firestore and GCS connectivity"""
    print("\n[Connectivity Check]")
    
    # 1. Firestore Check
    try:
        database_id = os.getenv("FIRESTORE_DATABASE", "(default)")
        print(f"Connecting to Firestore DB: {database_id}")
        
        # Use direct Client construction with credentials
        db = firestore.Client.from_service_account_json(
            CREDENTIALS_PATH,
            project=os.getenv("PROJECT_ID"),
            database=database_id
        )
        
        doc_ref = db.collection("_health_check").document("test_connectivity")
        doc_ref.set({"timestamp": firestore.SERVER_TIMESTAMP, "status": "ok"})
        # Read back
        doc = doc_ref.get()
        if doc.exists:
            print("✅ Firestore WRITE/READ success")
        else:
            print("❌ Firestore READ failed")
    except Exception as e:
        print(f"❌ Firestore Check Error: {e}")
        return False

    # 2. GCS Check
    try:
        storage_client = storage.Client.from_service_account_json(CREDENTIALS_PATH)
        buckets = list(storage_client.list_buckets(max_results=1))
        print("✅ GCS Connection success (Buckets listed)")
    except Exception as e:
        print(f"❌ GCS Check Error: {e}")
        return False

    return True

def trigger_analysis():
    """Send video to backend"""
    print("\n[API Trigger Check]")
    url = f"{BASE_URL}/api/analyze"
    
    if not os.path.exists(VIDEO_PATH):
        print(f"❌ Video file not found at {VIDEO_PATH}")
        return None

    files = {
        'file': ('qiita_short.mov', open(VIDEO_PATH, 'rb'), 'video/quicktime')
    }
    data = {'title': 'Verification Test Video'}

    start_time = time.time()
    try:
        response = requests.post(url, files=files, data=data)
        elapsed = time.time() - start_time
        
        print(f"Response Status: {response.status_code}")
        print(f"Time Taken: {elapsed:.2f}s")
        
        if response.status_code in [200, 202]:
            print("✅ API responded successfully")
            if elapsed < 3.0:
                 print("✅ Response was immediate (Async processing confirmed)")
            else:
                 print("⚠️ Response took > 3s. Async might be blocking.")
            
            return response.json()
        else:
            print(f"❌ API Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ API Request Failed: {e}")
        return None

def monitor_progress(manual_id):
    """Monitor Firestore document for progress"""
    print(f"\n[Progress Monitoring] Manual ID: {manual_id}")
    
def monitor_progress(manual_id):
    """Monitor Firestore document for progress"""
    print(f"\n[Progress Monitoring] Manual ID: {manual_id}")
    
    database_id = os.getenv("FIRESTORE_DATABASE", "(default)")
    db = firestore.Client.from_service_account_json(
        CREDENTIALS_PATH,
        project=os.getenv("PROJECT_ID"),
        database=database_id
    )
    user_id = "test-user-001"
    doc_ref = db.collection("users").document(user_id).collection("manuals").document(manual_id)
    
    last_status = None
    step_count = 0
    start_wait = time.time()
    
    while True:
        try:
            doc = doc_ref.get()
            if not doc.exists:
                print("Waiting for document to be created...")
                time.sleep(1)
                continue
                
            data = doc.to_dict()
            status = data.get("status")
            steps = data.get("steps", [])
            
            # Change detection log
            if status != last_status:
                print(f"🔄 Status Changed: {last_status} -> {status}")
                last_status = status
            
            current_filled_steps = len([s for s in steps if s.get("image_url")])
            if current_filled_steps > step_count:
                print(f"📸 Images updated: {current_filled_steps}/{len(steps)}")
                
                # Check accessibility of the newest image
                for s in steps:
                    img = s.get("image_url")
                    if img and img.startswith("http"):
                        try:
                            r = requests.get(img)
                            if r.status_code == 200:
                                print(f"   ✅ Image accessible: {img.split('/')[-1]}")
                            else:
                                print(f"   ❌ Image INACCESSIBLE ({r.status_code}): {img.split('/')[-1]}")
                        except Exception as e:
                            print(f"   ❌ Image fetch error: {e}")
                            
                step_count = current_filled_steps
            
            if status == "completed":
                print("✅ Analysis COMPLETED!")
                print(f"Total Steps: {len(steps)}")
                # Print first step sample
                if steps:
                    print("Sample Step 1:", json.dumps(steps[0], ensure_ascii=False, indent=2))
                break
            
            if status == "error":
                print("❌ Analysis FAILED with status 'error'")
                break
                
            if time.time() - start_wait > 300: # 5 min timeout
                print("❌ Timeout waiting for completion")
                break
                
            time.sleep(1)
            
        except Exception as e:
            print(f"Monitoring Error: {e}")
            time.sleep(1)

def main():
    init_firebase()
    if not check_connectivity():
        print("Aborting due to connectivity check failure.")
        return

    result = trigger_analysis()
    if result and "manual_id" in result:
        monitor_progress(result["manual_id"])
    else:
        print("Aborting due to API failure.")

if __name__ == "__main__":
    main()

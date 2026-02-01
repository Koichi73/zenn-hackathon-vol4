import os
import sys
from google.cloud import storage, firestore
from google import genai
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = "zenn-hackathon-vol4-485309"
LOCATION = os.getenv("LOCATION", "us-central1")
BUCKET_NAME = os.getenv("BUCKET_NAME")
FIRESTORE_DB = os.getenv("FIRESTORE_DATABASE", "(default)")
CREDENTIALS_PATH = os.path.join(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))

print(f"Checking services for Project: {PROJECT_ID}")
print(f"Using Location: {LOCATION}")
print(f"Bucket Name: {BUCKET_NAME}")
print(f"Firestore DB: {FIRESTORE_DB}")

# Check Credentials
print("\n--- Checking Credentials ---")
try:
    import google.auth
    credentials, project = google.auth.default()
    if hasattr(credentials, "service_account_email"):
        print(f"Authenticated as Service Account: {credentials.service_account_email}")
    else:
        print("Authenticated with User Credentials (ADC)")
    print(f"ADC Project: {project}")
except Exception as e:
    print(f"Credential Check Failed: {e}")

# Check GCS
print("\n--- Checking GCS ---")
try:
    storage_client = storage.Client(project=PROJECT_ID)
    if BUCKET_NAME:
         print(f"Checking specific bucket: {BUCKET_NAME}")
         bucket = storage_client.bucket(BUCKET_NAME)
         # Check if we can access the bucket (get metadata)
         try:
             bucket.reload()
             print(f"✅ Success! Bucket '{BUCKET_NAME}' exists and is accessible.")
         except Exception as e:
             print(f"❌ Failed to access bucket '{BUCKET_NAME}': {e}")
    else:
        print("BUCKET_NAME not set in .env")
except Exception as e:
    print(f"GCS Setup Failed: {e}")

# Check Firestore
print("\n--- Checking Firestore ---")
try:
    print(f"Connecting to Firestore DB: {FIRESTORE_DB}")
    db = firestore.Client.from_service_account_json(
        CREDENTIALS_PATH,
        project=PROJECT_ID,
        database=FIRESTORE_DB
    )
    # Just try to get one collection to verify access
    cols = list(db.collections())
    print(f"✅ Success! Connected. Found {len(cols)} collections.")
except Exception as e:
    print(f"❌ Firestore Failed: {e}")

# Check Gemini
print("\n--- Checking Gemini (Vertex AI) ---")
try:
    # Use settings that match gemini_service.py or user hint
    # User mentioned "global" and "gemini-3-flash-preview"
    # But code defaults to us-central1. We will try both if one fails.
    
    target_locations = ["us-central1", "global"]
    target_model = "gemini-2.0-flash-exp" # Common latest, or try gemini-1.5-pro

    # Inspect what the app uses
    app_model = os.getenv("MODEL_NAME", "gemini-2.0-flash-exp")
    print(f"App configured model: {app_model}")

    success = False
    for loc in target_locations:
        print(f"Testing Location: {loc}, Model: {app_model}")
        try:
            client = genai.Client(vertexai=True, project=PROJECT_ID, location=loc)
            response = client.models.generate_content(
                model=app_model,
                contents="Hello",
                config=None
            )
            print(f"✅ Success in {loc}! Response: {response.text}")
            success = True
            break
        except Exception as e:
            print(f"Failed in {loc}: {e}")
    
    if not success:
        print("❌ All Gemini attempts failed.")

except Exception as e:
    print(f"Gemini Setup Failed: {e}")

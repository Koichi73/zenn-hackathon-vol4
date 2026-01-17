from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

project_id = os.getenv("PROJECT_ID")
location = os.getenv("LOCATION", "us-central1")

print(f"Project: {project_id}, Location: {location}")

client = genai.Client(vertexai=True, project=project_id, location=location)

models_to_test = [
    "gemini-2.0-flash-exp",
    "gemini-3-flash-preview"
]

for model_name in models_to_test:
    print(f"\nTesting model: {model_name}...")
    try:
        response = client.models.generate_content(
            model=model_name,
            contents="Hello, can you hear me?"
        )
        print(f"SUCCESS: {model_name}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"FAILED: {model_name}")
        print(f"Error: {e}")

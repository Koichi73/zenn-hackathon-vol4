import asyncio
import argparse
import os
import sys
from pathlib import Path

# Add backend directory to sys.path to allow imports from app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from dotenv import load_dotenv
load_dotenv()

from app.services.gemini_service import GeminiService
from app.repositories.gcs_repository import GCSRepository

async def main():
    parser = argparse.ArgumentParser(description="Test analyze_video_structure with a local file.")
    parser.add_argument("--file", type=str, default="qiita_very_short.mov", help="Filename to analyze")
    args = parser.parse_args()

    # resolve file path
    file_path = backend_dir / args.file

    if not file_path.exists():
        print(f"Error: File not found at {file_path}")
        return

    print(f"Target file: {file_path}")

    # Initialize Services
    try:
        gcs_repo = GCSRepository()
        gemini_service = GeminiService()
    except Exception as e:
        print(f"Failed to initialize services: {e}")
        return

    # Upload to GCS
    print("Uploading video to GCS...")
    destination_blob_name = f"manuals/tests/{args.file}"
    try:
        # We don't necessarily need the public URL for analysis, just the GCS URI
        # But upload_file returns public_url. 
        # We can construct GCS URI manually or use gcs_repo.get_gcs_uri
        
        # Using upload_file to ensure it's uploaded
        await asyncio.to_thread(gcs_repo.upload_file, str(file_path), destination_blob_name)
        
        gcs_uri = gcs_repo.get_gcs_uri(destination_blob_name)
        print(f"Uploaded to: {gcs_uri}")

    except Exception as e:
        print(f"Failed to upload to GCS: {e}")
        return

    # Analyze Video Structure
    print("Analyzing video structure...")
    try:
        structures = await gemini_service.analyze_video_structure(gcs_uri)
        
        print("\n--- Analysis Result ---")
        if not structures:
            print("No structure found or error occurred.")
        else:
            for i, s in enumerate(structures):
                print(f"Step {i+1}: {s.timestamp} - {s.title}")
                
        print("\n--- Raw Output ---")
        for s in structures:
            print(s.model_dump_json())

    except Exception as e:
        print(f"Error during analysis: {e}")
    
    finally:
        # Cleanup: Delete from GCS
        print(f"\nCleaning up: Deleting {destination_blob_name} from GCS...")
        try:
            gcs_repo.delete_file(destination_blob_name)
            print("Cleanup complete.")
        except Exception as e:
            print(f"Failed to delete file from GCS: {e}")

if __name__ == "__main__":
    asyncio.run(main())

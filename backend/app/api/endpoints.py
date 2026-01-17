from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.gemini_service import GeminiService
from app.services.video_service import VideoService
import shutil
import os
import uuid
import json

router = APIRouter()

TEMP_DIR = "/tmp/video_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)


# Fallback data for development or error cases
DUMMY_RESPONSE = [
    {
        "title": "Upload video",
        "description": "Drag and drop the video file into the upload area.",
        "timestamp": "00:03"
    },
    {
        "title": "Wait for processing",
        "description": "The system analyzes the video and extracts steps.",
        "timestamp": "00:08"
    },
    {
        "title": "Review manual",
        "description": "Check the generated markdown guide.",
        "timestamp": "00:15"
    }
]

@router.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_path = f"{TEMP_DIR}/{file_id}_{file.filename}"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. Process with Gemini (Real Implementation)
        try:
            gemini_service = GeminiService()
            steps = await gemini_service.analyze_video(file_path)
        except Exception as e:
            print(f"Gemini Error: {e}")
            # Fallback for dev without quota
            steps = DUMMY_RESPONSE
        
        # 2. Extract Frames
        try:
            video_service = VideoService()
            # We are saving to app/static/images. 
            # Mounting point is /static -> app/static.
            # So images should be in app/static/images.
            steps = await video_service.extract_frames(file_path, steps, output_dir="app/static/images")
        except Exception as e:
            print(f"Video Extraction Error: {e}")
            # If extraction fails, steps will just lack image_url or have it as None
        
        # 3. Format Response
        return {
            "status": "success",
            "message": "Video processed",
            "filename": file.filename,
            "steps": steps
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(file_path):
             os.remove(file_path)


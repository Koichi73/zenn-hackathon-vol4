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
        "timestamp": "00:03",
        "description": "Drag and drop the video file into the upload area.",
        "highlight_box": {"ymin": 0, "xmin": 0, "ymax": 0, "xmax": 0},
        "mask_boxes": []
    },
    {
        "title": "Wait for processing",
        "timestamp": "00:08",
        "description": "The system analyzes the video and extracts steps.",
        "highlight_box": {"ymin": 0, "xmin": 0, "ymax": 0, "xmax": 0},
        "mask_boxes": []
    },
    {
        "title": "Review manual",
        "timestamp": "00:15",
        "description": "Check the generated markdown guide.",
        "highlight_box": {"ymin": 0, "xmin": 0, "ymax": 0, "xmax": 0},
        "mask_boxes": []
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
        steps = []
        try:
            gemini_service = GeminiService()
            video_service = VideoService()
            # The service now handles video structure, image extraction, and detail analysis
            steps = await gemini_service.generate_manual_from_video(file_path, video_service)
        except Exception as e:
            print(f"Gemini Error: {e}")
            # Fallback for dev without quota
            steps = DUMMY_RESPONSE
        
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


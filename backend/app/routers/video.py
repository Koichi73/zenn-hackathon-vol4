from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from app.core.security import get_current_user
from app.services.gemini_service import GeminiService
from app.services.video_service import VideoService
from app.services.manual_service import ManualService
from pydantic import BaseModel
import os
import uuid

router = APIRouter()

class AnalyzeRequest(BaseModel):
    manual_id: str
    video_url: str
    title: str = "無題の動画"

# Background Task Function
async def run_video_analysis(user_id: str, video_url: str, manual_id: str, title: str):
    try:
        print(f"Background Task Started: {manual_id}, {video_url} for user {user_id}")
        
        gemini_service = GeminiService()
        video_service = VideoService()
        manual_service = ManualService()
        
        await gemini_service.generate_manual_from_video(
            user_id=user_id,
            video_service=video_service,
            manual_id=manual_id,
            manual_service=manual_service,
            gcs_video_uri=video_url
        )
        
    except Exception as e:
        print(f"Background Task Error: {e}")
        # Update status to error
        try:
             ManualService().update_manual_status(user_id, manual_id, "error")
        except:
             print("Failed to update status to error")

@router.post("/analyze", status_code=202)
async def analyze_video(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user)
):
    # 1. Parse Params
    video_url = request.video_url
    manual_id = request.manual_id
    title = request.title
    
    try:
        # 2. Initialize Job in Firestore (STATUS: queued)
        manual_service = ManualService()
        manual_service.create_manual_job(user_id, manual_id, title)
        
        # 3. Add to Background Tasks
        background_tasks.add_task(run_video_analysis, user_id, video_url, manual_id, title)

        # 4. Return immediately
        return {
            "status": "accepted",
            "message": "Video analysis started (background)",
            "manual_id": manual_id
        }
        
    except Exception as e:
        print(f"Analysis Trigger Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

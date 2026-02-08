from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from app.core.security import get_current_user
from app.services.gemini_service import GeminiService
from app.services.video_service import VideoService
from app.services.manual_service import ManualService
from pydantic import BaseModel
import os
import uuid

router = APIRouter()

TEMP_DIR = "/tmp/video_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

class AnalyzeRequest(BaseModel):
    manual_id: str
    video_url: str
    title: str = "無題の動画"

# Background Task Function
async def run_video_analysis(user_id: str, video_url: str, manual_id: str, title: str):
    file_path = None
    try:
        print(f"Background Task Started: {manual_id}, {video_url} for user {user_id}")
        
        # 1. Download Video
        blob_name = video_url
        if video_url.startswith("gs://"):
            parts = video_url.replace("gs://", "").split("/", 1)
            if len(parts) > 1:
                blob_name = parts[1]
        elif "storage.googleapis.com" in video_url:
            parts = video_url.split(f"/{os.getenv('BUCKET_NAME')}/")
            if len(parts) > 1:
                blob_name = parts[1]

        # 拡張子推定
        ext = os.path.splitext(blob_name)[1]
        if not ext:
            ext = ".mp4"
            
        file_id = str(uuid.uuid4())
        file_path = f"{TEMP_DIR}/{file_id}{ext}"
        
        print(f"Downloading video from Blob: {blob_name} to {file_path}")
        
        from app.repositories.gcs_repository import GCSRepository
        gcs_repo = GCSRepository()
        gcs_repo.download_file(blob_name, file_path)
        
        # 2. Run Analysis
        gemini_service = GeminiService()
        video_service = VideoService()
        manual_service = ManualService()
        
        await gemini_service.generate_manual_from_video(
            user_id=user_id,
            video_path=file_path,
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
    finally:
        # Cleanup temp video
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

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
        # We pass the GCS URL (or blob name) so the background task performs the download
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

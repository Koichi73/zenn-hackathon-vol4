from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from app.services.manual_service import ManualService
from pydantic import BaseModel
from typing import Optional
import shutil
import os
import uuid
import json

router = APIRouter()

TEMP_DIR = "/tmp/video_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

class PublishRequest(BaseModel):
    is_public: bool

@router.post("/save-manual")
async def save_manual(
    manual_id: str = Form(...),
    steps: str = Form(...),
    video: Optional[UploadFile] = File(None)
):
    try:
        steps_list = json.loads(steps)
        service = ManualService()
        
        # 保存先の準備
        video_path = None
        if video:
            video_id = str(uuid.uuid4())
            video_path = f"{TEMP_DIR}/save_{video_id}_{video.filename}"
            with open(video_path, "wb") as buffer:
                shutil.copyfileobj(video.file, buffer)
        
        result = await service.save_manual(
            steps=steps_list, 
            manual_id=manual_id,
            video_path=video_path
        )
        
        # Cleanup video if it was saved locally
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
            
        return {
            "status": "success",
            "message": "Manual and assets saved to GCS",
            "paths": result
        }
    except Exception as e:
        print(f"Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/public/manuals/{manual_id}")
async def get_public_manual(manual_id: str):
    service = ManualService()
    manual = service.get_public_manual(manual_id)
    if not manual:
        raise HTTPException(status_code=404, detail="Manual not found or not public")
    return manual

@router.put("/manuals/{manual_id}/publish")
async def toggle_manual_publish(manual_id: str, request: PublishRequest):
    # ログインユーザーのIDを取得する
    user_id = "test-user-001"
    
    service = ManualService()
    success = service.update_visibility(user_id, manual_id, request.is_public)
    
    if not success:
        raise HTTPException(status_code=404, detail="Manual not found")
        
    return {"status": "success", "is_public": request.is_public}

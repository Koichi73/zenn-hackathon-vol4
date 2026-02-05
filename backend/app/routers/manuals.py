from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from app.core.security import get_current_user
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
    title: str = Form(...),
    steps: str = Form(...),
    video: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user)
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
            user_id=user_id,
            steps=steps_list, 
            manual_id=manual_id,
            title=title,
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
async def toggle_manual_publish(
    manual_id: str, 
    request: PublishRequest,
    user_id: str = Depends(get_current_user)
):
    # ログインユーザーのIDを取得する
    
    service = ManualService()
    success = service.update_visibility(user_id, manual_id, request.is_public)
    
    if not success:
        raise HTTPException(status_code=404, detail="Manual not found")
        
    return {"status": "success", "is_public": request.is_public}

class TitleUpdateRequest(BaseModel):
    title: str

@router.put("/manuals/{manual_id}/title")
async def update_manual_title(
    manual_id: str,
    request: TitleUpdateRequest,
    user_id: str = Depends(get_current_user)
):
    service = ManualService()
    success = service.update_manual_title(user_id, manual_id, request.title)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update title")
        
    return {"status": "success", "title": request.title}

@router.get("/manuals")
async def list_user_manuals(user_id: str = Depends(get_current_user)):
    # ログインユーザーのIDを取得する
    
    service = ManualService()
    manuals = service.get_user_manuals(user_id)
    
    return {"manuals": manuals}

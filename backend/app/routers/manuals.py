from fastapi import APIRouter, HTTPException, Form, Depends
from app.core.security import get_current_user
from app.services.manual_service import ManualService
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter()

class PublishRequest(BaseModel):
    is_public: bool

@router.post("/save-manual")
async def save_manual(
    manual_id: str = Form(...),
    title: str = Form(...),
    steps: str = Form(...),
    user_id: str = Depends(get_current_user)
):
    try:
        steps_list = json.loads(steps)
        service = ManualService()
        
        result = await service.save_manual(
            user_id=user_id,
            steps=steps_list, 
            manual_id=manual_id,
            title=title
        )
            
        return {
            "status": "success",
            "message": "Manual structure saved",
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

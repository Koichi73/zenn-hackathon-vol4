from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from app.services.gemini_service import GeminiService, ManualStep
from app.services.video_service import VideoService
from app.services.manual_save_service import ManualSaveService
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import uuid
import json

router = APIRouter()

TEMP_DIR = "/tmp/video_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)


@router.post("/save-manual")
async def save_manual(
    manual_id: str = Form(...),
    steps: str = Form(...),
    video: Optional[UploadFile] = File(None)
):
    try:
        steps_list = json.loads(steps)
        save_service = ManualSaveService()
        
        # 保存先の準備
        video_path = None
        if video:
            video_id = str(uuid.uuid4())
            video_path = f"{TEMP_DIR}/save_{video_id}_{video.filename}"
            with open(video_path, "wb") as buffer:
                shutil.copyfileobj(video.file, buffer)
        
        result = await save_service.save_to_gcs(
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
            raise HTTPException(status_code=500, detail=str(e))
        
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

@router.post("/process-video-stream")
async def process_video_stream(file: UploadFile = File(...)):
    # 1. Save File
    file_id = str(uuid.uuid4())
    file_path = f"{TEMP_DIR}/{file_id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Generator Function
    async def event_generator():
        try:
            gemini_service = GeminiService()
            video_service = VideoService()

            # --- Phase 1: Structure Analysis ---
            # Analyze video structure (Timestamps & Titles)
            print("Server: Starting Phase 1 (Structure Analysis)")
            structures = await gemini_service.analyze_video_structure(file_path)
            print(f"Server: Phase 1 Complete. Found {len(structures)} steps.")
            
            # Send initial data to client
            init_data = {
                "type": "init",
                "steps": [s.model_dump() for s in structures] 
            }
            yield f"data: {json.dumps(init_data)}\n\n"
            print("Server: Sent 'init' event.")

            # --- Phase 2 & 3: Loop Processing ---
            for index, step_structure in enumerate(structures):
                try:
                    print(f"Server: Processing Step {index+1}/{len(structures)} - {step_structure.title}")
                    # Extract frames (using existing VideoService)
                    steps_for_extraction = [step_structure.model_dump()]
                    steps_with_images = await video_service.extract_frames(file_path, steps_for_extraction, start_index=index)
                    
                    if not steps_with_images or not steps_with_images[0].get("image_url"):
                         print(f"Skipping step {index}: Image extraction failed")
                         continue
                         
                    current_step_data = steps_with_images[0]

                    # Detailed Image Analysis
                    image_url = current_step_data.get("image_url")

                    # Notify 1 step image ready (send partial update)
                    print(f"Server: Image ready for Step {index+1}: {image_url}")
                    # Intermediate update skipped to show skeleton until full analysis

                    
                    # Resolve path for Gemini
                    full_image_path = gemini_service.resolve_image_path(image_url)
                    
                    print(f"Server: Analyzing image for Step {index+1}...")
                    detailed_step = await gemini_service.analyze_single_image(
                        file_path=full_image_path,
                        title=step_structure.title,
                        timestamp=step_structure.timestamp,
                        image_url=image_url
                    )

                    if detailed_step:
                        # Notify 1 step completion
                        update_data = {
                            "type": "update",
                            "index": index,
                            "step": detailed_step.model_dump()
                        }
                        yield f"data: {json.dumps(update_data)}\n\n"
                        print(f"Server: Sent 'update' event for Step {index+1}")
                    
                except Exception as step_err:
                    print(f"Error processing step {index}: {step_err}")
                    continue

            # --- Complete ---
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            print(f"Stream Error: {e}")
            error_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
        finally:
            # Cleanup
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as cleanup_err:
                    print(f"Cleanup Error: {cleanup_err}")


    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- 手順書共有エンドポイント ---

from app.services.manual_service import ManualService
from pydantic import BaseModel

class PublishRequest(BaseModel):
    is_public: bool

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

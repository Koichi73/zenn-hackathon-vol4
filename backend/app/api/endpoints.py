from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from app.services.gemini_service import GeminiService, ManualStep
from app.services.video_service import VideoService
from app.services.manual_service import ManualService
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import uuid
import json

class AnalyzeRequest(BaseModel):
    manual_id: str
    video_url: str
    title: str = "無題の動画"

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


from fastapi import BackgroundTasks

# Background Task Function
async def run_video_analysis(video_url: str, manual_id: str, title: str):
    file_path = None
    try:
        print(f"Background Task Started: {manual_id}, {video_url}")
        
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
             ManualService().update_manual_status(manual_id, "error")
        except:
             print("Failed to update status to error")
    finally:
        # Cleanup temp video
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

@router.post("/analyze", status_code=202)
async def analyze_video(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks
):
    # 1. Parse Params
    video_url = request.video_url
    manual_id = request.manual_id
    title = request.title
    
    try:
        # 2. Initialize Job in Firestore (STATUS: queued)
        manual_service = ManualService()
        manual_service.create_manual_job(manual_id, title)
        
        # 3. Add to Background Tasks
        # We pass the GCS URL (or blob name) so the background task performs the download
        background_tasks.add_task(run_video_analysis, video_url, manual_id, title)

        # 4. Return immediately
        return {
            "status": "accepted",
            "message": "Video analysis started (background)",
            "manual_id": manual_id
        }
        
    except Exception as e:
        print(f"Analysis Trigger Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Deprecated or unmodified endpoints below...
@router.post("/process-video")
async def process_video(file: UploadFile = File(...)):
    # ... legacy implementation or redirect to analyze ...
    pass

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

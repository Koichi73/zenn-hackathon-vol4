from google import genai
from google.genai import types
import os
from pathlib import Path
import asyncio
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from app.services.prompts import VIDEO_ANALYSIS_PROMPT, IMAGE_ANALYSIS_PROMPT
import time
import logging

load_dotenv()

# --- Logging Setup ---
logger = logging.getLogger("performance")
logger.setLevel(logging.INFO)

# File handler (コメントアウト解除でログファイルへ出力)
# file_handler = logging.FileHandler("performance.log")
# file_handler.setFormatter(logging.Formatter('%(message)s'))
# logger.addHandler(file_handler)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(message)s'))
logger.addHandler(console_handler)

# --- Pydantic Models ---

class BoundingBox(BaseModel):
    ymin: int
    xmin: int
    ymax: int
    xmax: int

class StepStructure(BaseModel):
    timestamp: str = Field(description="MM:SS format, chosen for the cleanest screenshot")
    title: str = Field(description="Short title of the action")

class MaskItem(BaseModel):
    label: str
    box: BoundingBox

class StepDetail(BaseModel):
    description: str = Field(description="Detailed instruction in Japanese")
    highlight_box: BoundingBox = Field(description="The UI element being interacted with")
    mask_boxes: List[MaskItem] = Field(description="List of PII areas to mask")

class ManualStep(BaseModel):
    timestamp: str
    title: str
    description: str
    highlight_box: BoundingBox
    mask_boxes: List[MaskItem]
    image_url: Optional[str] = None # Added field for image URL

# --- Service ---

class GeminiService:
    def __init__(self):
        project_id = os.getenv("PROJECT_ID")
        location = os.getenv("LOCATION", "us-central1")
        
        if not project_id:
            raise ValueError("PROJECT_ID not set in environment variables")
            
        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location
        )
        
        self.model_name = os.getenv("MODEL_NAME", "gemini-3-flash-preview")
        self.temperature = 1.0 if self.model_name == "gemini-3-flash-preview" else 0.0

    async def generate_manual_from_video(self, video_path: str, video_service, manual_id: str, manual_service, gcs_video_uri: Optional[str] = None) -> List[ManualStep]:
        """
        Main pipeline with Incremental Firestore Updates:
            1. Analyze video structure -> Update Firestore (Phase 1)
            2. Extract images
            3. Analyze images -> Update Firestore per step (Phase 3)
        """
        print(f"Starting analysis for: {gcs_video_uri if gcs_video_uri else video_path}")

        # Phase 1: Video Structure
        print("Phase 1: Analyzing video structure...")
        structures = await self.analyze_video_structure(gcs_video_uri if gcs_video_uri else video_path)
        if not structures:
            print("Phase 1 failed: No structure found.")
            # エラー状態更新などが必要だが、一旦終了
            manual_service.update_manual_status(manual_id, "error")
            return []
        
        print(f"Phase 1 complete. Found {len(structures)} steps.")

        # [Firestore Update] 骨組み保存
        # ManualStepの形に変換 (image_urlなどはNone)
        current_steps = []
        for s in structures:
            current_steps.append({
                "timestamp": s.timestamp,
                "title": s.title,
                "description": "", # Loading state handled by frontend
                "highlight_box": None,
                "mask_boxes": [],
                "image_url": None
            })
        
        manual_service.init_manual_steps(manual_id, current_steps)

        # Phase 2: Image Extraction
        manual_service.update_manual_status(manual_id, "extracting_images")
        
        steps_for_extraction = [s.model_dump() for s in structures]
        print("Phase 2: Extracting images...")
        
        # 注意: GCSの動画パスを渡す必要があるが、video_serviceはローカルファイルを期待している。
        # 現在のvideo_pathはローカルの一時ファイルパスのはずなのでOK。
        steps_with_images = await video_service.extract_frames(video_path, steps_for_extraction)
        
        # Verify images were extracted
        valid_steps = [s for s in steps_with_images if s.get("image_url")]
        
        if not valid_steps:
             print("Phase 2 failed: No images extracted.")
             manual_service.update_manual_status(manual_id, "error")
             return []

        print(f"Phase 2 complete. Extracted {len(valid_steps)} images.")
        
        # GCSへの画像アップロードが必要
        # extract_frames は /static/... を返すが、これをGCSに上げてURL更新する必要がある。
        # ManualService.save_manual のロジックの一部を再利用したいが、
        # ここでは簡易的に「ここでアップロード」してしまう。
        # または、今回はFrontendから直接GCS参照できない（Privateバケットなら）が、
        # Publicバケット前提か、もしくは「詳細解析」のループ内で順次アップロード＆更新を行う。
        
        # GCS Repository for image upload
        from app.repositories.gcs_repository import GCSRepository
        gcs_repo = GCSRepository()
        
        # Phase 3: Image Analysis Loop & Incremental Update
        manual_service.update_manual_status(manual_id, "analyzing_details")
        print("Phase 3: Analyzing images sequentially for real-time updates...")
        
        final_steps = []
        # current_steps (スケルトン) をベースに更新していく
        
        for i, step_data in enumerate(valid_steps):
            image_url = step_data.get("image_url")
            title = step_data.get("title")
            timestamp = step_data.get("timestamp")

            # 1. 画像アップロード (Local -> GCS)
            # ローカルパス解決
            local_file_path = self.resolve_image_path(image_url)
            public_image_url = image_url 
            
            try:
                if os.path.exists(local_file_path):
                    filename = os.path.basename(local_file_path)
                    # manuals/{id}/images/step_X.jpg
                    gcs_dest_path = f"manuals/{manual_id}/images/{filename}"
                    
                    public_image_url = await asyncio.to_thread(
                        gcs_repo.upload_file,
                        local_file_path,
                        gcs_dest_path
                    )
                    print(f"Uploaded image to: {public_image_url}")
            except Exception as e:
                print(f"Image upload failed for step {i}: {e}")

            # 2. 詳細解析
            analyzed_step = await self.analyze_single_image(local_file_path, title, timestamp, public_image_url)
            
            if analyzed_step:
                # 3. リスト更新
                step_dict = analyzed_step.model_dump()
                
                # uploadによりURLが変わったので反映
                step_dict["image_url"] = public_image_url
                
                # 既存のリストを置換
                if i < len(current_steps):
                    current_steps[i] = step_dict
                else:
                    current_steps.append(step_dict)
                
                # [Firestore Update] 1ステップごとに更新
                manual_service.update_manual_steps(manual_id, current_steps)
        
        print("Phase 3 complete.")
        manual_service.complete_manual_job(manual_id, current_steps)
        return [ManualStep(**s) for s in current_steps]

    async def analyze_video_structure(self, video_path: str) -> List[StepStructure]:
        """
        Phase 1: Video to Structure (Timestamps & Titles)
        Supports local file path or GCS URI (gs://...)
        """
        if video_path.startswith("gs://"):
             video_part = types.Part.from_uri(
                file_uri=video_path,
                mime_type="video/mp4"
            )
        else:
            with open(video_path, "rb") as f:
                video_data = f.read()
                
            video_part = types.Part.from_bytes(
                data=video_data,
                mime_type="video/mp4"
            )

        prompt = VIDEO_ANALYSIS_PROMPT
        
        start_time = time.time()
        logger.info("START: analyze_video_structure")

        try:
            # Run blocking API call in thread
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model_name,
                contents=[video_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=list[StepStructure],
                    temperature=self.temperature,
                )
            )
            
            duration = time.time() - start_time
            logger.info(f"END: analyze_video_structure. Duration: {duration:.4f}s")
            
            return response.parsed
        except Exception as e:
            logger.error(f"Error in analyze_video_structure: {e}")
            print(f"Error in Phase 1: {e}")
            return []

    async def _analyze_images_parallel(self, steps_with_images: List[dict]) -> List[ManualStep]:
        """
        Phase 3: Parallel Image Analysis
        """
        tasks = []
        for step in steps_with_images:
            image_url = step.get("image_url")
            title = step.get("title")
            timestamp = step.get("timestamp")
            

            # Helper to resolve path
            file_path = self.resolve_image_path(image_url)
            
            tasks.append(self.analyze_single_image(file_path, title, timestamp, image_url))

        results = await asyncio.gather(*tasks)
        # Filter out Nones
        return [r for r in results if r is not None]

    async def analyze_single_image(self, file_path: str, title: str, timestamp: str, image_url: str) -> Optional[ManualStep]:
        try:
            if not os.path.exists(file_path):
                 print(f"Image not found: {file_path}")
                 return None

            with open(file_path, "rb") as f:
                image_data = f.read()

            image_part = types.Part.from_bytes(
                data=image_data,
                mime_type="image/jpeg"
            )

            prompt = IMAGE_ANALYSIS_PROMPT.format(title=title)
            
            start_time = time.time()
            logger.info(f"START: analyze_single_image for step '{title}'")

            # Run blocking API call in thread
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model_name,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=StepDetail,
                    temperature=self.temperature,
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                )
            )
            
            duration = time.time() - start_time
            logger.info(f"END: analyze_single_image for step '{title}'. Duration: {duration:.4f}s")
            
            parsed_response = response.parsed
            
            # Debug log
            if parsed_response:
                print(parsed_response.model_dump())
            
            try:
                # Create ManualStep and ensure validation passes
                step = ManualStep(
                    timestamp=timestamp,
                    title=title,
                    description=parsed_response.description,
                    highlight_box=parsed_response.highlight_box,
                    mask_boxes=parsed_response.mask_boxes,
                    image_url=image_url
                )
                return step
            except Exception as valid_err:
                 print(f"Validation Error creating ManualStep for {title}: {valid_err}")
                 return None

        except Exception as e:
            print(f"Error in Phase 3 for {title}: {e}")
            return None
    
    def resolve_image_path(self, image_url: str) -> str:
        """
        Resolves the absolute file system path from the image URL.
        """
        if not image_url:
            return ""

        if image_url.startswith("/static/"):
            app_dir = Path(__file__).resolve().parent.parent
            relative_path = image_url.lstrip("/")
            return str(app_dir / relative_path)
        
        return image_url


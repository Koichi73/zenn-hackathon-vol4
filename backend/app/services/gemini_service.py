from google import genai
from google.genai import types
import os
from pathlib import Path
import asyncio
import tempfile
import shutil
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from app.services.prompts import VIDEO_ANALYSIS_PROMPT, IMAGE_ANALYSIS_PROMPT
import time
import logging
import uuid
from app.repositories.gcs_repository import GCSRepository
from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception_type, before_sleep

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
    highlight_boxes: List[BoundingBox]
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
            location=location,
        )
        
        self.model_name = os.getenv("MODEL_NAME", "gemini-3-flash-preview")
        self.temperature = 1.0 if self.model_name == "gemini-3-flash-preview" else 0.0

    def _is_quota_error(self, exception):
        """429エラーかどうかを判定"""
        error_msg = str(exception).lower()
        return "429" in error_msg or "too many requests" in error_msg or "quota" in error_msg or "resource exhausted" in error_msg

    def _log_retry_attempt(self, retry_state):
        """Tenacity: リトライ発生時に呼ばれるコールバック"""
        exception = retry_state.outcome.exception()
        wait_time = retry_state.next_action.sleep
        
        if self._is_quota_error(exception):
            logger.warning(
                f"🚨 Gemini API Quota Exceeded (429). Retrying in {wait_time:.2f}s... "
                f"(Attempt {retry_state.attempt_number}) - Error: {exception}"
            )
            # ここでSlack通知などの追加アクションが可能
        else:
            logger.warning(
                f"⚠️ Gemini API Request Failed. Retrying in {wait_time:.2f}s... "
                f"(Attempt {retry_state.attempt_number}) - Error: {exception}"
            )

    async def generate_manual_from_video(self, user_id: str, video_service, manual_id: str, manual_service, gcs_video_uri: str) -> List[ManualStep]:
        """
        Main pipeline with Incremental Firestore Updates:
            1. Analyze video structure (Phase 1)
            2. Download Video (for Phase 2)
            3. Extract images (Phase 2)
            4. Analyze images (Phase 3)
        """
        if not gcs_video_uri:
            raise ValueError("gcs_video_uri is required for video analysis")
            
        print(f"Starting analysis for: {gcs_video_uri}")

        # Phase 1: Video Structure
        print("Phase 1: Analyzing video structure...")
        structures = await self.analyze_video_structure(gcs_video_uri, user_id, manual_id, manual_service)
        if not structures:
            print("Phase 1 failed: No structure found.")
            manual_service.update_manual_status(user_id, manual_id, "error")
            return []
        
        print(f"Phase 1 complete. Found {len(structures)} steps.")

        # [Firestore Update] 骨組み保存
        current_steps = []
        for s in structures:
            current_steps.append({
                "timestamp": s.timestamp,
                "title": s.title,
                "description": "", # Loading state handled by frontend
                "highlight_boxes": [],
                "mask_boxes": [],
                "image_url": None
            })
        
        manual_service.init_manual_steps(user_id, manual_id, current_steps)

        # Temporary directory for video and images
        with tempfile.TemporaryDirectory() as temp_dir:
            video_local_path = None
            try:
                # GCS Repository instance
                gcs_repo = GCSRepository()

                # Phase 2 Preparation: Download Video
                print(f"Downloading video for frame extraction: {gcs_video_uri}")
                
                # Determine temp filename
                ext = os.path.splitext(gcs_video_uri)[1] or ".mp4"
                temp_filename = f"{uuid.uuid4()}{ext}"
                video_local_path = os.path.join(temp_dir, temp_filename)
                
                gcs_repo.download_file_from_uri(gcs_video_uri, video_local_path)
                
                # Phase 2: Image Extraction
                manual_service.update_manual_status(user_id, manual_id, "extracting_images")
                
                steps_for_extraction = [s.model_dump() for s in structures]
                print("Phase 2: Extracting images...")
                
                # Extract frames to the temp directory
                steps_with_images = await video_service.extract_frames(video_local_path, steps_for_extraction, temp_dir)
                
                # Verify images were extracted
                valid_steps = [s for s in steps_with_images if s.get("image_path")]
                
                if not valid_steps:
                     print("Phase 2 failed: No images extracted.")
                     manual_service.update_manual_status(user_id, manual_id, "error")
                     return []
        
                print(f"Phase 2 complete. Extracted {len(valid_steps)} images.")
                
                # ローカル動画の削除
                if video_local_path:
                    Path(video_local_path).unlink(missing_ok=True)
                    print(f"Deleted local video: {video_local_path}")
                
                # Phase 3: Image Analysis Loop & Incremental Update (Parallelized)
                manual_service.update_manual_status(user_id, manual_id, "analyzing_details")
                print("Phase 3: Analyzing images in parallel for real-time updates...")
                
                # Semaphore to limit concurrency (e.g., 5 parallel requests)
                semaphore = asyncio.Semaphore(5)

                async def _process_single_step(i: int, step_data: dict):
                    async with semaphore:
                        local_file_path = step_data.get("image_path")
                        title = step_data.get("title")
                        timestamp = step_data.get("timestamp")
            
                        # 1. 画像アップロード (Temp -> GCS)
                        filename = os.path.basename(local_file_path)
                        gcs_dest_path = f"manuals/{manual_id}/images/{filename}"
                        
                        try:
                            public_image_url = await asyncio.to_thread(
                                gcs_repo.upload_file,
                                local_file_path,
                                gcs_dest_path
                            )
                            print(f"Uploaded image to: {public_image_url}")

                            # ローカル画像の削除
                            Path(local_file_path).unlink(missing_ok=True)
                            
                            # Gemini解析用に gs:// から始まるURIを作成
                            gcs_image_uri = gcs_repo.get_gcs_uri(gcs_dest_path)
                            
                        except Exception as e:
                            print(f"Image upload failed for step {i}: {e}")
                            raise e

                        # 2. 詳細解析
                        analyzed_step = await self.analyze_single_image(
                            gcs_image_uri, title, timestamp, public_image_url,
                            user_id, manual_id, manual_service
                        )
                        
                        if analyzed_step:
                            # 3. リスト更新
                            step_dict = analyzed_step.model_dump()
                            current_steps[i] = step_dict
                            
                            # [Firestore Update] 1ステップごとに更新
                            try:
                                manual_service.update_manual_steps(user_id, manual_id, current_steps)
                            except Exception as e:
                                print(f"Firestore update failed for step {i}: {e}")

                # Create tasks for all steps
                tasks = [_process_single_step(i, step_data) for i, step_data in enumerate(valid_steps)]
                
                # Execute all tasks concurrently
                await asyncio.gather(*tasks)
        
                print("Phase 3 complete.")
                await manual_service.complete_manual_job(user_id, manual_id, current_steps)
                return [ManualStep(**s) for s in current_steps]

            except Exception as e:
                print(f"Error in generate_manual_from_video: {e}")
                manual_service.update_manual_status(user_id, manual_id, "error")
                return []
        
    async def analyze_video_structure(self, video_path: str, user_id: str, manual_id: str, manual_service) -> List[StepStructure]:
        """
        Phase 1: Video to Structure (Timestamps & Titles)
        """
        if not video_path.startswith("gs://"):
            raise ValueError(f"video_path must start with gs://. Got: {video_path}")

        video_part = types.Part.from_uri(
            file_uri=video_path,
            mime_type="video/mp4"
        )

        prompt = VIDEO_ANALYSIS_PROMPT
        
        start_time = time.time()
        logger.info("START: analyze_video_structure")

        def _on_retry(retry_state):
            # 1. 既存のログ出力
            self._log_retry_attempt(retry_state)
            
            # 2. Firestore更新 (同期処理)
            exception = retry_state.outcome.exception()
            if self._is_quota_error(exception):
                try:
                    manual_service.update_manual_status(
                        user_id, 
                        manual_id, 
                        status="analyzing_structure", 
                        error_code="429_retry"
                    )
                except Exception as e:
                    print(f"Failed to update manual status on retry: {e}")

        try:
            # tenacityによるリトライアノテーション
            @retry(
                retry=retry_if_exception_type(Exception),
                stop=stop_after_attempt(10),
                wait=wait_random_exponential(multiplier=2, min=10, max=60),
                before_sleep=_on_retry
            )
            def _call_gemini_structure():

                return self.client.models.generate_content(
                    model=self.model_name,
                    contents=[video_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=list[StepStructure],
                        temperature=self.temperature,
                    )
                )

            # Run blocking API call in thread
            response = await asyncio.to_thread(_call_gemini_structure)
            
            duration = time.time() - start_time
            logger.info(f"END: analyze_video_structure. Duration: {duration:.4f}s")
            
            return response.parsed
        except Exception as e:
            logger.error(f"Error in analyze_video_structure: {e}")
            print(f"Error in Phase 1: {e}")
            return []

    async def analyze_single_image(self, image_uri: str, title: str, timestamp: str, image_url: str,
                                   user_id: str, manual_id: str, manual_service) -> Optional[ManualStep]:
        try:
            image_part = types.Part.from_uri(
                file_uri=image_uri,
                mime_type="image/jpeg"
            )

            prompt = IMAGE_ANALYSIS_PROMPT.format(title=title)
            
            start_time = time.time()
            logger.info(f"START: analyze_single_image for step '{title}' ({image_uri})")

            def _on_retry(retry_state):
                # 1. ログ出力
                self._log_retry_attempt(retry_state)
                
                # 2. Firestore更新
                exception = retry_state.outcome.exception()
                if self._is_quota_error(exception):
                    try:
                        manual_service.update_manual_status(
                            user_id, 
                            manual_id, 
                            status="analyzing_details", 
                            error_code="429_retry"
                        )
                    except Exception as e:
                        print(f"Failed to update manual status on retry: {e}")

            # tenacityによるリトライアノテーション
            @retry(
                retry=retry_if_exception_type(Exception),
                stop=stop_after_attempt(10),
                wait=wait_random_exponential(multiplier=2, min=10, max=60),
                before_sleep=_on_retry
            )
            def _call_gemini_image():

                return self.client.models.generate_content(
                    model=self.model_name,
                    contents=[image_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=StepDetail,
                        temperature=self.temperature,
                        thinking_config=types.ThinkingConfig(thinking_level="low"),
                    )
                )

            # Run blocking API call in thread
            response = await asyncio.to_thread(_call_gemini_image)
            
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
                    highlight_boxes=[parsed_response.highlight_box] if parsed_response.highlight_box else [],
                    mask_boxes=parsed_response.mask_boxes,
                    image_url=image_url
                )
                return step
            except Exception as valid_err:
                 print(f"Validation Error creating ManualStep for {title}: {valid_err}")
                 return None

        except Exception as e:
            print(f"Error in Phase 3 for {title}: {e}")
            raise e
    


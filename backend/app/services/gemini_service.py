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

    async def generate_manual_from_video(self, video_path: str, video_service) -> List[ManualStep]:
        """
        Main pipeline:
            1. Analyze video structure (timestamps & titles)
            2. Extract images using VideoService
            3. Analyze images for details (masks, highlight, descriptions)
        """
        print(f"Starting analysis for: {video_path}")

        # Phase 1: Video Structure
        print("Phase 1: Analyzing video structure...")
        structures = await self.analyze_video_structure(video_path)
        if not structures:
            print("Phase 1 failed: No structure found.")
            return []
        
        print(f"Phase 1 complete. Found {len(structures)} steps.")

        # Phase 2: Image Extraction
        steps_for_extraction = [s.model_dump() for s in structures]
        
        print("Phase 2: Extracting images...")
        steps_with_images = await video_service.extract_frames(video_path, steps_for_extraction)
        
        # Verify images were extracted
        valid_steps = [s for s in steps_with_images if s.get("image_url")]
        
        if not valid_steps:
             print("Phase 2 failed: No images extracted.")
             return []

        print(f"Phase 2 complete. Extracted {len(valid_steps)} images.")

        # Phase 3: Image Analysis
        print("Phase 3: Analyzing images in parallel...")
        final_steps = await self._analyze_images_parallel(valid_steps)
        
        print("Phase 3 complete.")
        return final_steps

    async def analyze_video_structure(self, video_path: str) -> List[StepStructure]:
        """
        Phase 1: Video to Structure (Timestamps & Titles)
        """
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


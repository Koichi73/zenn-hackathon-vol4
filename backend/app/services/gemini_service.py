from google import genai
from google.genai import types
import os
import json
import asyncio
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

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

    async def generate_manual_from_video(self, video_path: str, video_service) -> List[ManualStep]:
        """
        Main pipeline:
        1. Phase 1: Analyze video structure (timestamps & titles)
        2. Phase 2: Extract images using VideoService
        3. Phase 3: Analyze images for details (masks, descriptions)
        """
        print(f"Starting analysis for: {video_path}")

        # Phase 1: Video Structure
        print("Phase 1: Analyzing video structure...")
        structures = await self._analyze_video_structure(video_path)
        if not structures:
            print("Phase 1 failed: No structure found.")
            return []
        
        print(f"Phase 1 complete. Found {len(structures)} steps.")

        # Phase 2: Image Extraction
        # VideoService expects a list of dicts with 'timestamp'
        # We need to adapt the input for VideoService
        steps_for_extraction = [s.model_dump() for s in structures]
        
        print("Phase 2: Extracting images...")
        # Note: video_service.extract_frames is async
        # It updates the list in-place or returns a new list with 'image_url'
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

    async def _analyze_video_structure(self, video_path: str) -> List[StepStructure]:
        """
        Phase 1: Video to Structure (Timestamps & Titles)
        """
        with open(video_path, "rb") as f:
            video_data = f.read()
            
        video_part = types.Part.from_bytes(
            data=video_data,
            mime_type="video/mp4"
        )

        prompt = """
        Analyze the video and extract the sequence of operations.
        For each step, identify a short 'title' and the best 'timestamp' to take a screenshot.

        CRITICAL INSTRUCTIONS FOR TIMESTAMP SELECTION:
        - Choose the moment BEFORE the action is completed, but clearly visible.
        - The screen must be CLEAN.
        - AVOID timestamps where "password save popups", "tooltips", or "loading spinners" obscure the UI.
        - If a popup appears after a click, select the frame JUST BEFORE the click or BEFORE the popup appears.
        
        Output a list of StepStructure objects.
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[video_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=list[StepStructure]
                )
            )
            # The SDK with response_schema should return a parsed object if we used `parsed` property?
            # Or currently strictly returns text. Converting text to objects.
            # Using 'response.text' and generic json loading for robustness if SDK version varies.
            data = json.loads(response.text)
            return [StepStructure(**item) for item in data]
        except Exception as e:
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
            
            # The image_url is like "/static/images/..."
            # We need the absolute path to read the file content.
            # Assuming standard path structure: app/static/images/...
            # We need to map URL back to file path.
            # step['image_url'] comes from VideoService which sets it to /static/images/...
            # We can reconstruct valid file path relative to project root or use what we know.
            
            # Helper to resolve path
            # TODO: Make this robust. Assuming running from backend root.
            relative_path = image_url.lstrip("/") # static/images/...
            # If running from backend directory, 'app/static/images' might be the physical path
            # The url is '/static/images/...', physical is 'app/static/images/...'
            # Let's try to infer from 'app' + url if it starts with /static
            
            if image_url.startswith("/static/"):
                file_path = f"app{image_url}"
            else:
                file_path = image_url # Fallback
            
            tasks.append(self._analyze_single_image(file_path, title, timestamp, image_url))

        results = await asyncio.gather(*tasks)
        # Filter out Nones
        return [r for r in results if r is not None]

    async def _analyze_single_image(self, file_path: str, title: str, timestamp: str, image_url: str) -> Optional[ManualStep]:
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

            prompt = f"""
            Analyze this UI screenshot for a manual step titled: "{title}".
            
            1. Identify the UI element (button, link, field) related to "{title}".
               - Return its bounding box as 'highlight_box'.
            
            2. Identify detailed masking requirements.
               - Find ALL personal information (PII) such as email addresses, names, IDs.
               - Return a list of 'mask_boxes', each with a 'label' and 'box'.
            
            3. Write a detailed instruction description in Japanese.
            
            Input Title: {title}
            """

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=StepDetail
                )
            )
            
            detail_data = json.loads(response.text)
            detail = StepDetail(**detail_data)

            print(detail_data)
            
            try:
                # Create ManualStep and ensure validation passes
                step = ManualStep(
                    timestamp=timestamp,
                    title=title,
                    description=detail.description,
                    highlight_box=detail.highlight_box,
                    mask_boxes=detail.mask_boxes,
                    image_url=image_url
                )
                return step
            except Exception as valid_err:
                 print(f"Validation Error creating ManualStep for {title}: {valid_err}")
                 return None

        except Exception as e:
            print(f"Error in Phase 3 for {title}: {e}")
            return None


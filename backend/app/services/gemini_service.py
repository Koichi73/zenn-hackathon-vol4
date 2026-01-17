import vertexai
from vertexai.generative_models import GenerativeModel, Part
import os
import json
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    def __init__(self):
        project_id = os.getenv("PROJECT_ID")
        location = os.getenv("LOCATION", "us-central1")
        
        if not project_id:
            raise ValueError("PROJECT_ID not set in environment variables")
            
        vertexai.init(project=project_id, location=location)
        # Using Gemini 1.5 Flash as it is available and multimodal
        # Gemini 3 implies newer models, check availability. 
        # For now using 'gemini-1.5-flash-001' or similar reliable model.
        self.model = GenerativeModel("gemini-2.0-flash-exp")

    async def analyze_video(self, video_path: str):
        """
        Analyzes the video and extracts steps in JSON format using Gemini.
        """
        
        # 1. Read video file
        # Vertex AI GenerativeModel supports passing bytes or URI.
        # For local file -> bytes or upload to GCS. 
        # Large videos should be on GCS, but for MVP local bytes might work for short clips
        # Or using Part.from_data if supported for video/mp4.
        
        # Ideally, we should upload to GCS for Vertex AI to access video reliably.
        # However, for 'Flash' models, sending bytes directly is supported up to a limit.
        
        with open(video_path, "rb") as f:
            video_data = f.read()
            
        video_part = Part.from_data(data=video_data, mime_type="video/mp4")
        
        prompt = """
        You are an expert technical writer.
        Analyze this video and create a step-by-step instruction manual.
        
        Output valid JSON with the following structure:
        [
            {
                "title": "Step Title",
                "description": "Detailed description of the action.",
                "timestamp": "MM:SS"
            }
        ]
        
        - The timestamp must be in MM:SS format (e.g., 00:05).
        - Choose the exact moment where the action is clearly visible for a screenshot.
        - Respond ONLY with the JSON.
        """
        
        response = self.model.generate_content(
            [video_part, prompt],
            generation_config={"response_mime_type": "application/json"}
        )
        
        try:
            steps = json.loads(response.text)
            return steps
        except json.JSONDecodeError:
            # Fallback or robust parsing could go here
            print(f"Failed to parse JSON: {response.text}")
            return []

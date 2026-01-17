from google import genai
from google.genai import types
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
            
        # Initialize Google Gen AI Client for Vertex AI
        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location
        )
        
        # Using Gemini 3 Flash Preview as requested
        self.model_name = os.getenv("MODEL_NAME", "gemini-3-flash-preview")

    async def analyze_video(self, video_path: str):
        """
        Analyzes the video and extracts steps in JSON format using Gemini.
        """
        
        # Read video file
        with open(video_path, "rb") as f:
            video_data = f.read()
            
        video_part = types.Part.from_bytes(
            data=video_data,
            mime_type="video/mp4"
        )
        
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
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[video_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            # The new SDK parses JSON automatically if response_mime_type is application/json
            # But specific behavior might depend on SDK version. 
            # safe assumption: response.text contains the JSON string.
            
            steps = json.loads(response.text)
            return steps
        except Exception as e:
            print(f"Error during Gemini analysis: {e}")
            return []

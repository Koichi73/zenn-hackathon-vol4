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
        You are an expert technical writer and security compliance officer.
        Analyze this video and create a step-by-step instruction manual.
        
        You have two key visual tasks:
        1. Identify the ACTIVE ELEMENT (button, link, field) being interacted with in the step.
        2. Identify PERSONAL INFORMATION (PII) that must be masked.

        CRITICAL INSTRUCTIONS FOR BUTTON HIGHLIGHTING:
        - Identify the specific button, link, menu item, or input field being clicked or interacted with.
        - Create a bounding box around this element.
        - Mark this with type: "highlight".

        CRITICAL INSTRUCTIONS FOR PRIVACY MASKING:
        - Identify personal information (email, phone, address, credit card, SSN, passwords, Japanese names).
        - Check window title bars and file explorer paths.
        - Mark this with type: "privacy".

        Output valid JSON with the following structure:
        [
            {
                "title": "Step Title",
                "description": "Detailed description of the action.",
                "timestamp": "MM:SS",
                "masks": [
                    {
                        "label": "submit button",
                        "box_2d": [ymin, xmin, ymax, xmax],
                        "type": "highlight"
                    },
                    {
                        "label": "email address",
                        "box_2d": [ymin, xmin, ymax, xmax],
                        "type": "privacy"
                    }
                ]
            }
        ]
        
        - The timestamp must be in MM:SS format (e.g., 00:05).
        - Choose the exact moment where the action is clearly visible for a screenshot.
        - "box_2d": Normalized coordinates [ymin, xmin, ymax, xmax] on a scale of 0 to 1000.
        - IMPORTANT: Coordinates MUST be integers between 0 and 1000.
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

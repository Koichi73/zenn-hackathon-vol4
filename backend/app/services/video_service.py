import subprocess
import os
import asyncio

class VideoService:
    def __init__(self):
        pass

    async def extract_frames(self, video_path: str, steps: list, output_dir: str, start_index: int = 0):
        """
        Extracts frames from the video at the given timestamps.
        
        Args:
            video_path: Path to the input video file.
            steps: List of step dictionaries containing 'timestamp'.
            output_dir: Directory to save extracted images.
            start_index: The starting index for step numbering (default: 0).
            
        Returns:
            List of steps with an added 'image_path' field (absolute local path).
        """
        
        # Ensure output directory exists (caller should ideally handle this, but safe to have)
        os.makedirs(output_dir, exist_ok=True)
        
        updated_steps = []
        
        for i, step in enumerate(steps):
            current_index = start_index + i
            timestamp = step.get("timestamp")
            if not timestamp:
                updated_steps.append(step)
                continue
                
            # Create a safe filename
            # cleaner timestamp for filename
            clean_ts = timestamp.replace(":", "-").replace(".", "_")
            image_filename = f"step_{current_index + 1}_{clean_ts}.jpg"
            image_path = os.path.join(output_dir, image_filename)
            
            # Construct FFmpeg command
            # -ss before -i for faster seeking
            # -vframes 1 to extract strictly one frame
            # -y to overwrite existing file
            command = [
                "ffmpeg",
                "-ss", timestamp,
                "-i", video_path,
                "-vframes", "1",
                "-q:v", "2", # High quality jpeg
                "-y",
                image_path
            ]
            
            try:
                # Run blocking subprocess in thread
                await asyncio.to_thread(
                    subprocess.run,
                    command,
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Return absolute path so caller can decide what to do (upload to GCS, etc.)
                step["image_path"] = os.path.abspath(image_path)
                
            except subprocess.CalledProcessError as e:
                print(f"Error extracting frame at {timestamp}: {e}")
                step["image_path"] = None 
                
            updated_steps.append(step)
            
        return updated_steps

import subprocess
import os

class VideoService:
    def __init__(self):
        pass

    async def extract_frames(self, video_path: str, steps: list, output_dir: str = "app/static/images"):
        """
        Extracts frames from the video at the given timestamps.
        
        Args:
            video_path: Path to the input video file.
            steps: List of step dictionaries containing 'timestamp'.
            output_dir: Directory to save extracted images.
            
        Returns:
            List of steps with an added 'image_url' field.
        """
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        updated_steps = []
        
        for i, step in enumerate(steps):
            timestamp = step.get("timestamp")
            if not timestamp:
                updated_steps.append(step)
                continue
                
            # Create a safe filename
            # cleaner timestamp for filename
            clean_ts = timestamp.replace(":", "-").replace(".", "_")
            image_filename = f"step_{i+1}_{clean_ts}.jpg"
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
                subprocess.run(
                    command,
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Assuming static files are served from /static/images/
                # We hardcode the URL path to match the mount point in main.py
                # This assumes output_dir ends in "images" or is the mounted directory.
                
                # For MVP, we know endpoints.py passes app/static/images
                # and main.py mounts app/static to /static.
                # So the file at app/static/images/foo.jpg is accessible at /static/images/foo.jpg
                
                step["image_url"] = f"/static/images/{image_filename}"
                
            except subprocess.CalledProcessError as e:
                print(f"Error extracting frame at {timestamp}: {e}")
                step["image_url"] = None # Indicate failure or use placeholder
                
            updated_steps.append(step)
            
        return updated_steps

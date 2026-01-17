import subprocess

class VideoService:
    def __init__(self):
        pass

    async def extract_frames(self, video_path: str, steps: list, output_dir: str = "static/images"):
        """
        Extracts frames from the video at the given timestamps.
        
        Args:
            video_path: Path to the input video file.
            steps: List of step dictionaries containing 'timestamp'.
            output_dir: Directory to save extracted images.
            
        Returns:
            List of steps with an added 'image_url' field.
        """
        import os
        
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
            clean_ts = timestamp.replace(":", "-")
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
                # We need to return the URL path relative to the domain
                # The mounting point in main.py will likely be "/static" pointing to "static" dir.
                # So if we verify file is at backend/static/images/foo.jpg, and we mount backend/static -> /static
                # URL is /static/images/foo.jpg
                
                # However, the output_dir passed in might be absolute or relative. 
                # Let's clean up the path for the URL.
                
                # If output_dir is "static/images", then url is "/static/images/..."
                
                # We will normalize to return the relative path that the frontend can use
                # based on how we mount in main.py. 
                # Let's assume standard conventions: 
                # If saved to 'app/static/images', and we mount 'app/static' to '/static', 
                # then URL is '/static/images/filename'.
                
                # For this implementation, let's allow the caller to handle full URL construction 
                # or just return the filename/relative path.
                # Returning the relative web path seems most useful.
                
                step["image_url"] = f"/static/images/{image_filename}"
                
            except subprocess.CalledProcessError as e:
                print(f"Error extracting frame at {timestamp}: {e}")
                step["image_url"] = None # Indicate failure or use placeholder
                
            updated_steps.append(step)
            
        return updated_steps

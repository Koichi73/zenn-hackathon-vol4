import asyncio
import os
from pathlib import Path
from app.repositories.gcs_repository import GCSRepository
from app.services.manual_format_service import ManualFormatService
from datetime import datetime

class ManualSaveService:
    def __init__(self):
        self.gcs_repository = GCSRepository()
        self.formatter = ManualFormatService()
        self.app_dir = Path(__file__).resolve().parent.parent

    async def save_to_gcs(self, steps: list[dict], manual_id: str, video_path: str = None):
        """
        画像、動画、および手順書JSONをGCSに保存
        """
        updated_steps = []
        now_timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        full_id = f"{manual_id}_{now_timestamp}"

        # 1. 各ステップの画像をアップロードしてURLを置換
        for step in steps:
            new_step = step.copy()
            image_url = step.get("image_url")

            if image_url and image_url.startswith("/static/"):
                # ローカルの絶対パスに変換
                relative_path = image_url.lstrip("/")
                local_path = str(self.app_dir / relative_path)

                if os.path.exists(local_path):
                    # GCSの保存先: manuals/{full_id}/images/{filename}
                    filename = os.path.basename(local_path)
                    gcs_dest_path = f"manuals/{full_id}/images/{filename}"

                    # アップロード実行
                    public_url = await asyncio.to_thread(
                        self.gcs_repository.upload_file,
                        local_path,
                        gcs_dest_path
                    )
                    # JSON内のURLをGCSのURLに書き換え
                    new_step["image_url"] = public_url
            
            updated_steps.append(new_step)

        # 2. GCSに動画をアップロード
        gcs_video_path = f"manuals/{full_id}/video.mp4"
        if video_path and os.path.exists(video_path):
            try:
                await asyncio.to_thread(
                    self.gcs_repository.upload_file,
                    video_path,
                    gcs_video_path
                )
            except Exception as gcs_err:
                print(f"GCS Video Upload Error: {gcs_err}")
                raise gcs_err

        # 3. 更新されたステップ情報でJSONを作成
        json_content = self.formatter.to_json(updated_steps)
        json_path = f"manuals/{full_id}/manual.json"

        # JSONをアップロード
        await asyncio.to_thread(
            self.gcs_repository.upload_structure_content, 
            json_content, 
            json_path, 
            "application/json"
        )

        return {
            "json_path": json_path,
            "video_path": gcs_video_path,
            "image_count": len([s for s in updated_steps if s.get("image_url", "").startswith("http")])
        }

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

    async def save_to_gcs(self, steps: list[dict], manual_id: str):
        """
        画像と手順書JSONをGCSに保存
        """
        updated_steps = []

        # 1. 各ステップの画像をアップロードしてURLを置換
        for step in steps:
            new_step = step.copy()
            image_url = step.get("image_url")

            if image_url and image_url.startswith("/static/"):
                # ローカルの絶対パスに変換
                # 例: /static/frames/xxx.jpg -> backend/app/static/frames/xxx.jpg
                relative_path = image_url.lstrip("/")
                local_path = str(self.app_dir / relative_path)

                if os.path.exists(local_path):
                    # GCSの保存先: manuals/images/{manual_id}/{filename}
                    filename = os.path.basename(local_path)
                    gcs_dest_path = f"manuals/images/{manual_id}/{filename}"

                    # アップロード実行
                    public_url = await asyncio.to_thread(
                        self.gcs_repository.upload_file,
                        local_path,
                        gcs_dest_path
                    )
                    # JSON内のURLをGCSのURLに書き換え
                    new_step["image_url"] = public_url
            
            updated_steps.append(new_step)

        # 2. 更新されたステップ情報でJSONを作成
        # 現在時刻の文字列をmanual_idに付与
        now_timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        json_content = self.formatter.to_json(updated_steps)
        json_path = f"manuals/json/{manual_id}_{now_timestamp}.json"

        # JSONをアップロード
        await asyncio.to_thread(
            self.gcs_repository.upload_structure_content, 
            json_content, 
            json_path, 
            "application/json"
        )

        return {
            "json_path": json_path,
            "image_count": len([s for s in updated_steps if s.get("image_url", "").startswith("http")])
        }

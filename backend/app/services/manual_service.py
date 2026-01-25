import asyncio
import os
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from google.cloud import firestore

from app.repositories.firestore_repository import FirestoreRepository
from app.repositories.gcs_repository import GCSRepository

class ManualService:
    def __init__(self):
        self.firestore_repository = FirestoreRepository()
        self.gcs_repository = GCSRepository()
        self.app_dir = Path(__file__).resolve().parent.parent

    # --- 閲覧・取得系 ---

    def get_public_manual(self, manual_id: str) -> Optional[Dict[str, Any]]:
        """
        公開されているマニュアルを取得する
        """
        # 1. Firestoreからメタデータを検索 (Collection Group Query)
        docs = self.firestore_repository.find_in_collection_group("manuals", "id", "==", manual_id)
        
        if not docs:
            return None
        
        manual_data = docs[0]
        
        # 2. GCSから詳細JSON（手順ステップ）を取得
        json_path = manual_data.get("gcs_json_path")
        if not json_path:
            return None

        try:
            steps_json_str = self.gcs_repository.read_file(json_path)
            steps = json.loads(steps_json_str)
            
            return {
                **manual_data,
                "steps": steps
            }
        except Exception as e:
            print(f"Error reading manual detail: {e}")
            return None

    # --- 保存・更新系 ---

    async def save_manual(self, steps: List[Dict], manual_id: str, video_path: str = None) -> Dict[str, Any]:
        """
        画像、動画、および手順書JSONをGCSにアップロードし、Firestoreにメタデータを保存する
        """
        updated_steps = []
        now_timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        full_id = f"{manual_id}_{now_timestamp}"

        # 1. 各ステップの画像をアップロードしてURLを置換
        for step in steps:
            new_step = step.copy()
            image_url = step.get("image_url")

            if image_url and image_url.startswith("/static/"):
                # ローカルの相対パスを絶対パスに変換
                relative_path = image_url.lstrip("/")
                local_path = str(self.app_dir / relative_path)

                if os.path.exists(local_path):
                    filename = os.path.basename(local_path)
                    gcs_dest_path = f"manuals/{full_id}/images/{filename}"

                    # アップロード実行 (非同期実行のためにスレッドへ)
                    public_url = await asyncio.to_thread(
                        self.gcs_repository.upload_file,
                        local_path,
                        gcs_dest_path
                    )
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

        # 3. 手順情報をJSONとしてアップロード
        json_content = json.dumps(updated_steps, ensure_ascii=False, indent=2)
        json_path = f"manuals/{full_id}/manual.json"

        await asyncio.to_thread(
            self.gcs_repository.upload_structure_content, 
            json_content, 
            json_path, 
            "application/json"
        )

        # 4. Firestore にメタデータを保存
        metadata = {
            "id": full_id,
            "title": manual_id,
            "manual_id": manual_id,
            "gcs_json_path": json_path,
            "gcs_video_path": gcs_video_path,
            "step_count": len(updated_steps),
            "status": "completed",
            "is_public": True, # デフォルトで公開
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }

        try:
            # ログインユーザーのID (現状は固定)
            user_id = "test-user-001"
            collection_path = f"users/{user_id}/manuals"
            
            await asyncio.to_thread(
                self.firestore_repository.create_document,
                collection_path,
                full_id,
                metadata
            )
        except Exception as e:
            # 失敗時はロールバック（GCS削除）
            await asyncio.to_thread(self.gcs_repository.delete_file, json_path)
            if video_path:
                await asyncio.to_thread(self.gcs_repository.delete_file, gcs_video_path)
            print(f"Firestore Error: {e}")
            raise e

        return {
            "id": full_id,
            "json_path": json_path,
            "video_path": gcs_video_path,
            "image_count": len([s for s in updated_steps if "http" in s.get("image_url", "")])
        }

    def update_visibility(self, user_id: str, manual_id: str, is_public: bool) -> bool:
        """
        公開状態を更新
        """
        try:
            collection_path = f"users/{user_id}/manuals"
            doc = self.firestore_repository.get_document(collection_path, manual_id)
            if not doc:
                return False

            self.firestore_repository.update_document(collection_path, manual_id, {
                "is_public": is_public,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Error updating visibility: {e}")
            return False

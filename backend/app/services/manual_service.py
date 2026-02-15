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
        
        # 公開設定チェック
        if not manual_data.get("is_public", False):
            return None

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

    def _upload_json_to_gcs(self, manual_id: str, steps: List[Dict]) -> str:
        """
        手順情報をJSONとしてGCSにアップロードし、パスを返す
        """
        json_content = json.dumps(steps, ensure_ascii=False, indent=2)
        json_path = f"manuals/{manual_id}/manual.json"

        self.gcs_repository.upload_structure_content(
            json_content, 
            json_path, 
            "application/json"
        )
        return json_path

    async def save_manual(self, user_id: str, steps: List[Dict], manual_id: str, title: str = None) -> Dict[str, Any]:
        """
        手順書JSONをGCSにアップロードし、Firestoreにメタデータを保存する
        """
        # 1. 手順情報をJSONとしてアップロード
        json_path = await asyncio.to_thread(
            self._upload_json_to_gcs,
            manual_id,
            steps
        )

        # 2. Firestore にメタデータを保存
        metadata = {
            "id": manual_id,
            "title": title or manual_id,
            "manual_id": manual_id,
            "gcs_json_path": json_path,
            "step_count": len(steps),
            "status": "completed",
            "updated_at": firestore.SERVER_TIMESTAMP,
            "steps": steps,
            # is_public は変更しない
        }

        try:
            collection_path = f"users/{user_id}/manuals"
            
            await asyncio.to_thread(
                self.firestore_repository.update_document,
                collection_path,
                manual_id,
                metadata
            )
        except Exception as e:
            # 失敗時はロールバック（GCS削除）
            await asyncio.to_thread(self.gcs_repository.delete_file, json_path)
            print(f"Firestore Error: {e}")
            raise e

        return {
            "id": manual_id,
            "json_path": json_path,
            "image_count": len([s for s in steps if "http" in s.get("image_url", "")])
        }

    # --- 新しい分析フロー（Firestore段階更新）用 ---

    def create_manual_job(self, user_id: str, manual_id: str, title: str, video_path: str = None) -> str:
        """
        解析ジョブの初期レコードを作成
        """
        # 1. メタデータ初期化
        now = firestore.SERVER_TIMESTAMP
        metadata = {
            "id": manual_id,
            "manual_id": manual_id,
            "title": title, # 仮タイトル
            "status": "analyzing_structure", # ステータス: 構造解析中
            "steps": [], # 空配列
            "video_path": video_path, # GCSパス
            "is_public": False,
            "created_at": now,
            "updated_at": now
        }
        
        # 2. Firestore作成
        collection_path = f"users/{user_id}/manuals"
        
        self.firestore_repository.create_document(
            collection_path,
            manual_id,
            metadata
        )
        return manual_id

    def update_manual_status(self, user_id: str, manual_id: str, status: str, error_code: str = None):
        """ステータスとエラーコードを更新"""
        collection_path = f"users/{user_id}/manuals"
        data = {
            "status": status,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        if error_code:
            data["error_code"] = error_code

        self.firestore_repository.update_document(collection_path, manual_id, data)

    def init_manual_steps(self, user_id: str, manual_id: str, steps_structure: List[Dict]):
        """
        Phase 1完了時: ステップの骨組み（タイトル・タイムスタンプ）を保存
        """
        collection_path = f"users/{user_id}/manuals"
        
        # 配列をそのまま保存
        self.firestore_repository.update_document(collection_path, manual_id, {
            "steps": steps_structure,
            "step_count": len(steps_structure),
            "status": "downloading_video", # 次のステータスへ
            "updated_at": firestore.SERVER_TIMESTAMP
        })

    def update_manual_steps(self, user_id: str, manual_id: str, all_steps: List[Dict], status: str = None):
        """
        ステップ配列全体を更新する（進捗反映用）
        """
        collection_path = f"users/{user_id}/manuals"
        
        data = {
            "steps": all_steps,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        if status:
            data["status"] = status

        self.firestore_repository.update_document(collection_path, manual_id, data)

    async def complete_manual_job(self, user_id: str, manual_id: str, final_steps: List[Dict]):
        """
        全工程完了
        """
        # 1. JSON生成 & アップロード
        json_path = None
        try:
             json_path = await asyncio.to_thread(
                self._upload_json_to_gcs,
                manual_id,
                final_steps
            )
        except Exception as e:
            print(f"Error uploading JSON in complete_manual_job: {e}")
        
        # 2. サムネイル画像の抽出
        thumbnail_url = None
        if final_steps and len(final_steps) > 0:
            first_step_image = final_steps[0].get("image_url")
            if first_step_image and first_step_image.startswith("http"):
                thumbnail_url = first_step_image
        
        # 3. Firestore更新
        collection_path = f"users/{user_id}/manuals"
        
        update_data = {
            "steps": final_steps,
            "thumbnail_url": thumbnail_url,
            "status": "completed",
            "updated_at": firestore.SERVER_TIMESTAMP,
            "gcs_json_path": json_path
        }

        self.firestore_repository.update_document(collection_path, manual_id, update_data)

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


    def get_user_manuals(self, user_id: str, limit: int = 8, cursor: str = None) -> Dict[str, Any]:
        """
        特定のユーザーのマニュアル一覧を取得する（ページネーション対応）
        """
        collection_path = f"users/{user_id}/manuals"
        try:
            # Firestoreからページネーション付きで取得
            # updated_at の降順でソート
            docs = self.firestore_repository.get_documents_ordered(
                collection_name=collection_path,
                limit=limit,
                order_by="updated_at",
                descending=True,
                start_after_doc_id=cursor
            )
            
            # 次のカーソルを決定
            next_cursor = None
            if len(docs) == limit:
                next_cursor = docs[-1]["id"]
            
            return {
                "manuals": docs,
                "next_cursor": next_cursor
            }
        except Exception as e:
            print(f"Error getting user manuals: {e}")
            return {
                "manuals": [],
                "next_cursor": None
            }

    def delete_manual(self, user_id: str, manual_id: str) -> bool:
        """
        マニュアルを削除する（Firestore + GCS）
        ユーザーの所有権を確認してから削除
        """
        collection_path = f"users/{user_id}/manuals"
        
        try:
            # 1. マニュアルの存在確認と所有権チェック
            doc = self.firestore_repository.get_document(collection_path, manual_id)
            if not doc:
                print(f"Manual {manual_id} not found for user {user_id}")
                return False
            
            # 2. Firestoreから削除
            self.firestore_repository.delete_document(collection_path, manual_id)
            print(f"Deleted Firestore document for manual {manual_id}")
            
            # 3. GCSからファイルを削除
            try:
                self.gcs_repository.delete_manual_files(manual_id)
                print(f"Deleted GCS files for manual {manual_id}")
            except Exception as e:
                print(f"Warning: Failed to delete GCS files for manual {manual_id}: {e}")
                # Firestoreは既に削除されているので、GCS削除失敗はログのみ
            
            return True
        except Exception as e:
            print(f"Error deleting manual {manual_id}: {e}")
            return False

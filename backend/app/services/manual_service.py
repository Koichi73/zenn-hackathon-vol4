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

    async def save_manual(self, user_id: str, steps: List[Dict], manual_id: str, title: str = None) -> Dict[str, Any]:
        """
        手順書JSONをGCSにアップロードし、Firestoreにメタデータを保存する
        """
        # 1. 手順情報をJSONとしてアップロード
        json_content = json.dumps(steps, ensure_ascii=False, indent=2)
        json_path = f"manuals/{manual_id}/manual.json"

        await asyncio.to_thread(
            self.gcs_repository.upload_structure_content, 
            json_content, 
            json_path, 
            "application/json"
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
            "steps": steps
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

    def update_manual_status(self, user_id: str, manual_id: str, status: str):
        """ステータスのみ更新"""
        collection_path = f"users/{user_id}/manuals"
        self.firestore_repository.update_document(collection_path, manual_id, {
            "status": status,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

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

    def update_step_detail(self, manual_id: str, step_index: int, step_data: Dict):
        """
        Phase 3進行中: 特定のステップの詳細（画像・説明）を更新
        Firestoreは配列の特定インデックス更新が苦手なので、
        一度読み込んで更新するロック処理が必要だが、
        今回は簡易的に Transaction なしで実装する（競合頻度が低いため）。
        または、配列全体を持ち回る設計にする。
        
        ここでは、「GeminiService」が全ステップ配列を持っているので、
        それを丸ごと更新する形が一番安全で簡単。
        
        しかし、頻繁な書き込みになるため、最適化検討。
        一旦、Client側で「配列全体置換」を受け入れる設計にする。
        """
        pass # 下記 update_all_steps を使う

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

    def complete_manual_job(self, user_id: str, manual_id: str, final_steps: List[Dict]):
        """
        全工程完了
        """
        collection_path = f"users/{user_id}/manuals"
        
        # Extract thumbnail from first step
        thumbnail_url = None
        if final_steps and len(final_steps) > 0:
            first_step_image = final_steps[0].get("image_url")
            if first_step_image and first_step_image.startswith("http"):
                thumbnail_url = first_step_image
        
        self.firestore_repository.update_document(collection_path, manual_id, {
            "steps": final_steps,
            "thumbnail_url": thumbnail_url,
            "status": "completed",
            "updated_at": firestore.SERVER_TIMESTAMP
        })

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


    def get_user_manuals(self, user_id: str) -> List[Dict[str, Any]]:
        """
        特定のユーザーのマニュアル一覧を取得する
        """
        collection_path = f"users/{user_id}/manuals"
        try:
            # Firestoreから全件取得
            # 実際にはページネーションやソートが必要だが、一旦全件取得
            all_docs = self.firestore_repository.get_all_documents(collection_path)
            
            # 作成日時の降順でソート (Firestoreから取得時点でソートされていない場合)
            # created_at が firestore.SERVER_TIMESTAMP の場合、ローカルでは datetime オブジェクト等として扱える
            # Noneの場合を考慮してソート
            # FirestoreのTimestampはtzinfoを持つため、datetime.minもtzinfoを持つ必要がある
            from datetime import timezone
            min_date = datetime.min.replace(tzinfo=timezone.utc)
            
            all_docs.sort(key=lambda x: x.get('created_at') or min_date, reverse=True)
            
            return all_docs
        except Exception as e:
            print(f"Error getting user manuals: {e}")
            return []

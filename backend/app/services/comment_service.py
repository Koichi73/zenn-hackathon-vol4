import asyncio
from typing import Dict, List, Optional, Any
from google.cloud import firestore
from app.repositories.firestore_repository import FirestoreRepository
from datetime import datetime, timezone


class CommentService:
    """
    コメント管理サービス (非同期対応版)
    """
    def __init__(self):
        self.firestore_repository = FirestoreRepository()

    async def add_comment(self, manual_id: str, step_index: int, author_name: str, content: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        特定のステップにコメントを追加
        """
        # 親ドキュメントのパス
        parent_path = f"comments/{manual_id}/steps/{step_index}"
        
        # コメントデータ
        now = firestore.SERVER_TIMESTAMP
        comment_data = {
            "manual_id": manual_id,
            "step_index": step_index,
            "author_name": author_name,
            "content": content,
            "created_at": now
        }
        
        # 非同期実行
        comment_id = await asyncio.to_thread(
            self.firestore_repository.add_to_subcollection,
            parent_path=parent_path,
            subcollection_name="comments",
            data=comment_data
        )
        
        # マニュアルの最終更新日時を更新（未読チェックの高速化用）
        try:
            # マニュアルドキュメントを検索
            manual_docs = await asyncio.to_thread(
                self.firestore_repository.find_in_collection_group,
                "manuals", "id", "==", manual_id
            )
            for m_doc in manual_docs:
                # FirestoreRepositoryにパス指定での更新メソッドがないため、直接dbを使用して更新
                doc_ref = self.firestore_repository.db.document(m_doc["path"])
                await asyncio.to_thread(doc_ref.update, {"last_comment_at": now})
        except Exception as e:
            print(f"Warning: Failed to update manual last_comment_at: {e}")

        # レスポンス用にタイムスタンプを現在時刻で返す
        return {
            "id": comment_id,
            "manual_id": manual_id,
            "step_index": step_index,
            "author_name": author_name,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    async def get_comments(self, manual_id: str, step_index: int) -> List[Dict[str, Any]]:
        """
        特定のステップのコメントを取得
        """
        parent_path = f"comments/{manual_id}/steps/{step_index}"
        try:
            return await asyncio.to_thread(
                self.firestore_repository.get_subcollection,
                parent_path=parent_path,
                subcollection_name="comments",
                order_by="created_at"
            )
        except Exception as e:
            print(f"Error getting comments: {e}")
            return []

    async def get_all_comments(self, manual_id: str) -> Dict[int, List[Dict[str, Any]]]:
        """
        マニュアル全体のコメントを取得（一括取得を最優先）
        """
        try:
            # コレクショングループクエリで一括取得
            results = await asyncio.to_thread(
                self.firestore_repository.find_in_collection_group,
                collection_group_id="comments",
                field="manual_id",
                operator="==",
                value=manual_id
            )
            
            all_comments = {}
            for comment in results:
                step_idx = comment.get("step_index", 0)
                if step_idx not in all_comments:
                    all_comments[step_idx] = []
                all_comments[step_idx].append(comment)
            
            for step_idx in all_comments:
                all_comments[step_idx].sort(key=lambda x: str(x.get("created_at", "")))
            
            return all_comments
        except Exception as e:
            # インデックスがない場合は並列順次取得
            print(f"Collection group query failed (probably missing index), using parallel fallback: {e}")
            
            # 最大20ステップまで並列で取得
            tasks = [self.get_comments(manual_id, i) for i in range(20)]
            step_results = await asyncio.gather(*tasks)
            
            all_comments = {}
            for idx, comments in enumerate(step_results):
                if comments:
                    all_comments[idx] = comments
            return all_comments

    async def mark_manual_as_read(self, user_id: str, manual_id: str) -> None:
        """
        マニュアルを既読にマーク
        """
        try:
            doc_data = await asyncio.to_thread(
                self.firestore_repository.get_document, "comment_read_status", user_id
            )
            
            if doc_data is None:
                doc_data = {"manuals": {}}
            
            if "manuals" not in doc_data:
                doc_data["manuals"] = {}
            
            doc_data["manuals"][manual_id] = {
                "last_read_at": firestore.SERVER_TIMESTAMP
            }
            
            await asyncio.to_thread(
                self.firestore_repository.set_document, "comment_read_status", user_id, doc_data
            )
        except Exception as e:
            print(f"Error marking manual as read: {e}")
            raise

    async def get_unread_count(self, user_id: str, manual_id: str) -> int:
        """
        未読コメント数を取得
        """
        try:
            unread_counts = await self.get_unread_counts_by_step(user_id, manual_id)
            return sum(unread_counts.values())
        except Exception as e:
            print(f"Error getting unread count: {e}")
            return 0

    async def get_unread_counts_by_step(self, user_id: str, manual_id: str) -> Dict[int, int]:
        """
        ステップごとの未読コメント数を取得
        """
        try:
            # 1. 既読状態を取得
            doc_data = await asyncio.to_thread(
                self.firestore_repository.get_document, "comment_read_status", user_id
            )
            
            last_read_at = None
            if doc_data and "manuals" in doc_data and manual_id in doc_data["manuals"]:
                last_read_at = doc_data["manuals"][manual_id].get("last_read_at")
            
            # 2. 全コメントをフェッチして精査
            all_comments = await self.get_all_comments(manual_id)
            
            unread_counts = {}
            for step_idx, comments in all_comments.items():
                count = 0
                for comment in comments:
                    created_at = comment.get("created_at")
                    if last_read_at is None:
                        count += 1
                    elif created_at and created_at > last_read_at:
                        count += 1
                if count > 0:
                    unread_counts[int(step_idx)] = count
            
            return unread_counts
        except Exception as e:
            print(f"Error getting unread counts: {e}")
            return {}

    async def get_all_unread_counts(self, user_id: str, manual_ids: List[str]) -> Dict[str, int]:
        """
        複数マニュアルの未読コメント数を並列で一括取得
        """
        tasks = [self.get_unread_count(user_id, mid) for mid in manual_ids]
        counts = await asyncio.gather(*tasks)
        return {mid: count for mid, count in zip(manual_ids, counts)}

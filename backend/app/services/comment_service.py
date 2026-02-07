from typing import Dict, List, Optional, Any
from google.cloud import firestore
from app.repositories.firestore_repository import FirestoreRepository


class CommentService:
    """
    コメント管理サービス
    """
    def __init__(self):
        self.firestore_repository = FirestoreRepository()

    def add_comment(self, manual_id: str, step_index: int, author_name: str, content: str) -> Dict[str, Any]:
        """
        特定のステップにコメントを追加
        
        Args:
            manual_id: マニュアルID
            step_index: ステップのインデックス (0始まり)
            author_name: 投稿者名
            content: コメント内容
            
        Returns:
            作成されたコメントの情報
        """
        # 親ドキュメントのパス
        parent_path = f"comments/{manual_id}/steps/{step_index}"
        
        # コメントデータ
        comment_data = {
            "author_name": author_name,
            "content": content,
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        # サブコレクションに追加
        comment_id = self.firestore_repository.add_to_subcollection(
            parent_path=parent_path,
            subcollection_name="comments",
            data=comment_data
        )
        
        # レスポンス用にタイムスタンプを現在時刻で返す
        from datetime import datetime, timezone
        return {
            "id": comment_id,
            "manual_id": manual_id,
            "step_index": step_index,
            "author_name": author_name,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    def get_comments(self, manual_id: str, step_index: int) -> List[Dict[str, Any]]:
        """
        特定のステップのコメントを取得
        
        Args:
            manual_id: マニュアルID
            step_index: ステップのインデックス
            
        Returns:
            コメントのリスト (作成日時の昇順)
        """
        parent_path = f"comments/{manual_id}/steps/{step_index}"
        
        try:
            comments = self.firestore_repository.get_subcollection(
                parent_path=parent_path,
                subcollection_name="comments",
                order_by="created_at"
            )
            return comments
        except Exception as e:
            print(f"Error getting comments: {e}")
            return []

    def get_all_comments(self, manual_id: str) -> Dict[int, List[Dict[str, Any]]]:
        """
        マニュアル全体のコメントを取得
        
        Args:
            manual_id: マニュアルID
            
        Returns:
            ステップインデックスをキーとしたコメント辞書
        """
        # Firestoreでは直接すべてのステップのコメントを取得するのが難しいため、
        # フロントエンドから必要なステップごとに取得することを推奨
        # ここでは簡易的な実装として、ステップ0-99までを試行
        all_comments = {}
        
        for step_index in range(100):  # 最大100ステップまで対応
            comments = self.get_comments(manual_id, step_index)
            if comments:
                all_comments[step_index] = comments
        
        return all_comments

# Firestore操作用クラス
import os
from google.cloud import firestore
from dotenv import load_dotenv
from typing import Dict, List, Optional, Any

load_dotenv()

class FirestoreRepository:
    # Firestoreクライアントの初期化
    def __init__(self):
        self.project_id = os.getenv("PROJECT_ID")
        self.db = firestore.Client(project=self.project_id)

    # ドキュメントの作成
    def create_document(self, collection_name: str, document_id: str, data: Dict[str, Any]) -> str:
        """
        指定されたコレクションに新しいドキュメントを作成
        returns: 作成されたドキュメントのID
        """
        doc_ref = self.db.collection(collection_name).document(document_id)
        doc_ref.set(data)
        return document_id

    # ドキュメントの取得
    def get_document(self, collection_name: str, document_id: str) -> Optional[Dict[str, Any]]:
        """
        指定されたドキュメントを取得
        returns: ドキュメントのデータ（存在しない場合はNone）
        """
        doc_ref = self.db.collection(collection_name).document(document_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None

    # コレクション内の全ドキュメント取得
    def get_all_documents(self, collection_name: str) -> List[Dict[str, Any]]:
        """
        指定されたコレクション内の全ドキュメントを取得
        returns: ドキュメントのリスト
        """
        docs = self.db.collection(collection_name).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

    # ドキュメントの更新
    def update_document(self, collection_name: str, document_id: str, data: Dict[str, Any]) -> None:
        """
        既存のドキュメントを更新（部分更新）
        """
        doc_ref = self.db.collection(collection_name).document(document_id)
        doc_ref.update(data)

    # ドキュメントの削除
    def delete_document(self, collection_name: str, document_id: str) -> None:
        """
        指定されたドキュメントを削除
        """
        doc_ref = self.db.collection(collection_name).document(document_id)
        doc_ref.delete()

# 使用例
# # Firestoreにデータを保存
# try:
#     firestore_repo = FirestoreRepository()
#     
#     # ドキュメント作成
#     firestore_repo.create_document("videos", "video_001", {
#         "title": "Sample Video",
#         "url": "https://example.com/video.mp4",
#         "created_at": firestore.SERVER_TIMESTAMP
#     })
#     
#     # ドキュメント取得
#     video_data = firestore_repo.get_document("videos", "video_001")
#     print(video_data)
#     
#     # クエリ検索
#     results = firestore_repo.query_documents("videos", "title", "==", "Sample Video")
#     
# except Exception as e:
#     print(f"Firestore Error: {e}")

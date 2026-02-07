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
        self.database_name = os.getenv("FIRESTORE_DATABASE")
        self.credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        self.db = firestore.Client.from_service_account_json(
            self.credentials_path,
            project=self.project_id,
            database=self.database_name
        )

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

    # コレクショングループクエリ
    def find_in_collection_group(self, collection_group_id: str, field: str, operator: str, value: Any) -> List[Dict[str, Any]]:
        """
        コレクショングループを使ってドキュメントを検索
        """
        docs = self.db.collection_group(collection_group_id).where(field, operator, value).stream()
        return [{"id": doc.id, "path": doc.reference.path, **doc.to_dict()} for doc in docs]

    # サブコレクション操作
    def add_to_subcollection(self, parent_path: str, subcollection_name: str, data: Dict[str, Any], document_id: Optional[str] = None) -> str:
        """
        サブコレクションに新しいドキュメントを追加
        parent_path: 親ドキュメントのパス (例: "comments/manual_id/steps/0")
        subcollection_name: サブコレクション名 (例: "comments")
        returns: 作成されたドキュメントのID
        """
        if document_id:
            doc_ref = self.db.document(parent_path).collection(subcollection_name).document(document_id)
            doc_ref.set(data)
            return document_id
        else:
            doc_ref = self.db.document(parent_path).collection(subcollection_name).document()
            doc_ref.set(data)
            return doc_ref.id

    def get_subcollection(self, parent_path: str, subcollection_name: str, order_by: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        サブコレクションの全ドキュメントを取得
        parent_path: 親ドキュメントのパス
        subcollection_name: サブコレクション名
        order_by: ソートフィールド (オプション)
        returns: ドキュメントのリスト
        """
        query = self.db.document(parent_path).collection(subcollection_name)
        if order_by:
            query = query.order_by(order_by)
        docs = query.stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]


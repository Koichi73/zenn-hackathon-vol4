import os
import sys
from google.cloud import firestore

# プロジェクトルートをパスに追加
sys.path.append(os.path.join(os.getcwd(), "backend"))

from dotenv import load_dotenv
# backend/.env を読み込む
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.repositories.firestore_repository import FirestoreRepository

def migrate():
    repo = FirestoreRepository()
    db = repo.db
    
    print("Starting migration: Adding manual_id to existing comments...")
    
    # 全ての comments サブコレクションを取得
    # パターン: comments/{manual_id}/steps/{step_index}/comments/{comment_id}
    # コレクショングループクエリで全ての "comments" ドキュメントを取得
    comments_ref = db.collection_group("comments").stream()
    
    count = 0
    manual_last_comments = {} # manual_id -> latest_timestamp
    
    for doc in comments_ref:
        data = doc.to_dict()
        path = doc.reference.path
        path_parts = path.split('/')
        
        # パスから manual_id と step_index を抽出
        # comments/MANUAL_ID/steps/STEP_INDEX/comments/COMMENT_ID
        if len(path_parts) >= 6 and path_parts[0] == "comments" and path_parts[2] == "steps":
            manual_id = path_parts[1]
            step_index = int(path_parts[3])
            
            updates = {}
            if "manual_id" not in data:
                updates["manual_id"] = manual_id
            if "step_index" not in data:
                updates["step_index"] = step_index
            
            if updates:
                doc.reference.update(updates)
                count += 1
            
            # 最終コメント時刻を追跡
            created_at = data.get("created_at")
            if created_at:
                if manual_id not in manual_last_comments or created_at > manual_last_comments[manual_id]:
                    manual_last_comments[manual_id] = created_at

    print(f"Updated {count} comments with manual_id/step_index.")
    
    # 各マニュアルの last_comment_at を更新
    print("Updating manuals with last_comment_at...")
    manual_count = 0
    for manual_id, last_at in manual_last_comments.items():
        try:
            # コレクショングループクエリで実際のマニュアルドキュメントを探す
            manual_docs = db.collection_group("manuals").where("id", "==", manual_id).stream()
            found = False
            for m_doc in manual_docs:
                m_doc.reference.update({
                    "last_comment_at": last_at
                })
                found = True
                manual_count += 1
                print(f"Updated manual: {m_doc.reference.path}")
            
            if not found:
                print(f"Warning: Manual {manual_id} not found in any collection.")
        except Exception as e:
            print(f"Failed to update manual {manual_id}: {e}")
            
    print(f"Updated {manual_count} manual documents.")
    print("Migration completed.")

if __name__ == "__main__":
    migrate()

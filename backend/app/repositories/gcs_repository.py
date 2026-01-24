# GCS操作用クラス
import os
from google.cloud import storage
from dotenv import load_dotenv

load_dotenv()
class GCSRepository:
    # GCSクライアントの初期化
    def __init__(self):
        self.project_id = os.getenv("PROJECT_ID")
        self.bucket_name = os.getenv("BUCKET_NAME")
        self.storage_client = storage.Client(project=self.project_id)
        self.bucket = self.storage_client.bucket(self.bucket_name)

    # 動画、画像などファイルのアップロード
    def upload_file(self, source_file_path: str, destination_blob_name: str) -> str:
        """
        Blobの作成とファイルのアップロード
        returns: アップロードしたファイルの公開URL
        """
        blob = self.bucket.blob(destination_blob_name)
        blob.upload_from_filename(source_file_path)
        return blob.public_url

    # 動画、画像などファイルのダウンロード
    def download_file(self, source_blob_name: str, destination_file_path: str):
        """バケットからファイルをダウンロードする"""
        blob = self.bucket.blob(source_blob_name)
        blob.download_to_filename(destination_file_path)

    # ファイルの削除
    def delete_file(self, blob_name: str):
        """バケットからファイルを削除する"""
        blob = self.bucket.blob(blob_name)
        blob.delete()

    # 文字列やバイトデータを直接アップロード
    def upload_structure_content(self, content: str, destination_blob_name: str, content_type: str = "text/plain") -> str:
        """
        コンテンツを直接GCSにアップロード
        returns: アップロードしたファイルの公開URL
        """
        blob = self.bucket.blob(destination_blob_name)
        blob.upload_from_string(content, content_type=content_type)
        return blob.public_url

# 使用例
# # GCSに動画をアップロード
#     try:
#         print("Uploading video to GCS...")
#         gcs_utils = GCSUtils()
#         gcs_utils.upload_file(file_path, f"videos/{file_id}_{file.filename}")
#     except Exception as gcs_err:
#         print(f"GCS Upload Error: {gcs_err}")
#         raise HTTPException(status_code=500, detail="Failed to upload video to GCS")

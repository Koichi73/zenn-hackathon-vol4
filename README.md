# 【撮るだけマニュアル】 画面収録データからマニュアルを自動生成！

## 各種リンク
- **記事**: [【撮るだけマニュアル】 画面収録データからマニュアルを自動生成！ 〜 Zenn](https://zenn.dev/) （URLを記載）
- **デモ動画**: 画像をクリックで遷移<br>

[<img src="https://img.youtube.com/vi/0g-uGiHP0q0/maxresdefault.jpg" width="100%">](https://www.youtube.com/watch?v=0g-uGiHP0q0)

## システムアーキテクチャ
アプリケーションは、mainブランチへのpushをトリガーにGitHub Actionsにより自動デプロイされます。

### システム構成図
![システム構成図](./docs/images/architecture_diagram_overview.png)

### 処理フロー
1. ユーザーが動画を Cloud Storage にアップロード。
2. FastAPI (Cloud Run) が動画を Gemini 3.0 Flash で解析し、タイムスタンプを抽出。
3. ffmpeg でフレーム画像を切り出し、各ステップの詳細（説明文、ハイライト箇所、個人情報のマスク位置）を Gemini で画像解析。
4. 解析結果を Firestore に保存し、フロントエンドにリアルタイム反映。
5. 生成されたマニュアルを編集し、リンクによる共有（公開/非公開）が可能。
6. 共有されたマニュアルに対し、閲覧者がステップごとにコメントを残すことでフィードバックをループ化。

## 起動方法
本アプリケーションの実行には、Google Cloud プロジェクトの設定とローカル環境のセットアップが必要です。

### 1. 事前準備
- **Node.js**: v20以上
- **Python**: v3.11以上
- **FFmpeg**: 動画解析に使用
- **Google Cloud プロジェクト**:
    - **Vertex AI API**: 有効化
    - **Cloud Storage**: 動画、画像、手順書保存用バケットの作成
    - **Firestore**: データベース作成
- **Firebase**:
    - **Auth**: Email/Password 認証を有効化

### 2. 環境変数の設定
フロントエンドとバックエンドのそれぞれのディレクトリに `.env.local`,`.env` ファイルを作成します。

#### バックエンド (`backend/.env`)
`backend/.env.template` を参考に作成してください。
```bash
PROJECT_ID="GCPプロジェクトID"
LOCATION="asia-northeast1"
MODEL_NAME="gemini-3.0-flash"
GOOGLE_APPLICATION_CREDENTIALS="secrets/service-account.json"
BUCKET_NAME="your-storage-bucket-name"
FIRESTORE_DATABASE="(default)"
```

#### フロントエンド (`frontend/.env.local`)
`frontend/.env.local.template` を参考に作成してください。
```bash
# Firebase Config (Firebaseコンソールから取得)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# API URL
NEXT_PUBLIC_API_URL="http://localhost:8000/api"

# Demo Mode
NEXT_PUBLIC_AUTO_LOGIN=true
NEXT_PUBLIC_DEMO_EMAIL="sample@example.com"
NEXT_PUBLIC_DEMO_PASSWORD="password123"
```

### 3. サービスの起動
プロジェクトルートで以下のスクリプトを実行します。
```bash
chmod +x start_app.sh
./start_app.sh
```
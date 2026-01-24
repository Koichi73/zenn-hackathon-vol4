# セットアップガイド

このプロジェクトの環境構築および実行手順をまとめまています。

## 前提条件 (Prerequisites)

以下のツールがインストールされている必要があります。

- **Git**
- **Python 3.11+**
- **Node.js 20+**
- **Google Cloud SDK (gcloud CLI)**
- **ffmpeg** (音声/動画処理に必要)

## 1. Google Cloud のセットアップ

本アプリケーションは Google Vertex AI (Gemini) を使用します。

### 1.1 プロジェクトの準備
1. [Google Cloud Console](https://console.cloud.google.com/) で新しいプロジェクトを作成するか、既存のプロジェクトを選択します。
   - 推奨プロジェクトID: `zenn-hackathon-vol4` (既存設定がこれになっている場合がありますが、自身のIDに合わせてください)
2. プロジェクトで **Billing (請求)** が有効になっていることを確認します。

### 1.2 API の有効化
以下のAPIを有効にしてください。
- **Vertex AI API**

```bash
gcloud services enable aiplatform.googleapis.com
```

### 1.3 認証設定 (ADC)
ローカルからVertex AIを利用するために、Application Default Credentials (ADC) を設定します。

```bash
# ログイン
gcloud auth login

# プロジェクトの設定
gcloud config set project <YOUR_PROJECT_ID>

# ADC認証用ファイルの生成
gcloud auth application-default login
```

---

## 2. Backend のセットアップ

FastAPI (Python) サーバーのセットアップです。

### 2.1 仮想環境の作成とライブラリインストール

```bash
cd backend

# 仮想環境の作成
python -m venv .venv

# 仮想環境のアクティベート
# Mac/Linux:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt
```

### 2.2 環境変数の設定

`backend/.env` ファイルを作成し、必要な設定を記述します。

```bash
# テンプレートからコピー
cp .env.template .env
```

`.env` の内容を環境に合わせて修正してください。

```ini
PROJECT_ID=<YOUR_PROJECT_ID>
LOCATION=global
MODEL_NAME=gemini-1.5-flash-002
BUCKET_NAME=<YOUR_BUCKET_ID>
```
* `MODEL_NAME`: 利用したいGeminiのモデル名を指定してください（例: `gemini-1.5-flash-002` など）。

### 2.3 起動確認

```bash
uvicorn app.main:app --reload --port 8000
```
`http://localhost:8000/docs` にアクセスしてSwagger UIが表示されれば成功です。

---

## 3. Frontend のセットアップ

Next.js (React) アプリケーションのセットアップです。

### 3.1 依存関係のインストール

```bash
cd frontend
npm install
```

### 3.2 起動確認

```bash
npm run dev
```
`http://localhost:3000` にアクセスしてアプリが表示されれば成功です。

---

## 4. アプリケーションの一括起動

プロジェクトルートにある `start_app.sh` を使用すると、BackendとFrontendを同時に起動できます。

```bash
# (プロジェクトルートで)
chmod +x start_app.sh
./start_app.sh
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

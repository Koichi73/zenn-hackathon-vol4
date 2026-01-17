# Google Cloud & Vertex AI Setup Guide

Gemini 3 (Vertex AI) を利用するための設定手順です。

## 1. Google Cloud Project の作成
今回のプロジェクトID: `zenn-hackathon-vol4`

## 2. APIの有効化
作成したプロジェクトで、以下のAPIを有効にします。
1. [Google Cloud Console](https://console.cloud.google.com/) で検索バーに「**Vertex AI API**」と入力。
2. **「有効にする」** をクリック。

## 3. ローカル開発環境の認証 (gcloud)
ローカルのPythonコードからGCPリソースにアクセスするために認証を通します。

```bash
# 1. ログイン
gcloud auth login

# 2. デフォルトプロジェクトの設定
gcloud config set project zenn-hackathon-vol4

# 3. アプリケーションデフォルト認証 (ADC) の設定
gcloud auth application-default login
```
これを行うと `~/.config/gcloud/application_default_credentials.json` が生成され、Pythonの `google-cloud-aiplatform` ライブラリが自動的に認証情報を読み込みます。

## 4. 環境変数の設定
`backend/.env` ファイル:

```bash
PROJECT_ID=zenn-hackathon-vol4
LOCATION=us-central1
```

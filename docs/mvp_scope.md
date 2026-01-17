# MVP Scope Definition: Video to Manual Generator

ハッカソンにおけるMVP（Minimum Viable Product）の定義とスコープ、技術スタックの決定事項をまとめます。

## 🎯 MVP Goal
ユーザーが操作動画を1つアップロードするだけで、数分以内に**タイトル、手順説明、スクリーンショット**が含まれたMarkdown形式の手順書が生成され、ブラウザ上で閲覧・コピーできることを目指します。

## ✅ Included in MVP (実装機能)

### 1. 動画解析 & 手順抽出 (Core)
- **入力**: ブラウザからの動画ファイルアップロード (mp4/mov)
- **処理**:
    - **Backemd**: FastAPIで動画を受け取る
    - **AI**: Gemini (Multimodal) が動画を解析し、手順（タイトル・説明・タイムスタンプ）をJSONで抽出
- **出力**: 抽出された手順データ

### 2. スクリーンショット生成
- **処理**: Geminiが特定したタイムスタンプに基づき、**FFmpeg** で動画からフレーム画像を切り出す
    - *理由: 生成AIによる画像生成ではなく、実画像を切り出すことで正確性を担保する*

### 3. 手順書表示 (Frontend)
- **UI**:
    - 動画プレビュー
    - 生成されたMarkdownプレビュー（画像 + テキスト）
- **機能**:
    - Markdownのテキストコピー
    - `window.print()` を利用した簡易PDF保存（ブラウザ機能依存）

## ⚠️ Excluded from MVP (実装しない機能)

ハッカソン期間内の完成を優先するため、以下の機能は意図的にスコープ外とします。

| 機能 | 理由 | 代替案 |
| :--- | :--- | :--- |
| **自動マスキング** | 正確な座標特定と画像処理の実装コストが高いため | 生のスクリーンショットを使用 |
| **画像内の強調** | 同上（座標特定・描画の複雑さ回避） | テキストでの補足説明で対応 |
| **PDF出力機能** | サーバーサイドでのPDF生成は工数が重いため | ブラウザの印刷機能を利用 |
| **ユーザー認証** | アプリのコア価値検証に不要なため | なし（誰でも使える状態） |
| **画像編集UI** | ブラウザ上でのトリミング等は実装コスト高 | なし |

## 🛠 Tech Stack (決定)

| Layer | Technology | Note |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) | UI/UX構築 |
| **Backend** | FastAPI (Python) | 非同期処理、AI連携 |
| **AI Model** | **Gemini 2.0 Flash Exp** | `gemini-3-flash-preview` が利用不可だった → 要調査 |
| **Video Tool** | **FFmpeg** | 高速・正確なフレーム切り出し |
| **Infra** | Google Cloud (Vertex AI) | App Engine / Cloud Run 想定 |

## 📂 Directory Structure (概略)
```
/
├── backend/       # FastAPI (Python)
│   ├── app/
│   │   ├── main.py
│   │   └── services/ (Gemini, FFmpeg)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/      # Next.js (TypeScript)
│   └── app/       # Page, Components
└── docs/          # Documentation
    ├── create_doc.md  # Original Requirements
    ├── setup.md       # GCP Setup Guide
    └── mvp_scope.md   # This File
```

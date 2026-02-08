# バックエンド学習フロー & コードリーディングガイド

このドキュメントでは、本プロジェクトのバックエンドコード（FastAPI）を効率的に理解するための学習フローを解説します。
動画アップロードからマニュアル生成までの処理フローを追いながら、各コンポーネントの役割を理解することを目指します。

## 1. アプリケーションの全体像 (Architecture)

まずはディレクトリ構造から全体像を把握しましょう。
このプロジェクトは **FastAPI** を使用しており、一般的な「Router - Service - Repository」パターンに似た構成と、AI (Gemini) を活用した処理が特徴です。

```
backend/app/
├── main.py              # 1. エントリーポイント (アプリ起動)
├── api/api.py           # 2. ルーティング集約
├── routers/             # 3. APIエンドポイント定義 (Controller層)
│   └── video.py         #    - 動画解析のメインエンドポイント
├── services/            # 4. ビジネスロジック (Service層)
│   ├── gemini_service.py #    - Gemini APIとの対話、解析メインロジック
│   ├── video_service.py  #    - 動画処理 (フレーム切り出し等)
│   └── manual_service.py #    - マニュアルデータの管理
└── repositories/        # 5. データアクセス (Repository層)
    ├── firestore_repository.py # - Firestore操作
    └── gcs_repository.py       # - GCS操作
```

## 2. コードリーディング・フロー

以下の順序でコードを読み進めると、処理の流れが理解しやすいです。

### Step 1: エントリーポイント ([main.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/main.py))
- アプリケーションの初期化、CORS設定、静的ファイルのマウント、APIルーターの読み込みを行っています。
- `app.include_router(api_router, prefix="/api")` で API が `/api` ハイフン下で提供されることを確認します。

### Step 2: ルーティング ([api/api.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/api/api.py) -> [routers/video.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/routers/video.py))
- [api/api.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/api/api.py): どのルーターが有効化されているか確認します。
- [routers/video.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/routers/video.py): **ここが一番重要です。**
    - `@router.post("/analyze")`: フロントエンドから呼ばれる解析開始エンドポイント。
    - **非同期処理**: `BackgroundTasks` を使って [run_video_analysis](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/routers/video.py#24-79) 関数をバックグラウンドで実行し、レスポンスを即座に返しています。これがないと解析完了までユーザーを待たせることになります。

### Step 3: メインロジック ([services/gemini_service.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/services/gemini_service.py))
- `GeminiService.generate_manual_from_video`: ここにマニュアル生成の核心ロジックがあります。
    - **Phase 1**: 動画全体をGeminiに渡し、骨組み（タイムスタンプとタイトル）を作成 ([analyze_video_structure](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/services/gemini_service.py#206-251))。
    - **Phase 2**: `VideoService` を使って、各ステップの画像を切り出し (`extract_frames`)。
    - **Phase 3**: 切り出した画像をGeminiに見せ、詳細な説明・ハイライト・マスク位置を生成 ([analyze_single_image](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/services/gemini_service.py#272-331))。
- Pydanticモデル ([ManualStep](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/services/gemini_service.py#50-57), [BoundingBox](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/services/gemini_service.py#31-36) など) の定義もこのファイルに含まれており（または近くで定義）、データの構造が分かります。

### Step 4: 動画処理 ([services/video_service.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/services/video_service.py))
- `OpenCV` などを使って動画から指定秒数のフレームを画像として保存する処理が見られます。

### Step 5: データ保存 ([services/manual_service.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/services/manual_service.py) -> `repositories/`)
- 解析の進捗や結果をどのようにデータベース (Firestore) に保存しているか確認します。
- ステータス更新 (`creating` -> `extracting_images` -> `analyzing_details` -> `completed`) の流れを追うと、フロントエンドへの通知の仕組みが分かります。

## 3. 実践：デバッグ実行で追ってみる (Optional)
ローカルで動く環境であれば、[routers/video.py](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/routers/video.py) の [analyze_video](file:///Users/koichiozaki/%E5%80%8B%E4%BA%BA%E9%96%8B%E7%99%BA/hackathon/zenn-hackathon-vol4/backend/app/routers/video.py#80-110) にブレークポイントを置き、リクエストを投げてステップ実行してみると、変数の動きがよく分かります。

## 4. 学習のポイント
- **DI (Dependency Injection)**: FastAPIの `Depends` の使い方は標準的ではありませんが、Serviceクラスのインスタンス化の方法を見てみましょう。
- **Pydantic**: データのバリデーションと型定義に (`BaseModel`) がどう使われているか。特にGeminiからのJSONレスポンスを直接オブジェクトにマッピングしている部分 (`response_schema`) はモダンな実装です。
- **Async/Await**: I/O待ち（Gemini API呼び出し、DB操作）で `await` が使われ、効率的に処理されている点に注目してください。

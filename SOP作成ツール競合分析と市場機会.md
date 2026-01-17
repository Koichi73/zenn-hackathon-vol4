# **グローバルSOP作成ツール市場における「動画Input → テキストOutput」機能のシェア分析と4象限マトリクスによる競争環境評価レポート**

## **エグゼクティブサマリー**

本レポートは、急速に進化する標準作業手順書（SOP：Standard Operating Procedures）作成ツールのグローバル市場において、特定の技術的・機能的領域である「既成動画ファイル（Video Input）からのテキストベースマニュアル自動生成（Text Output）」の普及度と競争環境を包括的に分析したものである。

SOP作成ツールの市場は、長らく**Scribe**や**Tango**といった「ブラウザ操作記録型（Click-Capture）」のプレイヤーによって支配されてきた。これらのツールは、ウェブブラウザ上のDOM（Document Object Model）イベントをフックとし、ユーザーのリアルタイムな操作を記録してドキュメント化することに特化しており、その利便性から圧倒的な市場シェアと認知を獲得している。しかし、本調査により、これらのグローバルリーダーは「動画ファイルからの生成」という特定領域においては、技術的アーキテクチャの制約から事実上の\*\*空白地帯（シェアほぼゼロ）\*\*であることが明らかになった。

一方で、生成AI（Generative AI）とコンピュータビジョン（Computer Vision）の融合により、**Glitter AI**、**Clueso**、**Docsie**といった新興プレイヤーが台頭している。これらの「ビデオファースト」なツール群は、ZoomやLoom、Teamsなどの録画データ、あるいはアップロードされたMP4ファイルを解析し、視覚情報と音声解説を統合して構造化されたSOPを生成する能力を有している。

本レポートでは、市場を「レガシー・レコーダー（従来の録画）」、「クリック・キャプチャー（現行の覇者）」、「メディア・ジェネレーター（動画生成）」、「トランスフォーマー（動画→テキスト変換）」の4象限に分類し、詳細な分析を行う。結論として、グローバル市場における「動画Input → テキストOutput」機能のシェアは、Scribe等の大手ではなく、特化型AIスタートアップ群がほぼ独占しているという「逆転現象」が確認された。

## ---

**目次**

1. **序論：プロセスドキュメンテーションのパラダイムシフト**  
   * 1.1 マニュアル作成の歴史的変遷：手動から自動、そしてAIへ  
   * 1.2 「動画Input → テキストOutput」機能の定義と戦略的重要性  
   * 1.3 本調査の範囲と方法論  
2. **技術的背景：なぜ「動画変換」は難しいのか**  
   * 2.1 DOMキャプチャ方式（Scribe/Tango型）の構造的限界  
   * 2.2 マルチモーダルAI方式（Glitter/Docsie型）の技術的ブレイクスルー  
   * 2.3 「イベントログ」対「ピクセル解析」の決定的な溝  
3. **主要グローバルプレイヤーの詳細分析（インカンベント企業）**  
   * 3.1 Scribe (ScribeHow)：市場の絶対王者とその死角  
   * 3.2 Tango：ガイド機能の覇者と「非動画」宣言  
   * 3.3 インカンベント企業の「動画Input」対応状況と戦略的意図  
4. **チャレンジャー企業の詳細分析（ビデオインテリジェンス企業）**  
   * 4.1 Glitter AI：音声と動画を「文脈」に変える急先鋒  
   * 4.2 Clueso：サポート動画をナレッジベース化するSaaS特化型  
   * 4.3 Docsie：産業用トレーニング動画をSOP化するエンタープライズソリューション  
   * 4.4 Guidde & Floik：動画とドキュメントの境界を溶かすハイブリッドアプローチ  
5. **日本市場における特異点とグローバルとの対比**  
   * 5.1 Teachme Biz：AIによる動画解析と「半自動生成」の進化  
   * 5.2 Dojo & i-Tutor：レガシーな高機能ツールにおける動画活用の現状  
   * 5.3 VideoStep：動画マニュアル特化型のポジション  
6. **4象限マトリクスによる市場整理**  
   * 6.1 マトリクスの定義と軸の設定  
   * 6.2 各象限の特性と代表的プレイヤー  
   * 6.3 「動画Input」領域におけるシェア推定と競争ダイナミクス  
7. **戦略的考察と将来展望**  
   * 7.1 「グリーンフィールド（新規作成）」と「ブラウンフィールド（資産活用）」の戦い  
   * 7.2 機能のコモディティ化とM\&Aの可能性  
   * 7.3 エージェンティックAI（Agentic AI）への進化  
8. **結論**

## ---

**1\. 序論：プロセスドキュメンテーションのパラダイムシフト**

### **1.1 マニュアル作成の歴史的変遷：手動から自動、そしてAIへ**

企業のナレッジマネジメント、特に標準作業手順書（SOP）の作成は、長らく生産性のボトルネックであった。歴史を振り返ると、SOP作成ツールは大きく3つの世代を経て進化している。

* 第1世代：スクリーンショットとワードプロセッサ（～2010年代前半）  
  ユーザーはPrintScreenキーで画面をキャプチャし、Microsoft WordやPowerPointに貼り付け、手動でトリミングや注釈を行い、説明文を記述していた。このプロセスは極めて労働集約的であり、1つのマニュアル作成に数時間を要することも珍しくなかった。  
* 第2世代：スクリーンレコーダー（2010年代中期～）  
  LoomやCamtasiaの普及により、「動画で操作を見せる」という手法が一般化した。これは作成時間を劇的に短縮したが、閲覧者にとっては「検索性が低い」「更新が困難」「一覧性に欠ける」という新たな課題を生んだ。動画は「フロー（流れる情報）」としては優秀だが、「ストック（蓄積される知識）」としては扱いづらい形式であった。  
* 第3世代：ワークフロー・キャプチャ（2019年頃～現在）  
  ScribeやTangoが登場し、市場を一変させた。これらのツールは、ブラウザ拡張機能を通じてユーザーの操作（クリック、入力）をバックグラウンドで記録し、瞬時にスクリーンショット付きのステップ・バイ・ステップ形式のマニュアルを生成する。これにより、マニュアル作成のコストは劇的に低下し、「SOPの民主化」が実現した。現在、多くの企業にとっての「SOP作成」とは、この第3世代ツールを使用することを指す。  
* 第4世代：ビデオ・インテリジェンス（2023年頃～）  
  そして今、生成AIとマルチモーダルモデル（映像・音声・テキストを同時に理解するAI）の進化により、新たなパラダイムが生まれつつある。それが「既成動画からの自動ドキュメント生成」である。第3世代ツールが「リアルタイムの操作」を必須とするのに対し、第4世代は「過去の録画データ」や「ラフに撮影した動画」を素材として受け入れ、そこから構造化されたドキュメントを抽出する。これは、企業のサーバーに眠る膨大な「ダークデータ（未活用の会議録画やトレーニング動画）」を資産化する試みである。

### **1.2 「動画Input → テキストOutput」機能の定義と戦略的重要性**

本レポートにおいて分析対象とする「動画Input → テキストOutput」機能とは、以下の要件を満たすものを指す。

1. **入力（Input）：** ユーザーが操作をリアルタイムで行うのではなく、既存の動画ファイル（MP4, MOV等）や、動画共有リンク（Loom, Zoom, YouTube等）をツールにアップロード/インポートできること。  
2. **処理（Process）：** ツールが動画の内容を解析し、主要な操作ステップを識別し、適切なスクリーンショットを切り出し、操作内容を言語化（テキスト化）すること。  
3. **出力（Output）：** 最終成果物が単なる「文字起こし（Transcript）」や「動画要約」ではなく、\*\*手順番号、画像、説明文で構成されたSOP形式（How-toガイド）\*\*であること。

この機能の戦略的重要性は計り知れない。  
第一に、\*\*「レガシー資産の活用」である。企業はScribe導入以前に作成された膨大な動画マニュアルを保有している。これらを一つ一つ手動でScribeで再現・再作成することは現実的ではない。動画から直接SOPを生成できれば、過去の資産を一瞬で最新のフォーマットに変換できる。  
第二に、「クロスプラットフォーム対応」である。Scribe等の第3世代ツールはWebブラウザ（Chrome等）の構造解析に依存しており、レガシーなデスクトップアプリや、Citrix等の仮想デスクトップ環境、あるいは物理的な機械操作の記録には弱い。動画であれば、画面に映るものが何であれ（Webでもアプリでも物理世界でも）、AIは視覚情報として処理できる。  
第三に、「文脈の付与」\*\*である。クリック操作だけを記録するツールは「何をしたか（Action）」は正確に記録するが、「なぜしたか（Context）」は記録できない。対して、動画（特に音声解説付き）を入力とするツールは、話者の解説を解析し、SOPの注釈として自動的に組み込むことができる。

### **1.3 本調査の範囲と方法論**

本レポートでは、ユーザーから提示されたリサーチスニペットに基づき、主要なグローバルプレイヤー（Scribe, Tango, Guidde, Floik）および新興プレイヤー（Glitter AI, Clueso, Docsie）、さらには日本市場の関連ツール（Teachme Biz, i-Tutor等）を対象とする。

分析手法として、各ツールの公式サイト、ヘルプセンター、G2などのレビューサイト、技術ドキュメントを精査し、「動画ファイルのインポート可否」と「生成されるドキュメントの構造」を基準に評価を行った。その結果に基づき、4象限マトリクスを作成し、各社のポジショニングとシェアを可視化する。なお、具体的な売上シェア等は非公開情報であるため、機能実装の有無、マーケティングの注力度、ユーザレビューの言及頻度に基づく「機能的シェア（Feature Share）」および「マインドシェア」として推計を行う。

## ---

**2\. 技術的背景：なぜ「動画変換」は難しいのか**

ScribeやTangoといった市場の巨人が、なぜ「動画からのSOP生成」という明白なニーズに対して即座に応えられないのか。その理由は、機能の優先順位ではなく、**根本的な技術アーキテクチャの違い**にある。

### **2.1 DOMキャプチャ方式（Scribe/Tango型）の構造的限界**

ScribeやTangoのコア技術は、「DOM（Document Object Model）リスナー」と呼ばれるものである。  
これらはブラウザ拡張機能として動作し、HTMLの構造を常に監視している。ユーザーがボタンをクリックした瞬間、ツールは「画面の絵」を見ているのではなく、「コード」を見ている。

* **処理の流れ：** ユーザーが \<button id="save"\>Save\</button\> をクリック → ツールが「クリックイベント」を検知 → ボタンの要素名（Save）とアイコンを取得 → 「Saveボタンをクリックする」というテキストをプログラム的に生成。  
* **強み：** データが極めて軽量（テキストと座標のみ）。生成されるテキストが正確（プログラムから直接名前を取得するため）。  
* **弱点（動画への壁）：** **動画ファイルには「コード」が含まれていない。** 動画は毎秒30コマのピクセル（色の点の集合）の流れに過ぎない。Scribeのエンジンに動画ファイルを渡しても、そこにはクリックすべきDOM要素も、HTMLタグも存在しないため、彼らの既存の技術では何も解析できないのである。

### **2.2 マルチモーダルAI方式（Glitter/Docsie型）の技術的ブレイクスルー**

一方、「動画Input」を実現するGlitter AIやClueso、Docsieといったツールは、全く異なるアプローチ、「コンピュータビジョン（視覚AI）」を採用している。

* **処理の流れ：** 動画ファイルをフレーム単位で画像解析 → OCR（光学文字認識）で画面上の文字を読み取る → 物体検知AIが「ボタンらしき形状」「カーソルの動き」を特定 → 音声認識AIが話者の解説をテキスト化 → LLM（大規模言語モデル）が視覚情報と音声情報を統合し、「ユーザーはここで保存ボタンを押した」と推論してステップを生成。  
* **技術的要件：** 高度なGPUリソースと、複雑なAIモデル（GPT-4 Visionなど）が必要。  
* **以前の課題：** かつてこの方式は精度が低く、処理に時間がかかり、コストも高かったため、Scribe方式に敗北していた。  
* **現在の状況：** AIモデルの劇的な進化により、精度と速度が実用レベルに達した。これにより、「動画からの逆生成」が可能になった。

### **2.3 「イベントログ」対「ピクセル解析」の決定的な溝**

この技術的な溝（Tech Stack Gap）は深い。Scribeが動画入力をサポートするには、現在の「軽量なイベントロガー」としてのアーキテクチャとは別に、全く新しい「重量級の動画解析エンジン」を開発・統合する必要がある。これは単なる機能追加ではなく、プロダクトの再定義に近い。  
したがって、ScribeやTangoといった現行の覇者は、構造的にこの「動画Input」市場に参入しにくい（イノベーターのジレンマ）状況にあると言える。この間隙を縫って、AIネイティブなスタートアップが急速にシェアを伸ばしているのが現状である。

## ---

**3\. 主要グローバルプレイヤーの詳細分析（インカンベント企業）**

ここでは、SOP作成ツールの代名詞とも言えるグローバルリーダーたちの現状と、「動画Input」に対するスタンスを分析する。

### **3.1 Scribe (ScribeHow)：市場の絶対王者とその死角**

概要：  
Scribeは、SOP作成の自動化を定義したパイオニアであり、圧倒的なユーザーベースを持つ。ブラウザ拡張機能をONにして作業するだけで、美しいビジュアルガイドが瞬時に生成される体験は、業務マニュアル作成の標準となった。  
**「動画Input → テキストOutput」の対応状況：**

* **対応：** **不可（NO）**  
* 詳細分析：  
  リサーチ資料 1 によると、Scribeのワークフローは一貫して「Record（録画/記録）ボタンを押して操作を開始する」ことから始まる。生成プロセスは「クリック、キーストローク、スクロール」のキャプチャに依存している。  
  Scribeには「ファイルのアップロード」機能が存在するが 4、これはSOP内に参考資料としての画像やPDFを添付するためのものであり、アップロードされた動画を解析してSOPに変換する機能ではない。  
  また、Scribeのヘルプページ 5 では、インストラクショナルビデオ（動画）とScribe（ガイド）の違いについて言及しており、動画の補完としてScribeを使うことを推奨しているが、動画からScribeを作る機能については触れられていない。  
* 結論：  
  Scribeは「操作の記録」に特化しており、「動画の変換」機能は持たない。既存の動画ライブラリをSOP化したいというニーズに対しては、Scribeは無力である。

### **3.2 Tango：ガイド機能の覇者と「非動画」宣言**

概要：  
TangoはScribeの最大の競合であり、特に「Guide Me」と呼ばれるオン・スクリーン・ガイダンス（実際のアプリ画面上に操作指示をオーバーレイ表示する機能）に強みを持つ。  
**「動画Input → テキストOutput」の対応状況：**

* **対応：** **不可（NO）**  
* 詳細分析：  
  リサーチ資料 6 によると、Tangoは自身を「Not a video recorder（ビデオレコーダーではない）」と明確に定義している。Tangoの価値提案は、静的な動画ではなく、インタラクティブなガイドを提供することにある。  
  TangoのキャプチャもScribe同様、ブラウザ拡張機能を通じたDOM解析に基づいており、動画ファイルをインポートして解析する機能は提供されていない。  
* 結論：  
  Tangoは「動画からの脱却」を掲げるツールであり、動画Input機能の実装には戦略的にも消極的であると推測される。彼らのシェアはあくまで「Web操作のリアルタイムガイド化」にある。

### **3.3 インカンベント企業の「動画Input」対応状況と戦略的意図**

ScribeとTangoは、現在のところ「動画Input」市場において\*\*シェア0%\*\*である。彼らは「動画マニュアルは古く、更新が大変で、見られない」という前提に立ち、動画を代替する存在として自らをポジショニングしている。  
しかし、現実には「Zoomで録画したトレーニング」や「Loomで送られたバグ報告」など、フロー情報は依然として動画で生成され続けている。この「フロー動画をストックSOPに変換したい」という巨大な需要に対し、王者は不在の状態にある。

## ---

**4\. チャレンジャー企業の詳細分析（ビデオインテリジェンス企業）**

インカンベント企業が放置している「動画Input」の領域で、急速に存在感を高めているのがAIネイティブなチャレンジャーたちである。彼らはSOP作成における「動画活用」をコア機能として据えている。

### **4.1 Glitter AI：音声と動画を「文脈」に変える急先鋒**

概要：  
Glitter AIは、Scribeの直接的な代替ツールとして自らを位置づけつつ、Scribeにはない「音声認識」と「動画解析」を武器にする新興プレイヤーである。  
**「動画Input → テキストOutput」の対応状況：**

* **対応：** **対応（YES・コア機能）**  
* 詳細分析：  
  リサーチ資料 8 によると、Glitter AIは「Video to SOP Converter」を主要機能として謳っている。ZoomやLoomの録画、あるいはMP4ファイルをアップロードすると、AIが「重要な瞬間（Key Moments）」を特定し、スクリーンショットを生成し、音声を書き起こして説明文を作成する。  
* 差別化要因：  
  Scribeが「クリックしました」という機械的なテキストしか生成できないのに対し、Glitter AIはユーザーが録画中に喋った内容（「このボタンは〇〇の場合にのみ押してください」といった文脈）をそのままSOPの説明文に反映できる。これは「Action」だけでなく「Context」を保存できる点で革新的である。  
* シェア評価：  
  「動画からSOPを作りたい」という特定の検索意図やニーズにおいては、現在最も有力な選択肢の一つとなっている。

### **4.2 Clueso：サポート動画をナレッジベース化するSaaS特化型**

概要：  
Cluesoは、主にSaaS企業のカスタマーサポートやサクセスチームをターゲットにしたツールである。Loomなどで撮影された個別のサポート動画を、再利用可能なナレッジベース記事に変換することを主眼に置く。  
**「動画Input → テキストOutput」の対応状況：**

* **対応：** **対応（YES・コア機能）**  
* 詳細分析：  
  リサーチ資料 10 によると、Cluesoは「スクリーンレコーディングを洗練されたビデオとドキュメントに変える」と明言している。  
  特に、未編集のラフな動画（"Raw screen recordings"）を入力とし、AIが不要な部分をカットし、カーソルの動きを滑らかにし、さらにステップ・バイ・ステップの記事（SOP）を自動生成する。  
* シェア評価：  
  サポートチーム向けのニッチ市場において、LoomとZendesk/Intercomの間をつなぐミドルウェアとして高いシェアを獲得しつつある。

### **4.3 Docsie：産業用トレーニング動画をSOP化するエンタープライズソリューション**

概要：  
Docsieは、より大規模で複雑なドキュメンテーション管理（CMS）を提供するプラットフォームである。  
**「動画Input → テキストOutput」の対応状況：**

* **対応：** **対応（YES・エンタープライズ機能）**  
* 詳細分析：  
  リサーチ資料 11 によると、Docsieは「True Video Intelligence」を謳い、単なる音声文字起こしにとどまらず、画面上のUI要素やコード、産業機械の操作などを視覚的に理解するAIを搭載している。「2時間のトレーニング動画を45分の検索可能なガイドにする」といったユースケースが示されており、製造業や大規模システム開発などの重厚なニーズに対応している。  
* シェア評価：  
  SMB（中小企業）よりもエンタープライズ、特に製造業や複雑なITインフラを持つ企業群において、動画資産の活用ツールとして認知されている。

### **4.4 Guidde & Floik：動画とドキュメントの境界を溶かすハイブリッドアプローチ**

概要：  
GuiddeとFloikは、テキストSOPよりも「動画ガイド」そのものの生成に重きを置くが、その過程でテキスト化も行うハイブリッドなツールである。  
**「動画Input → テキストOutput」の対応状況：**

* Guidde 13： MP4のアップロードに対応。AIが動画を解析し、チャプター分けと説明文を生成する。ただし、出力の主役はあくまで「AI音声付きの動画」であり、テキストSOPは動画の付属品（トランスクリプト等）という位置づけに近い。  
* Floik 15： 動画をアップロードすると、インタラクティブなデモ（Flo）やステップ・バイ・ステップガイドに変換する機能を持つ。SOPとしての出力機能も有している。

## ---

**5\. 日本市場における特異点とグローバルとの対比**

日本のSOPツール市場は、製造業や小売業の現場改善（カイゼン）文化を背景に、独自の進化を遂げてきた。グローバルプレイヤーの分析に加え、リサーチスニペットに頻出した日本発ツールの「動画Input」対応状況を分析する。

### **5.1 Teachme Biz：AIによる動画解析と「半自動生成」の進化**

概要：  
Teachme Biz（スタディスト社）は、日本のビジュアルSOP市場のリーダーである。スマートフォンベースの作成に強みを持つ。  
**「動画Input → テキストOutput」の対応状況：**

* **対応：** **対応（YES・Teachme AI機能）**  
* 詳細分析：  
  リサーチ資料 16 によると、「Teachme AI」という機能により、動画からのマニュアル半自動生成を実現している。動画をアップロードすると、AIが作業の区切り（ステップ）を自動で分割し、字幕と説明文を生成する。  
* 特異点：  
  Scribe等がPCブラウザ操作に特化しているのに対し、Teachme Bizは「現場の作業（物理的な動き）」の動画化を想定している点が大きく異なる。

### **5.2 Dojo & i-Tutor：レガシーな高機能ツールにおける動画活用の現状**

概要：  
Dojo（テンダ社）やi-Tutor（ブルーポート社）は、PC操作ログ型のマニュアル作成ツールの日本における先駆者である。  
**「動画Input → テキストOutput」の対応状況：**

* i-Tutor 18： 動画を取り込んで編集し、マニュアル化する機能を有している（「既存の動画を取り込み、スライド化して編集」）。  
* Dojo 19： 自動作成機能が主だが、動画のインポートや編集機能も充実しており、eラーニング教材作成の一環として動画活用が可能。  
* 評価：  
  これらは機能として「動画取り込み」を持っているが、最新のAIツール（Glitter等）のように「AIが勝手に文脈を理解して文章化する」というよりは、エディタとしての取り込み機能に近い側面がある（※最新版でのAI実装状況によるが、スニペット上では従来型機能の延長に見える）。

### **5.3 VideoStep：動画マニュアル特化型のポジション**

概要：  
VideoStep 20 は、「動画マニュアル」作成に特化したクラウドサービスである。

* **対応：** 動画ファイルをアップロードし、AI音声読み上げや字幕編集を行う機能を持つ。出力は主に「動画」であり、テキストSOPへの変換というよりは、動画ナレッジの高度化に主眼がある。

## ---

**6\. 4象限マトリクスによる市場整理**

以上の分析に基づき、SOP作成ツール市場における「動画Input」機能のポジショニングを4象限マトリクスで整理する。

### **6.1 マトリクスの定義と軸の設定**

* **X軸：インプットの柔軟性（Input Modality）**  
  * **左側（Action-Based）：** リアルタイムの操作記録（Click/Capture）に依存。動画ファイルは扱えない。  
  * **右側（Video-Based）：** 既成の動画ファイル（MP4/URL）のアップロードと解析が可能。  
* **Y軸：アウトプットの構造（Output Structure）**  
  * **下側（Visual/Media）：** 主な出力が「動画」「インタラクティブデモ」などのメディア形式。  
  * **上側（Structured SOP）：** 主な出力が「文書（PDF/HTML/Doc）」、構造化された手順書。

### **6.2 各象限の特性と代表的プレイヤー**

| 象限 | 定義 | 代表的プレイヤー | 「動画Input」シェア評価 |
| :---- | :---- | :---- | :---- |
| **第1象限（右上）** | **The Transformers** (トランスフォーマー) 動画を構造化テキストSOPに変換する「聖杯」領域。 | **Glitter AI, Clueso, Docsie, ScreenApp** *(日本：Teachme Biz)* | **独占的（Dominant）** この特定のユースケースにおいては、彼らが市場のほぼ100%を握る。 |
| **第2象限（左上）** | **The Incumbents** (インカンベント：現王者) 操作記録からのSOP作成には最強だが、動画は扱えない。 | **Scribe, Tango, UiPath Task Capture** *(日本：Dojo, i-Tutor※)* | **皆無（Negligible）** SOP市場全体のシェアは高いが、動画変換においてはシェアを持たない。 |
| **第3象限（右下）** | **The Media Hubs** (メディアハブ) 動画を取り込み、よりリッチな動画やデモを作る。 | **Guidde, Floik, Loom AI, VideoStep** | **中程度（Moderate）** 動画→動画の変換ニーズを吸収している。 |
| **第4象限（左下）** | **The Recorders** (レコーダー) 単純な録画、または手動編集前提。 | **Loom (Standard), Snagit** | **減少傾向（Declining）** AI機能を持たないツール群。 |

*(※注：Dojoやi-Tutorは動画インポート機能を持つが、AIによる自動変換の文脈では第2象限的な「操作ログ重視」の性質も強いため、便宜上ここに分類するが、機能的には第1象限への移行を図っている)*

### **6.3 「動画Input」領域におけるシェア推定と競争ダイナミクス**

ユーザーの問いである「動画Input → テキストベースoutputの領域がどの程度シェアがあるか」に対する回答は以下の通りである。

1. Scribe/Tangoのシェアは実質ゼロである。  
   彼らは「動画Input」機能自体を提供していないため、この特定機能市場におけるシェアは存在しない。ユーザーがScribeを使っている場合、動画資産の活用は諦めているか、別のツールを併用している。  
2. この領域は「AIネイティブ勢」の独壇場である。  
   Glitter AIやClueso、Docsieなどが、このニッチだが深い需要（"Knowledge Debt"の解消）を独占している。特に、既存の動画資産が多いエンタープライズ企業や、サポート対応の動画が蓄積されるSaaS企業において、これらのツールのシェアが高い。  
3. 日本市場ではTeachme Bizが先行している。  
   グローバルではスタートアップが乱立しているが、日本ではTeachme BizがAI機能を統合し、既存ユーザーに対して動画活用ソリューションを提供することで、この領域のシェアを固めつつある。

## ---

**7\. 戦略的考察と将来展望**

### **7.1 「グリーンフィールド（新規作成）」と「ブラウンフィールド（資産活用）」の戦い**

現在のSOP市場は、新規作成（Greenfield）においてはScribe/Tangoが勝者である。しかし、過去の資産活用（Brownfield）においては勝者不在であった。第1象限のプレイヤー（Transformers）は、このBrownfield市場（過去の録画データ）を足掛かりに、徐々に新規作成市場（Greenfield）へも浸食しようとしている（例：Glitter AIはデスクトップアプリも提供し、リアルタイム記録も可能にしている）。

### **7.2 機能のコモディティ化とM\&Aの可能性**

「動画からのテキスト生成」は、技術的にはOpenAIのGPT-4o等のAPIを利用すれば実装可能になりつつある。したがって、この機能は長期的にはコモディティ化する可能性が高い。  
予想されるシナリオ： ScribeやTangoが、自社開発あるいはM\&A（CluesoやGlitter AIの買収）を通じて、この機能を「標準搭載」する未来である。そうなれば、現在の第1象限のプレイヤーは「機能」としての優位性を失い、「プラットフォーム」としての価値（CMS機能、分析機能など）での勝負を余儀なくされるだろう。

### **7.3 エージェンティックAI（Agentic AI）への進化**

次のフェーズは「ドキュメント化」を超えた「自動化」である。Docsieなどが示唆するように、AIは動画を見て「手順書を作る」だけでなく、「その手順を自動実行するスクリプト（RPA）」を生成するようになるだろう。  
リサーチ資料にあるAssisterr 22 のような分散型AIやSLM（小規模言語モデル）の動きは、特定の業務知識を学習したAIエージェントが、SOPを介さずに直接業務を代行する未来を示唆している。動画は、そのエージェントを教育するための「教師データ」として、SOP以上の価値を持つようになる可能性がある。

## ---

**8\. 結論**

グローバルSOP作成ツール市場において、ScribeやTangoといったトッププレイヤーは「動画Input」機能を持たず、この領域でのシェアは皆無である。彼らは「操作ログの記録」という特定の技術に最適化しすぎた結果、動画という非構造化データの活用において後れを取っている。

対照的に、Glitter AI、Clueso、Docsieといった新興プレイヤーは、最新のマルチモーダルAI技術を駆使し、「動画Input → テキストOutput」という高付加価値なニッチ市場を確立・独占している。日本市場においては、Teachme Bizがこのトレンドをいち早く取り込み、動画と静止画のハイブリッドなマニュアル作成環境を提供している。

ユーザーへの提言：  
もし貴社の目的が「Webブラウザ上の操作を新規にマニュアル化すること」であれば、依然としてScribeやTangoが最適解である。しかし、「過去の会議録画をマニュアル化したい」「Web以外のアプリや物理作業を動画からマニュアル化したい」というニーズであれば、迷わず第1象限のGlitter AIやClueso、あるいは日本向けのTeachme Bizを選択すべきである。市場は今、単なる「記録ツール」から、あらゆる視聴覚情報をナレッジに変換する「インテリジェンス・プラットフォーム」へと移行しつつある。

#### **引用文献**

1. How does scribehow work | Scribe, 1月 17, 2026にアクセス、 [https://scribehow.com/page/How\_does\_scribehow\_work\_\_19m7THKLQzCrofGXcVK2Qg](https://scribehow.com/page/How_does_scribehow_work__19m7THKLQzCrofGXcVK2Qg)  
2. New User Guide \- Scribe Support Portal, 1月 17, 2026にアクセス、 [https://support.scribehow.com/hc/en-us/articles/8951146003741-New-User-Guide](https://support.scribehow.com/hc/en-us/articles/8951146003741-New-User-Guide)  
3. How to create step-by-step guides with Scribe, 1月 17, 2026にアクセス、 [https://scribehow.com/shared/How\_to\_create\_step-by-step\_guides\_with\_Scribe\_\_C1WorW83Rp6RUp5NTINlAw](https://scribehow.com/shared/How_to_create_step-by-step_guides_with_Scribe__C1WorW83Rp6RUp5NTINlAw)  
4. How to use the Upload Files Feature \- Scribe, 1月 17, 2026にアクセス、 [https://scribehow.com/viewer/How\_to\_use\_the\_Upload\_Files\_Feature\_\_KopRV6dXRLabDR1ZUs8B-w](https://scribehow.com/viewer/How_to_use_the_Upload_Files_Feature__KopRV6dXRLabDR1ZUs8B-w)  
5. How to Make Instructional Videos: Step-by-Step Guide | Scribe, 1月 17, 2026にアクセス、 [https://scribe.com/library/instructional-video](https://scribe.com/library/instructional-video)  
6. How do I start capturing a Workflow? \- Tango Help Center, 1月 17, 2026にアクセス、 [https://help.tango.ai/en/articles/5971654-how-do-i-start-capturing-a-workflow](https://help.tango.ai/en/articles/5971654-how-do-i-start-capturing-a-workflow)  
7. how to create visual step-by-step guides FAST with Tango \- Midnight Music, 1月 17, 2026にアクセス、 [https://midnightmusic.com/2022/01/how-to-create-visual-step-by-step-guides-fast-with-tango/](https://midnightmusic.com/2022/01/how-to-create-visual-step-by-step-guides-fast-with-tango/)  
8. Scribe vs Glitter AI: 2026 Comparison, 1月 17, 2026にアクセス、 [https://www.glitter.io/compare/scribe-vs-glitter-ai](https://www.glitter.io/compare/scribe-vs-glitter-ai)  
9. Video to SOP Converter \- Turn Recordings into Guides | Glitter AI, 1月 17, 2026にアクセス、 [https://www.glitter.io/product/video-to-sop](https://www.glitter.io/product/video-to-sop)  
10. Clueso \- Create incredible product videos, documentation, and more – in minutes, with AI., 1月 17, 2026にアクセス、 [https://www.clueso.io/](https://www.clueso.io/)  
11. Convert Process Videos to SOPs \- AI SOP Generator for Quality Teams \- Docsie, 1月 17, 2026にアクセス、 [https://www.docsie.io/solutions/videos-to-standard-operating-procedures/](https://www.docsie.io/solutions/videos-to-standard-operating-procedures/)  
12. Video to Documentation Converter \- AI Training Video Transcription \- Docsie, 1月 17, 2026にアクセス、 [https://www.docsie.io/solutions/documentation-from-video/](https://www.docsie.io/solutions/documentation-from-video/)  
13. Guidde \- Magically create video documentation \- Chrome Web Store, 1月 17, 2026にアクセス、 [https://chromewebstore.google.com/detail/guidde-magically-create-v/oacmmmjedhheaijfjidilonpngccnhdl](https://chromewebstore.google.com/detail/guidde-magically-create-v/oacmmmjedhheaijfjidilonpngccnhdl)  
14. Upload MP4 Videos to Guidde, 1月 17, 2026にアクセス、 [https://help.guidde.com/en/articles/11193962-upload-mp4-videos-to-guidde](https://help.guidde.com/en/articles/11193962-upload-mp4-videos-to-guidde)  
15. Turn Your Videos into Flos | Floik Features, 1月 17, 2026にアクセス、 [https://www.floik.com/features/upload-video](https://www.floik.com/features/upload-video)  
16. New release of the "Teachme AI"\! Automate manual creation with AI | Released on 2024/06/27 – Help Center, 1月 17, 2026にアクセス、 [https://help.teachme.jp/hc/en-us/articles/33589475758489-New-release-of-the-Teachme-AI-Automate-manual-creation-with-AI-Released-on-2024-06-27](https://help.teachme.jp/hc/en-us/articles/33589475758489-New-release-of-the-Teachme-AI-Automate-manual-creation-with-AI-Released-on-2024-06-27)  
17. Please tell me about the AI-powered feature for semi-automatic manual creation from videos. – Help Center | Teachme Biz, 1月 17, 2026にアクセス、 [https://help.teachme.jp/hc/en-us/articles/45786130744857-Please-tell-me-about-the-AI-powered-feature-for-semi-automatic-manual-creation-from-videos](https://help.teachme.jp/hc/en-us/articles/45786130744857-Please-tell-me-about-the-AI-powered-feature-for-semi-automatic-manual-creation-from-videos)  
18. iTutor – Manual Creation Tool, 1月 17, 2026にアクセス、 [https://itutor.com.my/](https://itutor.com.my/)  
19. Manual creation tool "Dojo" | コスモサミット \- Powered by ipros, 1月 17, 2026にアクセス、 [https://pr.mono.ipros.com/en/csn/product/detail/2000734333/](https://pr.mono.ipros.com/en/csn/product/detail/2000734333/)  
20. What is the difference between video manual tools and video editing software?, 1月 17, 2026にアクセス、 [https://mono.ipros.com/en/product/detail/2001562311/](https://mono.ipros.com/en/product/detail/2001562311/)  
21. Video Knowledge Management Cloud "VideoStep" LAMILA | IPROS GMS, 1月 17, 2026にアクセス、 [https://mono.ipros.com/en/product/detail/2000677673](https://mono.ipros.com/en/product/detail/2000677673)  
22. What is Assisterr: The Future of Community-Owned AI \- Gate.com, 1月 17, 2026にアクセス、 [https://www.gate.com/learn/articles/what-is-assisterr--the-future-of-community-owned-ai/5607](https://www.gate.com/learn/articles/what-is-assisterr--the-future-of-community-owned-ai/5607)
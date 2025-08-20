# Sedori Platform (せどり商材紹介サービス)

せどり初心者〜中級者を対象とした、商材発見・仕入れ支援・販売予測・コミュニティを統合したプラットフォームです。

## 概要

本サービスは、AIによるリコメンド機能と仕入れから販売までのワンストップサポートを提供し、効率的な商材仕入れ候補の発見と利益率・販売予測の可視化を実現します。

### 主な価値提供
- 効率的な商材仕入れ候補の発見
- 利益率や販売予測の可視化
- 法規制（古物商、輸入）を考慮した支援
- コミュニティによる知見共有

### 対象ユーザー
- 副業でせどりを始めたい初心者
- 仕入れ効率化を目指す中級者
- 国内外仕入れを行う経験者

## 技術スタック

### アーキテクチャ
- **フロントエンド**: Next.js（静的配信）
- **バックエンド**: NestJS（APIサーバー）
- **データベース**: PostgreSQL
- **検索**: Meilisearch
- **キャッシュ**: Redis
- **ストレージ**: MinIO（S3互換）
- **リバースプロキシ**: Caddy
- **監視**: Prometheus + Grafana
- **ログ**: Loki + Promtail
- **インフラ**: Proxmox（Docker Compose）

## プロジェクト構成

```
sedori-platform/
├── frontend/                 # Next.js アプリケーション
│   ├── src/
│   │   ├── components/      # 再利用可能なUIコンポーネント
│   │   ├── pages/          # Next.js ページ/ルート
│   │   ├── hooks/          # カスタムReactフック
│   │   ├── utils/          # ユーティリティ関数
│   │   └── types/          # TypeScript型定義
│   ├── public/             # 静的アセット
│   └── package.json
├── backend/                  # NestJS APIサーバー
│   ├── src/
│   │   ├── modules/        # 機能モジュール
│   │   ├── common/         # 共有ユーティリティ
│   │   ├── database/       # データベース設定
│   │   └── main.ts         # アプリケーションエントリーポイント
│   └── package.json
├── docker-compose.yml        # 開発環境
├── docker-compose.prod.yml   # 本番環境
└── docs/                    # 追加ドキュメント
```

## 開発環境のセットアップ

### 前提条件
- Docker & Docker Compose
- Node.js (推奨: 18.x以上)
- npm または yarn

### 開発用コマンド

```bash
# 全サービス起動
docker-compose up -d

# 全サービス停止
docker-compose down

# ログ確認
docker-compose logs -f

# データベース操作
npm run db:migrate           # マイグレーション実行
npm run db:seed             # テストデータ投入
npm run db:backup           # データベースバックアップ

# テスト
npm run test                # ユニットテスト
npm run test:e2e           # E2Eテスト
npm run test:coverage      # カバレッジレポート生成

# ビルド・デプロイ
npm run build              # 本番用ビルド
npm run start:prod         # 本番サーバー起動
```

## 開発フェーズ

- **フェーズ1（MVP）**: 商材検索 + 利益計算 + ユーザー登録
- **フェーズ2**: AIリコメンド + 実績管理
- **フェーズ3**: コミュニティ機能 + マーケットプレイス化

## 主要機能

### 現在の機能
- 商材検索（キーワード、カテゴリ）
- 卸価格・販売相場の表示
- 利益シミュレーション（粗利、回転率）
- ユーザー管理（無料会員、プレミアム会員）

### 今後の機能
- AIによる仕入れ候補リコメンド
- 実績管理ダッシュボード
- コミュニティ機能

## パフォーマンス要件

- レスポンス時間: 1秒以内（100同時接続）
- 可用性: 99.9%
- セキュリティ: HTTPS必須、SQLインジェクション対策

## ライセンス

[ライセンス情報を記載]

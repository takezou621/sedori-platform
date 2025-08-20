# せどり商材紹介サービス 仕様書

## 1. システム構成
- フロントエンド：Next.js（静的配信）
- バックエンド：NestJS（APIサーバー）
- DB：PostgreSQL
- 検索：Meilisearch
- キャッシュ：Redis
- ストレージ：MinIO（S3互換）
- リバースプロキシ：Caddy
- 監視：Prometheus + Grafana
- ログ：Loki + Promtail
- インフラ：Proxmox（単一VM上でDocker Compose）

## 2. ユーザー機能
1. ユーザー登録／ログイン（無料・有料）
2. 商材検索（カテゴリ、キーワード）
3. 利益シミュレーション（粗利、回転率）
4. 商材詳細（卸価格、相場、在庫推定）
5. AIリコメンド（成長期）
6. 実績管理ダッシュボード（成長期）
7. コミュニティ機能（将来）

## 3. 管理者機能
- ユーザー管理（会員ランク、利用状況）
- 商材データ管理（API連携、更新）
- 課金管理（Stripe/Pay.jp連携）
- コミュニティモデレーション
- KPIダッシュボード

## 4. データベース設計（概要ER）
- Users（id, name, email, role, plan）
- Products（id, name, category, price, supplier）
- Sales（id, user_id, product_id, profit, date）
- Recommendations（id, user_id, product_id, score）

## 5. 非機能要件
- セキュリティ：HTTPS必須、JWT認証、SQLインジェクション対策
- バックアップ：日次DB dump + 週次フルVMバックアップ
- パフォーマンス：レスポンス1秒以内（100同時接続）
- スケーラビリティ：将来的にクラウド移行可能

## 6. 開発フェーズ
- フェーズ1：MVP（商材検索＋利益計算＋ユーザー登録）
- フェーズ2：AIリコメンド＋実績管理
- フェーズ3：コミュニティ機能＋マーケットプレイス化

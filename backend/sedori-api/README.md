# 🚀 Sedori Platform API

Sedori Platform APIは、せどり事業者向けの包括的なバックエンドソリューションです。商品管理、注文処理、分析機能、高度な検索機能などを提供する完全なRESTful APIプラットフォームです。

## ✨ 主要機能

### 🔐 認証・認可
- JWT ベースの認証システム
- ロールベースのアクセス制御（RBAC）
- ユーザー登録・ログイン・プロフィール管理

### 📦 商品管理
- 商品のCRUD操作
- カテゴリ分類（階層構造対応）
- 在庫管理
- 市場データと収益性分析
- 商品画像とメタデータ管理

### 🛒 ショッピングカート・注文管理
- リアルタイムカート機能
- 注文作成・追跡・管理
- 複数の支払い状態管理
- 配送先・請求先住所管理
- 注文履歴とステータス更新

### 📊 アナリティクス・レポート
- リアルタイムダッシュボード
- 売上・ページビュー・ユーザー行動分析
- 人気商品・カテゴリ分析
- 時系列データとトレンド分析
- カスタム期間でのレポート生成

### 🔍 高度な検索・フィルタリング
- 全文検索（PostgreSQL ベース）
- ファセット検索（カテゴリ、ブランド、価格帯等）
- 検索結果のソート・ページネーション
- 検索候補・オートコンプリート
- 検索行動の追跡・分析

## 🏗️ 技術スタック

- **フレームワーク**: NestJS (Node.js)
- **データベース**: PostgreSQL with TypeORM
- **認証**: JWT (JSON Web Tokens)
- **バリデーション**: class-validator
- **ドキュメント**: Swagger/OpenAPI
- **テスト**: Jest
- **開発環境**: Docker Compose

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

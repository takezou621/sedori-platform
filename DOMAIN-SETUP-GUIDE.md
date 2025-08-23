# 🌐 ドメイン設定ガイド - Sedori Platform

## 1️⃣ ドメイン取得

### 推奨ドメインレジストラ
- **Cloudflare** (推奨) - DNS管理も統合
- **Google Domains** - 簡単管理
- **お名前.com** - 日本語サポート
- **ムームードメイン** - 日本語サポート

### 推奨ドメイン名例
```
sedori-platform.com
sedori-hub.com  
sedori-pro.com
your-company-name.com
```

## 2️⃣ DNS設定

### 必要なDNSレコード

#### A レコード（IPv4）
```
Type: A
Name: @
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto or 300

Type: A  
Name: www
Content: YOUR_SERVER_IP_ADDRESS
TTL: Auto or 300
```

#### AAAA レコード（IPv6、オプション）
```
Type: AAAA
Name: @
Content: YOUR_SERVER_IPv6_ADDRESS
TTL: Auto or 300
```

#### MXレコード（メール送信用、オプション）
```
Type: MX
Name: @
Content: mx.your-domain.com
Priority: 10
TTL: Auto or 300
```

### Cloudflare設定例

1. **Cloudflareアカウント作成**
   - https://cloudflare.com でアカウント作成
   - ドメインを追加

2. **DNS設定**
   ```
   Type: A, Name: @, Content: YOUR_SERVER_IP
   Type: A, Name: www, Content: YOUR_SERVER_IP
   Type: CNAME, Name: api, Content: your-domain.com
   ```

3. **プロキシ設定**
   - オレンジクラウド（プロキシ有効）を推奨
   - DDoS保護・CDN機能が有効になります

4. **SSL設定**
   - SSL/TLS → Overview → Full (strict) を選択

## 3️⃣ SSL証明書セットアップ

### 自動セットアップ（推奨）
```bash
# SSL証明書を自動取得・設定
./scripts/setup-ssl.sh your-domain.com admin@your-domain.com

# テスト環境の場合（ステージング証明書）
./scripts/setup-ssl.sh your-domain.com admin@your-domain.com true
```

### 手動セットアップ
```bash
# 1. Certbotでの証明書取得
docker run --rm \
  -p 80:80 \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --standalone \
  --email admin@your-domain.com \
  --agree-tos \
  -d your-domain.com \
  -d www.your-domain.com

# 2. 証明書をnginxディレクトリにコピー  
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./nginx/ssl/key.pem
```

## 4️⃣ 環境変数更新

### .env.production ファイル更新
```bash
# ドメイン設定を更新
DOMAIN=your-actual-domain.com
SSL_EMAIL=admin@your-actual-domain.com

# 必要に応じて他の設定も更新
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
JWT_SECRET=STRONG_JWT_SECRET_32_CHARS_MIN
```

## 5️⃣ プロダクション環境起動

### 本番環境の起動
```bash
# 環境変数を読み込んで起動
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f

# ヘルスチェック
curl https://your-domain.com/health
curl https://your-domain.com/api/v1/auth/health
```

## 6️⃣ SSL証明書自動更新

### Cron設定（証明書の自動更新）
```bash
# crontabを編集
crontab -e

# 以下を追加（毎日12時に更新チェック）
0 12 * * * /usr/bin/docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot renew --quiet && \
  /usr/bin/docker-compose -f $(pwd)/docker-compose.prod.yml restart nginx
```

## 7️⃣ 動作確認

### SSL設定確認
```bash
# SSL証明書の確認
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# SSL評価（オンラインツール）
# https://www.ssllabs.com/ssltest/
```

### API動作確認
```bash
# API health check
curl -k https://your-domain.com/v1/auth/health

# ユーザー登録テスト
curl -X POST https://your-domain.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

## 🚨 トラブルシューティング

### SSL証明書取得エラー
```bash
# ドメインが正しく設定されているか確認
nslookup your-domain.com

# ポート80が開いているか確認  
telnet your-domain.com 80

# nginx設定テスト
docker run --rm -v $(pwd)/nginx/nginx.prod.conf:/etc/nginx/nginx.conf nginx:alpine nginx -t
```

### DNS設定エラー
```bash
# DNS伝播確認
dig your-domain.com
dig www.your-domain.com

# オンライン確認ツール
# https://www.whatsmydns.net/
```

### セキュリティヘッダー確認
```bash
# セキュリティヘッダーのチェック
curl -I https://your-domain.com

# オンラインツール
# https://securityheaders.com/
```

## 📞 サポート

SSL設定やドメイン設定でお困りの場合：

1. **ログ確認**: `docker-compose logs nginx`
2. **設定ファイル確認**: nginx設定ファイルの構文チェック
3. **ファイアウォール確認**: ポート80, 443が開いているか確認
4. **DNS確認**: ドメインが正しくサーバーIPを指しているか確認

**設定完了後は、[MONITORING-SETUP-GUIDE.md](./MONITORING-SETUP-GUIDE.md) に進んでください。**
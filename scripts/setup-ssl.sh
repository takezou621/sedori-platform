#!/bin/bash

# Sedori Platform - SSL Certificate Setup Script
# This script sets up Let's Encrypt SSL certificates with automatic renewal

set -e

# Configuration
DOMAIN=${1:-your-domain.com}
EMAIL=${2:-admin@your-domain.com}
STAGING=${3:-false}

echo "🔐 Setting up SSL certificates for Sedori Platform"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Staging: $STAGING"

# Create necessary directories
mkdir -p ./nginx/ssl
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Create temporary nginx config for certificate challenge
cat > ./nginx/nginx.temp.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://\$host\$request_uri;
        }
    }
}
EOF

# Start temporary nginx for certificate challenge
echo "🌐 Starting temporary nginx for certificate challenge..."
docker run --rm -d \
  --name temp-nginx \
  -p 80:80 \
  -v $(pwd)/nginx/nginx.temp.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/certbot/www:/var/www/certbot:ro \
  nginx:alpine

# Wait for nginx to start
sleep 3

# Determine certbot arguments
CERTBOT_ARGS="--webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email"
if [ "$STAGING" = "true" ]; then
    CERTBOT_ARGS="$CERTBOT_ARGS --staging"
fi

# Obtain certificates
echo "📜 Obtaining SSL certificates..."
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly $CERTBOT_ARGS -d $DOMAIN -d www.$DOMAIN

# Stop temporary nginx
echo "🛑 Stopping temporary nginx..."
docker stop temp-nginx

# Copy certificates to nginx ssl directory
echo "📋 Copying certificates..."
sudo cp $(pwd)/certbot/conf/live/$DOMAIN/fullchain.pem $(pwd)/nginx/ssl/cert.pem
sudo cp $(pwd)/certbot/conf/live/$DOMAIN/privkey.pem $(pwd)/nginx/ssl/key.pem
sudo chown $(whoami):$(whoami) $(pwd)/nginx/ssl/cert.pem $(pwd)/nginx/ssl/key.pem

# Update nginx configuration with actual domain
echo "⚙️ Updating nginx configuration..."
sed -i.bak "s/your-domain.com/$DOMAIN/g" ./nginx/nginx.prod.conf

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
docker run --rm -v $(pwd)/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

echo "✅ SSL certificates obtained successfully!"
echo ""
echo "Next steps:"
echo "1. Update your DNS records to point $DOMAIN to this server"
echo "2. Start the production environment: docker-compose -f docker-compose.prod.yml up -d"
echo "3. Set up certificate auto-renewal cron job"
echo ""
echo "To set up auto-renewal, add this to your crontab (crontab -e):"
echo "0 12 * * * /usr/bin/docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot renew --quiet && /usr/bin/docker-compose -f $(pwd)/docker-compose.prod.yml restart nginx"

# Clean up
rm -f ./nginx/nginx.temp.conf
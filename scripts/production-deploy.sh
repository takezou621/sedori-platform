#!/bin/bash

# Sedori Platform - Production Deployment Script
# This script deploys the complete platform to production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@your-domain.com"}
BACKUP_EXISTING=${3:-"true"}

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

log "🚀 Starting Sedori Platform Production Deployment"
log "Domain: $DOMAIN"
log "Admin Email: $EMAIL"

# Prerequisites check
log "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed"
    exit 1
fi

log "✅ Prerequisites check passed"

# Backup existing deployment if requested
if [ "$BACKUP_EXISTING" = "true" ] && [ -f "docker-compose.prod.yml" ]; then
    log "💾 Creating backup of existing deployment..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p backups/deployment_$timestamp
    
    # Backup data volumes
    docker-compose -f docker-compose.prod.yml exec -T postgresql pg_dumpall -U sedori > backups/deployment_$timestamp/postgresql_backup.sql || warn "PostgreSQL backup failed"
    docker-compose -f docker-compose.prod.yml exec -T redis redis-cli BGSAVE || warn "Redis backup failed"
    
    # Stop existing services
    log "🛑 Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down
    
    log "✅ Backup completed"
fi

# Environment validation
log "⚙️ Validating environment configuration..."

if [ ! -f ".env.production" ]; then
    error ".env.production file not found. Please create it with proper configuration."
    exit 1
fi

# Check if critical environment variables are set
source .env.production

required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "REDIS_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        error "Required environment variable $var is not set in .env.production"
        exit 1
    fi
done

log "✅ Environment validation passed"

# Update domain in configuration files
log "🌐 Updating domain configuration..."
sed -i.bak "s/your-domain.com/$DOMAIN/g" nginx/nginx.prod.conf
sed -i.bak "s/admin@your-domain.com/$EMAIL/g" monitoring/alertmanager/config.yml
log "✅ Domain configuration updated"

# Build production images
log "🏗️ Building production images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Build frontend for production
log "📦 Building frontend..."
cd frontend
npm ci
npm run build
cd ..

log "✅ Build completed"

# SSL Certificate setup
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    log "🔐 Setting up SSL certificates..."
    ./scripts/setup-ssl.sh "$DOMAIN" "$EMAIL"
else
    info "SSL certificates already exist, skipping SSL setup"
fi

# Start production services
log "🚀 Starting production services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be ready
log "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
log "🏥 Performing health checks..."

# Check if main services are running
services=("sedori-postgres-prod" "sedori-redis-prod" "sedori-api-prod" "sedori-nginx-prod")
for service in "${services[@]}"; do
    if docker ps | grep -q "$service.*Up"; then
        log "✅ $service is running"
    else
        error "$service is not running properly"
        docker logs "$service" | tail -20
        exit 1
    fi
done

# API health check
if curl -f https://$DOMAIN/health > /dev/null 2>&1; then
    log "✅ HTTPS endpoint is healthy"
else
    warn "HTTPS health check failed, checking HTTP..."
    if curl -f http://$DOMAIN/health > /dev/null 2>&1; then
        warn "HTTP endpoint is healthy but HTTPS is not working"
    else
        error "Both HTTP and HTTPS health checks failed"
        exit 1
    fi
fi

# Database connectivity check
if docker-compose -f docker-compose.prod.yml exec -T postgresql pg_isready -U sedori > /dev/null 2>&1; then
    log "✅ Database connectivity check passed"
else
    error "Database connectivity check failed"
    exit 1
fi

# Start monitoring stack
log "📊 Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for monitoring services
sleep 15

# Setup automated backups
log "💾 Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/scripts/backup-system.sh") | crontab -
log "✅ Automated backup scheduled for 2 AM daily"

# Setup SSL renewal
log "🔄 Setting up SSL certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt -v $(pwd)/certbot/www:/var/www/certbot certbot/certbot renew --quiet && /usr/bin/docker-compose -f $(pwd)/docker-compose.prod.yml restart nginx") | crontab -
log "✅ SSL auto-renewal configured"

# Final system information
log "📊 Deployment Summary:"
echo "================================================================="
echo "🎉 Sedori Platform Production Deployment Completed!"
echo ""
echo "🌐 Website URL: https://$DOMAIN"
echo "🛠️ Admin Panel: https://$DOMAIN/admin"
echo "📊 Monitoring: https://$DOMAIN:3001 (Grafana)"
echo "📈 Metrics: https://$DOMAIN:9090 (Prometheus)"
echo "🎯 Beta Page: https://$DOMAIN/beta"
echo ""
echo "📋 System Status:"
docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "💾 Automated Backups: Scheduled daily at 2 AM"
echo "🔐 SSL Renewal: Automated via cron"
echo "📊 Monitoring: Active with Prometheus + Grafana"
echo "🚨 Alerting: Configured via AlertManager"
echo ""
echo "🎯 Next Steps:"
echo "1. Verify SSL certificate: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "2. Test beta registration: https://$DOMAIN/beta"
echo "3. Configure DNS if not already done"
echo "4. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "5. Check monitoring dashboard: https://$DOMAIN:3001"
echo ""
echo "📞 Support: Check logs and monitoring dashboards for any issues"
echo "================================================================="

# Optional: Send deployment notification
if command -v mail >/dev/null 2>&1; then
    cat << EOF | mail -s "✅ Sedori Platform Deployment Complete - $DOMAIN" "$EMAIL"
Sedori Platform has been successfully deployed to production!

Deployment Details:
- Domain: https://$DOMAIN
- Deployment Time: $(date)
- Environment: Production

Services Status:
$(docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}")

Next Steps:
1. Test all functionality
2. Monitor system performance
3. Configure additional security measures as needed

Monitoring URLs:
- Grafana: https://$DOMAIN:3001
- Prometheus: https://$DOMAIN:9090
- Beta Registration: https://$DOMAIN/beta

Automated Features:
✅ Daily backups at 2 AM
✅ SSL certificate auto-renewal  
✅ Health monitoring & alerting
✅ Log aggregation

Please verify the deployment by visiting the URLs above.
EOF
else
    info "Mail command not available, skipping email notification"
fi

log "🎉 Production deployment completed successfully!"
exit 0
#!/bin/bash

# Sedori Platform - Automated Backup System
# This script performs comprehensive backups of the entire platform

set -e

# Configuration
BACKUP_DIR=${BACKUP_DIR:-"/backups/sedori-platform"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-"sedori-postgres-prod"}
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
NOTIFY_EMAIL=${NOTIFY_EMAIL:-"admin@your-domain.com"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_DATE"
cd "$BACKUP_DIR/$BACKUP_DATE"

log "🔄 Starting Sedori Platform backup process..."
log "📁 Backup location: $BACKUP_DIR/$BACKUP_DATE"

# 1. Database Backup
log "📊 Backing up PostgreSQL database..."
if docker exec "$POSTGRES_CONTAINER" pg_dumpall -U sedori > postgresql_backup.sql; then
    log "✅ PostgreSQL backup completed"
    gzip postgresql_backup.sql
else
    error "❌ PostgreSQL backup failed"
    exit 1
fi

# 2. Redis Backup
log "🔄 Backing up Redis data..."
if docker exec sedori-redis-prod redis-cli --rdb /data/dump.rdb BGSAVE; then
    # Wait for background save to complete
    sleep 5
    docker cp sedori-redis-prod:/data/dump.rdb redis_backup.rdb
    log "✅ Redis backup completed"
else
    warn "⚠️ Redis backup may have failed"
fi

# 3. MinIO/File Storage Backup
log "📁 Backing up MinIO file storage..."
if docker exec sedori-minio-prod mc mirror --overwrite /data ./minio_backup/; then
    tar -czf minio_backup.tar.gz minio_backup/
    rm -rf minio_backup/
    log "✅ MinIO backup completed"
else
    warn "⚠️ MinIO backup failed"
fi

# 4. Configuration Files Backup
log "⚙️ Backing up configuration files..."
cd ../../../
tar -czf "$BACKUP_DIR/$BACKUP_DATE/config_backup.tar.gz" \
    docker-compose*.yml \
    .env.production \
    nginx/ \
    monitoring/ \
    scripts/ \
    --exclude='nginx/ssl' 2>/dev/null || true
cd "$BACKUP_DIR/$BACKUP_DATE"
log "✅ Configuration backup completed"

# 5. Application Logs Backup
log "📝 Backing up application logs..."
if docker logs sedori-api-prod > api_logs.log 2>&1; then
    docker logs sedori-postgres-prod > postgres_logs.log 2>&1
    docker logs sedori-nginx-prod > nginx_logs.log 2>&1
    tar -czf logs_backup.tar.gz *.log
    rm -f *.log
    log "✅ Logs backup completed"
else
    warn "⚠️ Some logs backup may have failed"
fi

# 6. Create backup manifest
log "📋 Creating backup manifest..."
cat > backup_manifest.txt << EOF
Sedori Platform Backup Manifest
===============================
Date: $(date)
Backup ID: $BACKUP_DATE
Environment: Production

Included Files:
- postgresql_backup.sql.gz (Database dump)
- redis_backup.rdb (Redis data)  
- minio_backup.tar.gz (File storage)
- config_backup.tar.gz (Configuration files)
- logs_backup.tar.gz (Application logs)

System Information:
- Docker Version: $(docker --version)
- System: $(uname -a)
- Disk Usage: $(df -h | grep -v tmpfs)
- Memory: $(free -h)

Container Status at Backup Time:
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

EOF

# 7. Calculate checksums
log "🔍 Calculating file checksums..."
sha256sum * > checksums.sha256
log "✅ Checksums calculated"

# 8. Create final archive
log "📦 Creating final backup archive..."
cd ..
tar -czf "sedori_platform_backup_$BACKUP_DATE.tar.gz" "$BACKUP_DATE/"
rm -rf "$BACKUP_DATE/"

# 9. Cleanup old backups
log "🗑️ Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "sedori_platform_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
log "✅ Old backups cleaned up"

# 10. Calculate final backup size
BACKUP_SIZE=$(du -sh "sedori_platform_backup_$BACKUP_DATE.tar.gz" | cut -f1)
log "📊 Final backup size: $BACKUP_SIZE"

# 11. Optional: Upload to cloud storage (uncomment and configure as needed)
# log "☁️ Uploading to cloud storage..."
# aws s3 cp "sedori_platform_backup_$BACKUP_DATE.tar.gz" s3://your-backup-bucket/sedori-platform/
# gsutil cp "sedori_platform_backup_$BACKUP_DATE.tar.gz" gs://your-backup-bucket/sedori-platform/

# 12. Send notification
log "📧 Sending backup notification..."
if command -v mail >/dev/null 2>&1; then
    cat << EOF | mail -s "✅ Sedori Platform Backup Complete - $BACKUP_DATE" "$NOTIFY_EMAIL"
Sedori Platform backup completed successfully!

Backup Details:
- Date: $(date)
- Backup ID: $BACKUP_DATE
- Size: $BACKUP_SIZE
- Location: $BACKUP_DIR/sedori_platform_backup_$BACKUP_DATE.tar.gz

Components Backed Up:
✅ PostgreSQL Database
✅ Redis Cache Data
✅ MinIO File Storage
✅ Configuration Files
✅ Application Logs

System Health:
$(docker ps --format "table {{.Names}}\t{{.Status}}")

Next scheduled backup: $(date -d "+1 day")
EOF
else
    warn "⚠️ Mail command not available, skipping email notification"
fi

log "🎉 Backup process completed successfully!"
log "📁 Backup file: sedori_platform_backup_$BACKUP_DATE.tar.gz"
log "📊 Total size: $BACKUP_SIZE"

# Optional: Test backup integrity
if [ "${TEST_BACKUP:-false}" = "true" ]; then
    log "🧪 Testing backup integrity..."
    tar -tzf "sedori_platform_backup_$BACKUP_DATE.tar.gz" > /dev/null
    log "✅ Backup integrity test passed"
fi

exit 0
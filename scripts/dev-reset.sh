#!/bin/bash

# Development Environment Reset Script
# This script stops services and removes all data

set -e

echo "🔄 Resetting Sedori Platform development environment..."
echo "⚠️  This will remove ALL data from your local development environment!"
echo ""

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Reset cancelled."
    exit 0
fi

# Stop and remove containers, volumes, and networks
echo "🛑 Stopping services..."
docker-compose down -v --remove-orphans

# Remove volumes
echo "🗑️  Removing volumes..."
docker volume rm sedori-platform_postgres_data sedori-platform_redis_data sedori-platform_meilisearch_data sedori-platform_minio_data 2>/dev/null || true

echo "✅ Development environment reset successfully!"
echo ""
echo "💡 Use 'npm run dev:start' to start fresh services"
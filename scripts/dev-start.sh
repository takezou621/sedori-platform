#!/bin/bash

# Development Environment Start Script
# This script starts all services required for local development

set -e

echo "🚀 Starting Sedori Platform development environment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. You can modify it if needed."
fi

# Start services
echo "🔧 Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

services=("postgresql" "redis" "meilisearch" "minio" "api" "frontend")
for service in "${services[@]}"; do
    if docker-compose ps | grep "sedori-$service" | grep -q "healthy\|Up"; then
        echo "✅ $service is ready"
    else
        echo "⚠️  $service might not be ready yet"
    fi
done

echo ""
echo "🎉 Development environment is starting up!"
echo ""
echo "📋 Service URLs:"
echo "  Frontend: http://localhost:3001"
echo "  Backend API: http://localhost:3000"
echo "  PostgreSQL: localhost:5432"
echo "  Redis: localhost:6379"
echo "  Meilisearch: http://localhost:7700"
echo "  MinIO Console: http://localhost:9001"
echo "  MinIO API: http://localhost:9000"
echo ""
echo "💡 Use 'npm run dev:logs' to view logs"
echo "💡 Use 'npm run dev:stop' to stop services"
echo "💡 Use 'npm run dev:reset' to reset all data"
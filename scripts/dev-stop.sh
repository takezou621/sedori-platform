#!/bin/bash

# Development Environment Stop Script
# This script stops all services

set -e

echo "🛑 Stopping Sedori Platform development environment..."

# Stop services
docker-compose down

echo "✅ Development environment stopped successfully!"
echo ""
echo "💡 Data is preserved in Docker volumes"
echo "💡 Use 'npm run dev:reset' to remove all data"
echo "💡 Use 'npm run dev:start' to start services again"
#!/bin/bash

# Development Environment Logs Script
# This script shows logs from all services

set -e

echo "📋 Showing logs from all services..."
echo "💡 Press Ctrl+C to exit"
echo ""

# Follow logs from all services
docker-compose logs -f
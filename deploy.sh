#!/bin/bash

# Whole Sale ERP Server Deployment Script
# Usage: ./deploy.sh <environment> <docker_tag>
# Example: ./deploy.sh production v1.2.3

set -e

# Configuration
ENVIRONMENT=$1
DOCKER_TAG=$2
DOCKER_IMAGE="whole-sale-erp-server"

if [ -z "$ENVIRONMENT" ]; then
    ENVIRONMENT="production"
fi

if [ -z "$DOCKER_TAG" ]; then
    echo "Usage: $0 [environment] <docker_tag>"
    echo "Example: $0 production v1.2.3"
    echo "If environment not specified, defaults to production"
    exit 1
fi

# Environment-specific configuration
COMPOSE_FILE="docker-compose.production.yml"

echo "🚀 Deploying Whole Sale ERP Server to $ENVIRONMENT environment"
echo "📦 Docker Tag: $DOCKER_TAG"
echo "🐳 Docker Image: $DOCKER_IMAGE:$DOCKER_TAG"

# Check if required files exist
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found"
    exit 1
fi

# Tag the image if using a specific tag
if [ "$DOCKER_TAG" != "latest" ]; then
    echo "🏷️  Tagging image $DOCKER_IMAGE:$DOCKER_TAG as $DOCKER_IMAGE:latest..."
    docker tag $DOCKER_IMAGE:$DOCKER_TAG $DOCKER_IMAGE:latest || true
fi

# Skip pull for local images (they were just built)
echo "ℹ️  Using locally built Docker image..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f $COMPOSE_FILE down

# Start new containers
echo "▶️  Starting new containers..."
JWT_SECRET=${JWT_SECRET} \
DB_PASSWORD=${DB_PASSWORD} \
CORS_ORIGIN=${CORS_ORIGIN:-*} \
docker compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check if services are running
echo "🔍 Checking service health..."
if docker compose -f $COMPOSE_FILE ps | grep -q "Up"; then
    echo "✅ Deployment successful!"
    echo "🌐 Application should be available at:"
    echo "   Production: http://your-domain.com"
else
    echo "❌ Deployment failed! Check logs:"
    docker compose -f $COMPOSE_FILE logs
    exit 1
fi

# Clean up old images (optional)
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "🎉 Deployment completed successfully!"
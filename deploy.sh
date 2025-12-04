#!/bin/bash

# Check if VERSION is provided as environment variable
if [ -z "$VERSION" ]; then
    print_error "VERSION environment variable is required"
    echo "Usage: VERSION=v1.0.0 ./deploy.sh"
    exit 1
fi

IMAGE_NAME="tannerrhub/data-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        print_status "$1 completed successfully"
    else
        print_error "$1 failed"
        exit 1
    fi
}

print_status "Starting build and deployment for version: $VERSION"

# Build the Docker image
print_status "Building Docker image: ${IMAGE_NAME}:${VERSION}"
docker build . -t ${IMAGE_NAME}:${VERSION}
check_status "Docker build"

# Push to Docker Hub
print_status "Pushing to Docker Hub: ${IMAGE_NAME}:${VERSION}"
docker push ${IMAGE_NAME}:${VERSION}
check_status "Docker push"

# Switch to cloud-runner context
print_status "Switching to cloud-runner context"
docker context use cloud-runner
check_status "Context switch to cloud-runner"

# Pull the latest image on the remote context
print_status "Pulling image on cloud-runner: ${IMAGE_NAME}:${VERSION}"
docker pull ${IMAGE_NAME}:${VERSION}
check_status "Docker pull on cloud-runner"

# Update the service with new image
print_status "Updating service cbp_data-app with version: ${VERSION}"
docker service update cbp_data-app --image ${IMAGE_NAME}:${VERSION}
check_status "Service update"

# Switch back to default context
print_status "Switching back to default context"
docker context use default
check_status "Context switch to default"

print_status "Deployment completed successfully!"
print_status "Service updated with image: ${IMAGE_NAME}:${VERSION}"

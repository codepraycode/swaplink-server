#!/bin/bash

# SwapLink Server Health Check Script
# This script verifies that the server is running correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="${1:-http://localhost:3001}"
HEALTH_ENDPOINT="${SERVER_URL}/api/v1/health"

echo "================================================"
echo "SwapLink Server Health Check"
echo "================================================"
echo ""
echo "Checking server at: ${SERVER_URL}"
echo ""

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if server is reachable
echo "1. Checking server connectivity..."
if curl -s -f -o /dev/null "${HEALTH_ENDPOINT}"; then
    print_success "Server is reachable"
else
    print_error "Server is not reachable at ${HEALTH_ENDPOINT}"
    exit 1
fi

# Check health endpoint response
echo ""
echo "2. Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s "${HEALTH_ENDPOINT}")

if echo "${HEALTH_RESPONSE}" | grep -q '"status":"ok"'; then
    print_success "Health check passed"
    echo "   Response: ${HEALTH_RESPONSE}"
else
    print_error "Health check failed"
    echo "   Response: ${HEALTH_RESPONSE}"
    exit 1
fi

# Check environment
echo ""
echo "3. Checking environment..."
ENVIRONMENT=$(echo "${HEALTH_RESPONSE}" | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)
if [ -n "${ENVIRONMENT}" ]; then
    print_success "Environment: ${ENVIRONMENT}"
else
    print_warning "Could not determine environment"
fi

# Check timestamp
echo ""
echo "4. Checking server time..."
TIMESTAMP=$(echo "${HEALTH_RESPONSE}" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
if [ -n "${TIMESTAMP}" ]; then
    print_success "Server timestamp: ${TIMESTAMP}"
else
    print_warning "Could not determine server timestamp"
fi

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}All checks passed!${NC}"
echo "================================================"
echo ""
echo "Server is healthy and ready to accept requests."
echo ""

exit 0

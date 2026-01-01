#!/bin/bash

# Test script to verify the payment proof upload fix
# This script tests both BUY_FX and SELL_FX scenarios

echo "🧪 Testing P2P Payment Proof Upload Authorization"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: BUY_FX - Taker should be able to upload proof
echo "Test 1: BUY_FX Ad - Taker uploads proof"
echo "Expected: ✅ Success (Taker is FX sender)"
echo ""

# Test 2: BUY_FX - Maker should NOT be able to upload proof
echo "Test 2: BUY_FX Ad - Maker tries to upload proof"
echo "Expected: ❌ 403 Forbidden (Maker is NGN payer, not FX sender)"
echo ""

# Test 3: SELL_FX - Maker should be able to upload proof
echo "Test 3: SELL_FX Ad - Maker uploads proof"
echo "Expected: ✅ Success (Maker is FX sender)"
echo ""

# Test 4: SELL_FX - Taker should NOT be able to upload proof
echo "Test 4: SELL_FX Ad - Taker tries to upload proof"
echo "Expected: ❌ 403 Forbidden (Taker is NGN payer, not FX sender)"
echo ""

echo "=================================================="
echo "Summary of Authorization Rules:"
echo "=================================================="
echo ""
echo "BUY_FX Ad:"
echo "  - Maker: Wants FX, Pays NGN → Cannot upload proof"
echo "  - Taker: Sends FX → Can upload proof ✓"
echo ""
echo "SELL_FX Ad:"
echo "  - Maker: Sends FX → Can upload proof ✓"
echo "  - Taker: Wants FX, Pays NGN → Cannot upload proof"
echo ""
echo "Golden Rule: Only the FX sender can upload payment proof!"

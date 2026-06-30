#!/bin/bash
set -e

echo "=== InvoiceChain Contract Deployment ==="
echo ""

# Build the contract
echo "[1/3] Building contract..."
stellar contract build
echo "Build successful."
echo ""

# Deploy to testnet
echo "[2/3] Deploying to Stellar Testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/invoice_registry.wasm \
  --network testnet \
  --source deployer)
echo "Contract deployed: $CONTRACT_ID"
echo ""

# Initialize the contract
echo "[3/3] Initializing contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network testnet \
  --source deployer \
  -- \
  initialize \
  --admin deployer
echo "Contract initialized."
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Add these to your .env files:"
echo "  SOROBAN_CONTRACT_ID=$CONTRACT_ID      (backend/.env)"
echo "  VITE_SOROBAN_CONTRACT_ID=$CONTRACT_ID  (frontend/.env)"
echo ""
echo "Before first deploy, generate a deployer key:"
echo "  stellar keys generate deployer --network testnet --fund"

#!/bin/bash

# NOIZYLAB AI Agent Deployment Script
# This script deploys the AI agent configuration for the NOIZYLAB email system

set -e  # Exit on error

echo "=========================================="
echo "NOIZYLAB AI Agent Deployment"
echo "=========================================="
echo ""

# Check if agent.yml exists
if [ ! -f "agent.yml" ]; then
    echo "Error: agent.yml not found in current directory"
    echo "Please ensure you're running this script from the AI-Tools directory"
    exit 1
fi

echo "✓ Found agent.yml configuration file"

# Validate YAML syntax (basic check)
if ! grep -q "name:" agent.yml; then
    echo "Error: agent.yml appears to be invalid (missing 'name' field)"
    exit 1
fi

echo "✓ Agent configuration validated"

# Create necessary directories
echo ""
echo "Creating required directories..."
mkdir -p templates
mkdir -p config
mkdir -p logs

echo "✓ Directories created"

# Check for Node.js
echo ""
echo "Checking system requirements..."
if ! command -v node &> /dev/null; then
    echo "Warning: Node.js is not installed"
    echo "Please install Node.js to use this agent"
    echo "Visit: https://nodejs.org/"
else
    NODE_VERSION=$(node --version)
    echo "✓ Node.js detected: $NODE_VERSION"
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "Warning: npm is not installed"
else
    NPM_VERSION=$(npm --version)
    echo "✓ npm detected: $NPM_VERSION"
fi

# Create a sample .env file if it doesn't exist
if [ ! -f "config/.env.example" ]; then
    echo ""
    echo "Creating example environment configuration..."
    cat > config/.env.example << 'EOF'
# NOIZYLAB Email System Configuration
# Copy this file to .env and update with your actual values

# SMTP Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=your_password_here

# Server Configuration
SERVER_PORT=3000
SERVER_HOST=0.0.0.0

# Logging
LOG_LEVEL=info
EOF
    echo "✓ Created config/.env.example"
fi

# Create a README for the agent
if [ ! -f "README.md" ]; then
    echo ""
    echo "Creating agent documentation..."
    cat > README.md << 'EOF'
# NOIZYLAB AI Agent

This directory contains the AI agent configuration and deployment tools for the NOIZYLAB email system.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp config/.env.example config/.env
   ```

2. Update `config/.env` with your SMTP credentials

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the agent:
   ```bash
   npm start
   ```

## Configuration

The agent is configured via `agent.yml`. See this file for available settings and capabilities.

## Requirements

- Node.js (v14 or higher)
- npm (v6 or higher)

## Support

For issues or questions, refer to the main NOIZYLAB documentation.
EOF
    echo "✓ Created README.md"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review and customize agent.yml as needed"
echo "2. Copy config/.env.example to config/.env"
echo "3. Update config/.env with your SMTP credentials"
echo "4. Install dependencies: npm install"
echo "5. Start your application"
echo ""
echo "The agent is now ready to use!"

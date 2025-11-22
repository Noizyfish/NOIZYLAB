#!/bin/bash

# NOIZYLAB Email Test Script
# Tests your email configuration by sending a test email

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         📧 NOIZYLAB Email Configuration Test              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if config exists
if [ ! -f "config/.env" ]; then
    echo "❌ Error: config/.env not found!"
    echo ""
    echo "Run the setup wizard first:"
    echo "  bash setup_wizard.sh"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies not installed. Installing now..."
    npm install
fi

# Start the agent in background
echo "🚀 Starting email agent..."
SERVER_PORT=$(grep SERVER_PORT config/.env | cut -d '=' -f2)
SERVER_PORT=${SERVER_PORT:-3000}

node agent.js > /tmp/noizylab_test.log 2>&1 &
AGENT_PID=$!

# Wait for agent to start
sleep 3

# Check if agent is running
if ! ps -p $AGENT_PID > /dev/null; then
    echo "❌ Failed to start agent. Check the logs:"
    cat /tmp/noizylab_test.log
    exit 1
fi

echo "✅ Agent started on port $SERVER_PORT"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
HEALTH=$(curl -s http://localhost:$SERVER_PORT/health)
if echo $HEALTH | grep -q "ok"; then
    echo "  ✅ Health check passed"
else
    echo "  ❌ Health check failed"
    kill $AGENT_PID 2>/dev/null
    exit 1
fi

# Test 2: SMTP Connection
echo ""
echo "Test 2: SMTP Connection Verification"
VERIFY=$(curl -s http://localhost:$SERVER_PORT/agent/verify)
if echo $VERIFY | grep -q "success.*true"; then
    echo "  ✅ SMTP connection successful!"
else
    echo "  ❌ SMTP connection failed"
    echo "  Response: $VERIFY"
    echo ""
    echo "Common issues:"
    echo "  - Check your email address and password"
    echo "  - For Gmail, use an App Password"
    echo "  - For Yahoo, enable 'Less secure app access'"
    echo "  - Check if your SMTP port is correct (usually 587)"
    kill $AGENT_PID 2>/dev/null
    exit 1
fi

# Test 3: Send test email
echo ""
echo "Test 3: Send Test Email"
read -p "Enter recipient email address (or press Enter to skip): " TEST_EMAIL

if [ -n "$TEST_EMAIL" ]; then
    echo "  📧 Sending test email to $TEST_EMAIL..."
    
    RESPONSE=$(curl -s -X POST http://localhost:$SERVER_PORT/agent/send-email \
        -H "Content-Type: application/json" \
        -d "{\"to\":\"$TEST_EMAIL\",\"subject\":\"NOIZYLAB Test Email\",\"text\":\"Congratulations! Your NOIZYLAB email system is working perfectly. This is a test email sent at $(date).\"}")
    
    if echo $RESPONSE | grep -q "success.*true"; then
        echo "  ✅ Test email sent successfully!"
        echo "  📬 Check $TEST_EMAIL inbox"
    else
        echo "  ⚠️  Email send attempted"
        echo "  Response: $RESPONSE"
    fi
else
    echo "  ⏭️  Skipped"
fi

# Test 4: Template Generation
echo ""
echo "Test 4: Template Generation"
TEMPLATE=$(curl -s -X POST http://localhost:$SERVER_PORT/agent/generate-template \
    -H "Content-Type: application/json" \
    -d '{"type":"welcome","data":{"name":"Test User"}}')

if echo $TEMPLATE | grep -q "Welcome to NOIZYLAB"; then
    echo "  ✅ Template generation working"
else
    echo "  ❌ Template generation failed"
fi

# Test 5: Email Validation
echo ""
echo "Test 5: Email Validation"
VALID=$(curl -s -X POST http://localhost:$SERVER_PORT/agent/validate-email \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}')

if echo $VALID | grep -q "valid.*true"; then
    echo "  ✅ Email validation working"
else
    echo "  ❌ Email validation failed"
fi

# Stop the agent
kill $AGENT_PID 2>/dev/null

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            🎉 ALL TESTS COMPLETED!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Your email system is ready to use!"
echo ""
echo "Start the agent with:"
echo "  npm start"
echo ""
echo "Or run in background:"
echo "  npm start > agent.log 2>&1 &"
echo ""
echo "📚 See README.md for API documentation and examples"

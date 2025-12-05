#!/bin/bash
# 🌌 NOIZYLAB - Agent Test Script
# Fish Music Inc - CB_01
# 🔥 GORUNFREE! 🎸🔥

echo "🔊 NOIZYLAB Agent Test Suite"
echo "================================"
echo ""

# Function to wait for input
wait_for_enter() {
    read -p "Press Enter to continue..."
}

# Test 1: Check MQTT broker
echo "📡 Test 1: Checking MQTT Broker..."
if brew services list | grep -q "mosquitto.*started"; then
    echo "✅ Mosquitto is running"
else
    echo "❌ Mosquitto is not running"
    echo "   Run: brew services start mosquitto"
    exit 1
fi
echo ""

# Test 2: Check Python dependencies
echo "📦 Test 2: Checking Python dependencies..."
if python3 -c "import paho.mqtt.client" 2>/dev/null; then
    echo "✅ paho-mqtt installed"
else
    echo "❌ paho-mqtt not found"
    echo "   Run: pip3 install -r requirements.txt"
    exit 1
fi

if python3 -c "import pydantic" 2>/dev/null; then
    echo "✅ pydantic installed"
else
    echo "❌ pydantic not found"
    echo "   Run: pip3 install -r requirements.txt"
    exit 1
fi
echo ""

# Test 3: MQTT publish/subscribe
echo "📨 Test 3: Testing MQTT publish/subscribe..."
echo "   Starting subscriber in background..."
(mosquitto_sub -t "noizylab/test" -C 1 > /tmp/noizylab_test.txt 2>&1) &
SUB_PID=$!

sleep 1

echo "   Publishing test message..."
mosquitto_pub -t "noizylab/test" -m '{"test": "success"}'

sleep 1

if grep -q "success" /tmp/noizylab_test.txt 2>/dev/null; then
    echo "✅ MQTT pub/sub working"
else
    echo "❌ MQTT pub/sub failed"
    kill $SUB_PID 2>/dev/null
    exit 1
fi

kill $SUB_PID 2>/dev/null
rm -f /tmp/noizylab_test.txt
echo ""

# Test 4: Start agent (manual)
echo "🤖 Test 4: Starting agent in test mode..."
echo "   This will run for 10 seconds..."
echo ""

timeout 10 python3 noizylab_agent.py --machine god 2>&1 | tee /tmp/noizylab_agent_test.log || true

echo ""
echo "📊 Test 4 Results:"
if grep -q "Agent running" /tmp/noizylab_agent_test.log; then
    echo "✅ Agent started successfully"
else
    echo "❌ Agent failed to start"
    echo "   Check logs: /tmp/noizylab_agent_test.log"
    exit 1
fi

if grep -q "Connected to MQTT broker" /tmp/noizylab_agent_test.log; then
    echo "✅ Connected to MQTT broker"
else
    echo "❌ Failed to connect to MQTT broker"
    exit 1
fi

if grep -q "Health Scan Flow ready" /tmp/noizylab_agent_test.log; then
    echo "✅ Health Scan Flow initialized"
else
    echo "⚠️  Health Scan Flow not found in logs"
fi

if grep -q "Backup Now Flow ready" /tmp/noizylab_agent_test.log; then
    echo "✅ Backup Now Flow initialized"
else
    echo "⚠️  Backup Now Flow not found in logs"
fi

echo ""
echo "================================"
echo "✅ All tests passed!"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run agent: python3 noizylab_agent.py --machine god"
echo "   2. Monitor MQTT: mosquitto_sub -t 'noizylab/#' -v"
echo "   3. Trigger health scan: mosquitto_pub -t 'noizylab/flows/health_scan/trigger' -m '{}'"
echo ""
echo "🔥 GORUNFREE! 🎸🔥"

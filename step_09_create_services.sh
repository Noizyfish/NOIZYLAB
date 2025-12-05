#!/bin/bash
# Step 9: Create System Services

echo "[9/10] Creating system services..."

# Create global command
echo "       📝 Creating 'noizy-start' command..."

cat > /tmp/noizy-start << 'EOF'
#!/bin/bash
# 🔥 NOIZY.AI - Master Startup Script

echo "🔥 Starting Noizy.AI..."

# Start backend (background)
cd ~/NOIZYLAB/NOIZY_AI/backend/core
npm run dev > /tmp/noizy-backend.log 2>&1 &
echo "   ✅ Backend started (port 5000)"

# Start Python brain (background)
cd ~/NOIZYLAB/NOIZY_AI/backend/brain
python3 app.py > /tmp/noizy-brain.log 2>&1 &
echo "   ✅ Brain started (port 5001)"

# Start frontend (background)
cd ~/NOIZYLAB/NOIZY_AI/frontend
npm run dev > /tmp/noizy-frontend.log 2>&1 &
echo "   ✅ Frontend started (port 3000)"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              🔥 NOIZY.AI IS ONLINE! 🔥                        ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Frontend:  http://localhost:3000                             ║"
echo "║  Backend:   http://localhost:5000                             ║"
echo "║  AI Brain:  http://localhost:5001                             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🔥 GORUNFREE! 🎸🔥"
EOF

chmod +x /tmp/noizy-start
sudo mv /tmp/noizy-start /usr/local/bin/noizy-start

echo "       ✅ Created 'noizy-start' command"
echo "       ℹ️  You can now run: noizy-start"

echo ""

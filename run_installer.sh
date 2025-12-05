#!/bin/bash
# 🪄 NOIZY.AI - SUPER INSTALLER (macOS/Linux)
# Fish Music Inc - CB_01
# ONE COMMAND TO INSTALL EVERYTHING
# 🔥 GORUNFREE! 🎸🔥

clear

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║        🔥 NOIZY.AI SUPER INSTALLER (macOS) 🔥                 ║"
echo "║                                                               ║"
echo "║          The Unorthodox AI Installation Wizard               ║"
echo "║               Fish Music Inc - CB_01                          ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "This will install:"
echo "  • Node.js + TypeScript backend"
echo "  • Python FastAPI brain"
echo "  • 25 NoizyGeniuses"
echo "  • Miracle Engine (Omega Core)"
echo "  • React frontend"
echo "  • System services"
echo ""
read -p "Ready to proceed? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled"
    exit 1
fi

echo ""
echo "🚀 Starting installation..."
echo ""

# Make all step scripts executable
chmod +x ./steps/*.sh

# Run installation steps
./steps/step_01_detect_os.sh || exit 1
./steps/step_02_install_node.sh || exit 1
./steps/step_03_install_python.sh || exit 1
./steps/step_04_setup_backend.sh || exit 1
./steps/step_05_setup_python_brain.sh || exit 1
./steps/step_06_setup_geniuses.sh || exit 1
./steps/step_07_setup_omega.sh || exit 1
./steps/step_08_setup_frontend.sh || exit 1
./steps/step_09_create_services.sh || exit 1
./steps/step_10_final_check.sh || exit 1

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              ✅ INSTALLATION COMPLETE! ✅                      ║"
echo "║                                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  🚀 Launch Noizy.AI:                                          ║"
echo "║                                                               ║"
echo "║     noizy-start                                               ║"
echo "║                                                               ║"
echo "║  Or manually:                                                 ║"
echo "║     cd backend/core && npm run dev                            ║"
echo "║     cd backend/brain && python3 app.py                        ║"
echo "║     cd frontend && npm run dev                                ║"
echo "║                                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  Access at:                                                   ║"
echo "║  • Frontend:  http://localhost:3000                           ║"
echo "║  • Backend:   http://localhost:5000                           ║"
echo "║  • AI Brain:  http://localhost:5001                           ║"
echo "║                                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║              🔥 GORUNFREE! 🎸🔥                                ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

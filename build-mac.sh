#!/bin/bash
# ═══════════════════════════════════════════════════════
#  Professor Somleng TTS — macOS Build Script
#  
#  Run this script on your Mac to build the .dmg and .zip
#  Prerequisites: Node.js 18+, npm
#
#  Usage:
#    chmod +x build-mac.sh
#    ./build-mac.sh
# ═══════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════"
echo "  Professor Somleng TTS — macOS Build"
echo "═══════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from: https://nodejs.org/"
  exit 1
fi

echo "📦 Node.js: $(node -v)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📥 Installing dependencies..."
  npm install
  echo ""
fi

# Run the unified build script with --mac flag
echo "🚀 Running build for macOS..."
node electron/build.js --mac

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ macOS Build Complete!"
echo "═══════════════════════════════════════"
echo ""
echo "📁 Output files in dist/:"
ls -lh dist/*.dmg dist/*.zip 2>/dev/null || echo "  (No DMG/ZIP files found — check dist/ folder)"
echo ""
echo "💡 To install on Mac:"
echo "   1. Open the .dmg file"
echo "   2. Drag 'Professor Somleng TTS' to Applications"
echo "   3. Launch from Applications or Spotlight"
echo ""
echo "💡 VoxCPM2 Setup (optional, for offline Khmer TTS):"
echo "   Install VoxCPM2 to: ~/Software/VoxCPM2AI/"
echo "   The app will auto-detect and start it."
echo ""
echo "💡 OmniVoice Setup (optional, for multilingual presets):"
echo "   Install to: ~/Software/OmniVoice/"
echo "   Run: omnivoice-server --port 8880"

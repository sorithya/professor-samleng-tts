/**
 * Build script for Samleng TTS Electron app.
 *
 * Steps:
 * 1. Build Next.js in standalone mode
 * 2. Copy static assets and public files into the standalone app directory
 * 3. Package with electron-builder for the target platform
 *
 * Usage:
 *   node electron/build.js            — Build for current platform (auto-detect)
 *   node electron/build.js --win      — Build for Windows (nsis + portable)
 *   node electron/build.js --mac      — Build for macOS (dmg + zip)
 *   node electron/build.js --linux    — Build for Linux (AppImage + deb)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT, 'public');

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Find server.js in standalone dir (Next.js 16 nests it deeply).
 */
function findServerJs(dir, depth = 0) {
  if (depth > 10) return null;
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === 'server.js') {
      const sibling = path.join(dir, '.next');
      const pkgSibling = path.join(dir, 'package.json');
      if (fs.existsSync(sibling) || fs.existsSync(pkgSibling)) {
        return dir;
      }
    }
    if (entry.isDirectory()) {
      const result = findServerJs(fullPath, depth + 1);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Determine the target platform flag for electron-builder.
 */
function getTargetPlatform() {
  const args = process.argv.slice(2);

  // Explicit flag takes priority
  if (args.includes('--win'))   return { flag: '--win --x64', label: 'Windows (x64)' };
  if (args.includes('--mac'))   return { flag: '--mac --arm64 --x64', label: 'macOS (arm64 + x64)' };
  if (args.includes('--linux')) return { flag: '--linux --x64', label: 'Linux (x64)' };

  // Auto-detect from current OS
  switch (process.platform) {
    case 'darwin':  return { flag: '--mac --arm64 --x64', label: 'macOS (arm64 + x64)' };
    case 'win32':   return { flag: '--win --x64', label: 'Windows (x64)' };
    case 'linux':   return { flag: '--linux --x64', label: 'Linux (x64)' };
    default:
      console.error(`❌ Unsupported platform: ${process.platform}`);
      process.exit(1);
  }
}

const platform = getTargetPlatform();

console.log('═══════════════════════════════════════');
console.log('  Samleng TTS — Electron Build');
console.log('═══════════════════════════════════════');
console.log(`  Target: ${platform.label}`);
console.log('');

// Step 1: Build Next.js
console.log('📦 Step 1: Building Next.js (standalone)...');
run('npx next build');

// Step 2: Find and copy static files into the standalone app directory
console.log('\n📁 Step 2: Copying static assets...');

const appDir = findServerJs(STANDALONE);
if (!appDir) {
  console.error('❌ Could not find server.js in standalone output!');
  process.exit(1);
}

console.log(`  Found app directory: ${appDir}`);

// Copy .next/static
const staticDest = path.join(appDir, '.next', 'static');
if (fs.existsSync(STATIC_SRC)) {
  copyDir(STATIC_SRC, staticDest);
  console.log(`  ✓ Copied .next/static`);
}

// Copy public/
const publicDest = path.join(appDir, 'public');
if (fs.existsSync(PUBLIC_SRC)) {
  copyDir(PUBLIC_SRC, publicDest);
  console.log(`  ✓ Copied public/`);
}

// Copy .env
const envSrc = path.join(ROOT, '.env');
const envDest = path.join(appDir, '.env');
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log(`  ✓ Copied .env`);
}

// Step 3: Package with electron-builder
console.log('\n🔨 Step 3: Packaging with electron-builder...');
run(`npx electron-builder ${platform.flag} -c.npmRebuild=false --publish never`);

console.log('\n✅ Build complete! Check the dist/ folder for the output.');


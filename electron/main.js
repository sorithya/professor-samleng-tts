/**
 * Professor Somleng TTS — Electron Main Process
 *
 * Launches the Next.js standalone server and opens a BrowserWindow.
 * Optionally auto-starts VoxCPM2 if found at the configured path.
 */

const { app, BrowserWindow, shell, Tray, Menu, dialog, ipcMain } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

// --- Configuration ---
const NEXT_PORT = 3456;
const VOXCPM2_PORT = 8808;
const APP_TITLE = 'Professor Somleng TTS';

// Cross-platform detection
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isWin = process.platform === 'win32';
const homeDir = require('os').homedir();

// --- VoxCPM2 Config File ---
const CONFIG_DIR = path.join(homeDir, '.professor-somleng-tts');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const VOXCPM2_LOG_FILE = path.join(CONFIG_DIR, 'voxcpm2.log');
const OMNIVOICE_LOG_FILE = path.join(CONFIG_DIR, 'omnivoice.log');
const FISHSPEECH_LOG_FILE = path.join(CONFIG_DIR, 'fishspeech.log');
const FISHSPEECH_PORT = 8080;
const FISHSPEECH_DIR = isWin
  ? 'C:\\Software\\FishSpeech'
  : path.join(homeDir, 'Software', 'FishSpeech');

function getLogStream(logFilePath) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    return fs.createWriteStream(logFilePath, { flags: 'w' });
  } catch (e) {
    console.error(`[Somleng] Failed to create log stream for ${logFilePath}:`, e);
    return null;
  }
}

function killProcessTree(proc) {
  if (!proc || proc.killed) return;
  const pid = proc.pid;
  console.log(`[Somleng] Terminating process tree for PID ${pid}`);
  if (isWin) {
    try {
      execSync(`taskkill /F /T /PID ${pid}`);
    } catch (e) {
      console.warn(`[Somleng] taskkill failed for PID ${pid}:`, e.message);
    }
  } else {
    try { proc.kill('SIGTERM'); } catch {}
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[Config] Failed to save:', e);
  }
}

/**
 * Auto-detect VoxCPM2 installation by checking common locations.
 * Returns the first valid path found, or null.
 */
function autoDetectVoxCPM2() {
  const candidates = isWin
    ? [
        'C:\\Clone Voice\\VoxCPM2AI',
        'C:\\Software\\VoxCPM2AI',
        'D:\\Software\\VoxCPM2AI',
        'D:\\VoxCPM2AI',
        'C:\\VoxCPM2AI',
        path.join(homeDir, 'VoxCPM2AI'),
        path.join(homeDir, 'Desktop', 'VoxCPM2AI'),
        path.join(homeDir, 'Documents', 'VoxCPM2AI'),
      ]
    : [
        path.join(homeDir, 'Software', 'VoxCPM2AI'),
        path.join(homeDir, 'VoxCPM2AI'),
        '/opt/VoxCPM2AI',
      ];

  for (const dir of candidates) {
    if (isValidVoxCPM2Dir(dir)) {
      console.log(`[VoxCPM2] Auto-detected at: ${dir}`);
      return dir;
    }
  }
  return null;
}

/**
 * Validate a VoxCPM2 directory — checks multiple structures:
 * 1. Standard: dir/VoxCPM/app_light.py (or app.py)
 * 2. User selected VoxCPM itself: dir/app_light.py (resolve parent)
 * 3. Has VoxCPM2Model with model files
 */
function isValidVoxCPM2Dir(dir) {
  if (!dir || !fs.existsSync(dir)) return false;

  // Standard structure: dir/VoxCPM/app_light.py
  const appLight = path.join(dir, 'VoxCPM', 'app_light.py');
  const appPy = path.join(dir, 'VoxCPM', 'app.py');
  if (fs.existsSync(appLight) || fs.existsSync(appPy)) return true;

  // Has model directory with actual model files
  const modelDir = path.join(dir, 'VoxCPM2Model');
  if (fs.existsSync(modelDir)) {
    const modelFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.safetensors') || f.endsWith('.pth'));
    if (modelFiles.length > 0) return true;
  }

  // Has venv
  const venvWin = path.join(dir, 'voxcpm_env', 'Scripts', 'python.exe');
  const venvUnix = path.join(dir, 'voxcpm_env', 'bin', 'python');
  const venvFallbackWin = path.join(dir, '.venv', 'Scripts', 'python.exe');
  const venvFallbackUnix = path.join(dir, '.venv', 'bin', 'python');
  if (fs.existsSync(venvWin) || fs.existsSync(venvUnix) || fs.existsSync(venvFallbackWin) || fs.existsSync(venvFallbackUnix)) return true;

  return false;
}

/**
 * Resolve the correct VoxCPM2 root directory from a user-selected path.
 * Handles cases where user selected:
 * - The root VoxCPM2AI folder ✓
 * - The VoxCPM subfolder (go up one level)
 * - The VoxCPM2Model subfolder (go up one level)
 * - A parent folder containing VoxCPM2AI (go one level deeper)
 */
function resolveVoxCPM2Root(selectedPath) {
  if (!selectedPath || !fs.existsSync(selectedPath)) return null;
  if (isValidVoxCPM2Dir(selectedPath)) return selectedPath;

  if (path.basename(selectedPath) === 'voxcpm_env' || path.basename(selectedPath) === '.venv') {
    const parent = path.dirname(selectedPath);
    if (isValidVoxCPM2Dir(parent)) return parent;
  }

  // Check if user selected VoxCPM directory itself (has app_light.py directly)
  const appLight = path.join(selectedPath, 'app_light.py');
  const appPy = path.join(selectedPath, 'app.py');
  if (fs.existsSync(appLight) || fs.existsSync(appPy)) {
    const parent = path.dirname(selectedPath);
    if (isValidVoxCPM2Dir(parent)) return parent;
    // The selected folder IS the VoxCPM dir, parent is root
    return parent;
  }

  // Check if user selected VoxCPM2Model directory
  const modelFiles = fs.existsSync(selectedPath)
    ? fs.readdirSync(selectedPath).filter(f => f.endsWith('.safetensors') || f.endsWith('.pth'))
    : [];
  if (modelFiles.length > 0) {
    const parent = path.dirname(selectedPath);
    if (isValidVoxCPM2Dir(parent)) return parent;
  }

  // Check subdirectories one level deep (user selected parent folder)
  try {
    const entries = fs.readdirSync(selectedPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(selectedPath, entry.name);
        if (isValidVoxCPM2Dir(subDir)) return subDir;
      }
    }
  } catch { /* permission error */ }

  return null;
}

/**
 * Get the current VoxCPM2 directory — from config, or auto-detect.
 */
function getVoxCPM2Dir() {
  const config = loadConfig();
  if (config.voxcpm2Path) {
    const resolved = resolveVoxCPM2Root(config.voxcpm2Path);
    if (resolved) return resolved;
  }
  // Auto-detect
  const detected = autoDetectVoxCPM2();
  if (detected) {
    config.voxcpm2Path = detected;
    saveConfig(config);
  }
  return detected;
}

function getVoxCPM2Paths(voxDir) {
  if (!voxDir) return { venv: null, script: null, modelDir: null };
  
  const venvWin = path.join(voxDir, 'voxcpm_env', 'Scripts', 'python.exe');
  const venvUnix = path.join(voxDir, 'voxcpm_env', 'bin', 'python');
  const venvFallbackWin = path.join(voxDir, '.venv', 'Scripts', 'python.exe');
  const venvFallbackUnix = path.join(voxDir, '.venv', 'bin', 'python');
  
  let venv = null;
  if (fs.existsSync(venvWin)) venv = venvWin;
  else if (fs.existsSync(venvUnix)) venv = venvUnix;
  else if (fs.existsSync(venvFallbackWin)) venv = venvFallbackWin;
  else if (fs.existsSync(venvFallbackUnix)) venv = venvFallbackUnix;

  const appLight = path.join(voxDir, 'VoxCPM', 'app_light.py');
  const appPy = path.join(voxDir, 'VoxCPM', 'app.py');
  const script = fs.existsSync(appLight) ? appLight : appPy;
  const modelDir = path.join(voxDir, 'VoxCPM2Model');
  return { venv, script, modelDir };
}

// OmniVoice paths
const OMNIVOICE_PORT = 8880;
const OMNIVOICE_DIR = isWin
  ? 'C:\\Software\\OmniVoice'
  : path.join(homeDir, 'Software', 'OmniVoice');

const OMNIVOICE_SERVER = isWin
  ? path.join(OMNIVOICE_DIR, 'omnivoice_env', 'Scripts', 'omnivoice-server.exe')
  : path.join(OMNIVOICE_DIR, 'omnivoice_env', 'bin', 'omnivoice-server');

let mainWindow = null;
let tray = null;
let nextProcess = null;
let voxcpmProcess = null;
let omnivoiceProcess = null;
let fishspeechProcess = null;
let isQuitting = false;

// --- Helpers ---

function getAppRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'nextapp');
  }
  return path.join(__dirname, '..');
}

/**
 * Find server.js in the standalone directory.
 * Next.js 16 mirrors the full project path inside standalone/.
 */
function findServerJs() {
  const standalone = path.join(getAppRoot(), '.next', 'standalone');
  if (!fs.existsSync(standalone)) return null;

  // Try root-level server.js first
  const rootServer = path.join(standalone, 'server.js');
  if (fs.existsSync(rootServer)) return { serverJs: rootServer, cwd: standalone };

  // Next.js 16: search recursively for server.js (not in node_modules)
  function findRecursive(dir, depth = 0) {
    if (depth > 10) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === 'server.js') {
        // Verify it's the Next.js server (check for .next dir sibling)
        const sibling = path.join(dir, '.next');
        const pkgSibling = path.join(dir, 'package.json');
        if (fs.existsSync(sibling) || fs.existsSync(pkgSibling)) {
          return { serverJs: fullPath, cwd: dir };
        }
      }
      if (entry.isDirectory()) {
        const result = findRecursive(fullPath, depth + 1);
        if (result) return result;
      }
    }
    return null;
  }

  return findRecursive(standalone);
}

function waitForServer(port, timeout = 90000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Server on port ${port} did not start within ${timeout}ms`));
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(check, 500);
      });
    };
    check();
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// --- Start Next.js Server ---

async function startNextServer() {
  if (await isPortInUse(NEXT_PORT)) {
    console.log(`[Somleng] Next.js already running on port ${NEXT_PORT}`);
    return;
  }

  const serverInfo = findServerJs();

  if (!serverInfo) {
    dialog.showErrorBox('Server Not Found',
      `Could not find the Next.js standalone server.\n\nPlease rebuild with: npm run electron:build`);
    app.quit();
    return;
  }

  console.log(`[Somleng] Starting Next.js: ${serverInfo.serverJs}`);
  console.log(`[Somleng] CWD: ${serverInfo.cwd}`);

  // Copy static + public into the cwd if not already there
  const appRoot = getAppRoot();
  const staticSrc = path.join(appRoot, '.next', 'static');
  const staticDest = path.join(serverInfo.cwd, '.next', 'static');
  if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
    copyDirSync(staticSrc, staticDest);
    console.log('[Somleng] Copied .next/static');
  }
  const publicSrc = path.join(appRoot, 'public');
  const publicDest = path.join(serverInfo.cwd, 'public');
  if (fs.existsSync(publicSrc) && !fs.existsSync(publicDest)) {
    copyDirSync(publicSrc, publicDest);
    console.log('[Somleng] Copied public/');
  }

  const config = loadConfig();
  const voxcpm2Url = config.voxcpm2Mode === 'remote'
    ? (config.voxcpm2Url || 'http://localhost:8808')
    : `http://localhost:${VOXCPM2_PORT}`;

  const omnivoiceUrl = config.omnivoiceMode === 'remote'
    ? (config.omnivoiceUrl || 'http://localhost:8880')
    : `http://localhost:${OMNIVOICE_PORT}`;

  const fishspeechUrl = config.fishspeechMode === 'remote'
    ? (config.fishspeechUrl || 'http://localhost:8080')
    : `http://localhost:${FISHSPEECH_PORT}`;

  const env = {
    ...process.env,
    PORT: String(NEXT_PORT),
    HOSTNAME: 'localhost',
    NODE_ENV: 'production',
    TTS_PROVIDER: 'voxcpm2',
    VOXCPM2_API_URL: voxcpm2Url,
    OMNIVOICE_API_URL: omnivoiceUrl,
    FISHSPEECH_API_URL: fishspeechUrl,
    MAX_CHARS_PER_REQUEST_FREE: '50000',
    NEXT_PUBLIC_MAX_CHARS: '50000',
    ELECTRON_RUN_AS_NODE: '1',
  };

  nextProcess = spawn(process.execPath, [serverInfo.serverJs], {
    cwd: serverInfo.cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`[Next.js ERR] ${data.toString().trim()}`);
  });

  nextProcess.on('close', (code) => {
    console.log(`[Next.js] Process exited with code ${code}`);
    if (!isQuitting) {
      setTimeout(() => startNextServer(), 2000);
    }
  });

  await waitForServer(NEXT_PORT);
  console.log(`[Somleng] Next.js server ready on port ${NEXT_PORT}`);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

// --- Start VoxCPM2 Server (optional) ---

async function startVoxCPM2() {
  const config = loadConfig();
  if (config.voxcpm2Mode === 'remote') {
    console.log('[Somleng] VoxCPM2 in remote (online) mode, skipping local auto-start');
    return;
  }

  if (await isPortInUse(VOXCPM2_PORT)) {
    console.log(`[Somleng] VoxCPM2 already running on port ${VOXCPM2_PORT}`);
    return;
  }

  const voxDir = getVoxCPM2Dir();
  if (!voxDir) {
    console.log('[Somleng] VoxCPM2 not found, skipping auto-start');
    return;
  }

  const { venv, script, modelDir } = getVoxCPM2Paths(voxDir);
  if (!venv || !script || !fs.existsSync(venv) || !fs.existsSync(script)) {
    console.log('[Somleng] VoxCPM2 venv or script not found, skipping');
    return;
  }

  console.log(`[Somleng] Starting VoxCPM2 from: ${voxDir}`);

  const args = [script, '--port', String(VOXCPM2_PORT)];
  if (modelDir && fs.existsSync(modelDir)) {
    // Convert paths to forward slashes for Python script compatibility
    args.push('--model-id', modelDir.replace(/\\/g, '/'));
  }

  const logStream = getLogStream(VOXCPM2_LOG_FILE);

  voxcpmProcess = spawn(venv, args, {
    cwd: path.join(voxDir, 'VoxCPM'),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  voxcpmProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[VoxCPM2] ${text.trim()}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] STDOUT: ${text}`);
  });

  voxcpmProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`[VoxCPM2] ${text.trim()}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] STDERR: ${text}`);
  });

  voxcpmProcess.on('close', (code) => {
    console.log(`[VoxCPM2] Process exited with code ${code}`);
    if (logStream) {
      logStream.write(`[${new Date().toISOString()}] Process exited with code ${code}\n`);
      logStream.end();
    }
  });
}

// --- OmniVoice Path Helpers ---

function isValidOmniVoiceDir(dir) {
  if (!dir || !fs.existsSync(dir)) return false;

  const serverWin = path.join(dir, 'omnivoice_env', 'Scripts', 'omnivoice-server.exe');
  const serverUnix = path.join(dir, 'omnivoice_env', 'bin', 'omnivoice-server');
  const venvServerWin = path.join(dir, '.venv', 'Scripts', 'omnivoice-server.exe');
  const venvServerUnix = path.join(dir, '.venv', 'bin', 'omnivoice-server');
  if (fs.existsSync(serverWin) || fs.existsSync(serverUnix) || fs.existsSync(venvServerWin) || fs.existsSync(venvServerUnix)) return true;

  const rootServerWin = path.join(dir, 'omnivoice-server.exe');
  const rootServerUnix = path.join(dir, 'omnivoice-server');
  if (fs.existsSync(rootServerWin) || fs.existsSync(rootServerUnix)) return true;

  return false;
}

function resolveOmniVoiceRoot(selectedPath) {
  if (!selectedPath || !fs.existsSync(selectedPath)) return null;
  if (isValidOmniVoiceDir(selectedPath)) return selectedPath;

  if (path.basename(selectedPath) === 'omnivoice_env' || path.basename(selectedPath) === '.venv') {
    const parent = path.dirname(selectedPath);
    if (isValidOmniVoiceDir(parent)) return parent;
  }

  try {
    const entries = fs.readdirSync(selectedPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(selectedPath, entry.name);
        if (isValidOmniVoiceDir(subDir)) return subDir;
      }
    }
  } catch { /* ignore */ }

  return null;
}

function getOmniVoiceDir() {
  const config = loadConfig();
  if (config.omnivoicePath) {
    const resolved = resolveOmniVoiceRoot(config.omnivoicePath);
    if (resolved) return resolved;
  }

  const candidates = isWin
    ? [
        'C:\\Clone Voice\\OmniVoice',
        'C:\\Software\\OmniVoice',
        'D:\\Software\\OmniVoice',
        'D:\\OmniVoice',
        'C:\\OmniVoice',
        path.join(homeDir, 'OmniVoice'),
      ]
    : [
        path.join(homeDir, 'Software', 'OmniVoice'),
        path.join(homeDir, 'OmniVoice'),
      ];

  for (const dir of candidates) {
    if (isValidOmniVoiceDir(dir)) {
      config.omnivoicePath = dir;
      saveConfig(config);
      console.log(`[OmniVoice] Auto-detected at: ${dir}`);
      return dir;
    }
  }
  return null;
}

// --- Start OmniVoice Server (optional) ---

async function startOmniVoice() {
  const config = loadConfig();
  if (config.omnivoiceMode === 'remote') {
    console.log('[Somleng] OmniVoice in remote (online) mode, skipping local auto-start');
    return;
  }

  if (await isPortInUse(OMNIVOICE_PORT)) {
    console.log(`[Somleng] OmniVoice already running on port ${OMNIVOICE_PORT}`);
    return;
  }

  const omniDir = getOmniVoiceDir();
  if (!omniDir) {
    console.log('[Somleng] OmniVoice not found, skipping auto-start');
    return;
  }

  // Resolve python executable in venv
  const pythonWin = path.join(omniDir, 'omnivoice_env', 'Scripts', 'python.exe');
  const pythonUnix = path.join(omniDir, 'omnivoice_env', 'bin', 'python');
  const venvPythonWin = path.join(omniDir, '.venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(omniDir, '.venv', 'bin', 'python');

  let pythonPath = null;
  if (fs.existsSync(pythonWin)) pythonPath = pythonWin;
  else if (fs.existsSync(pythonUnix)) pythonPath = pythonUnix;
  else if (fs.existsSync(venvPythonWin)) pythonPath = venvPythonWin;
  else if (fs.existsSync(venvPythonUnix)) pythonPath = venvPythonUnix;

  let spawnCmd = null;
  let spawnArgs = [];

  if (pythonPath) {
    spawnCmd = pythonPath;
    spawnArgs = ['-m', 'omnivoice_server', '--port', String(OMNIVOICE_PORT)];
  } else {
    // Fallback to executable wrapper directly if no python interpreter found in venv
    const rootServerWin = path.join(omniDir, 'omnivoice-server.exe');
    const rootServerUnix = path.join(omniDir, 'omnivoice-server');
    const serverWin = path.join(omniDir, 'omnivoice_env', 'Scripts', 'omnivoice-server.exe');
    const serverUnix = path.join(omniDir, 'omnivoice_env', 'bin', 'omnivoice-server');
    const venvServerWin = path.join(omniDir, '.venv', 'Scripts', 'omnivoice-server.exe');
    const venvServerUnix = path.join(omniDir, '.venv', 'bin', 'omnivoice-server');

    if (fs.existsSync(serverWin)) spawnCmd = serverWin;
    else if (fs.existsSync(serverUnix)) spawnCmd = serverUnix;
    else if (fs.existsSync(venvServerWin)) spawnCmd = venvServerWin;
    else if (fs.existsSync(venvServerUnix)) spawnCmd = venvServerUnix;
    else if (fs.existsSync(rootServerWin)) spawnCmd = rootServerWin;
    else if (fs.existsSync(rootServerUnix)) spawnCmd = rootServerUnix;

    spawnArgs = ['--port', String(OMNIVOICE_PORT)];
  }

  if (!spawnCmd) {
    console.log('[Somleng] OmniVoice python interpreter or server executable not found, skipping');
    return;
  }

  console.log(`[Somleng] Starting OmniVoice server on port ${OMNIVOICE_PORT} from: ${omniDir} using ${spawnCmd} ${spawnArgs.join(' ')}`);

  const logStream = getLogStream(OMNIVOICE_LOG_FILE);

  omnivoiceProcess = spawn(spawnCmd, spawnArgs, {
    cwd: omniDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  omnivoiceProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[OmniVoice] ${text.trim()}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] STDOUT: ${text}`);
  });

  omnivoiceProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`[OmniVoice] ${text.trim()}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] STDERR: ${text}`);
  });

  omnivoiceProcess.on('close', (code) => {
    console.log(`[OmniVoice] Process exited with code ${code}`);
    if (logStream) {
      logStream.write(`[${new Date().toISOString()}] Process exited with code ${code}\n`);
      logStream.end();
    }
  });
}

// --- Fish Speech Path Helpers ---

function isValidFishSpeechDir(dir) {
  if (!dir || !fs.existsSync(dir)) return false;

  const apiScript = path.join(dir, 'tools', 'api_server.py');
  const fallbackScript = path.join(dir, 'api_server.py');
  if (!fs.existsSync(apiScript) && !fs.existsSync(fallbackScript)) return false;

  const pythonWin = path.join(dir, 'fish_speech_env', 'Scripts', 'python.exe');
  const pythonUnix = path.join(dir, 'fish_speech_env', 'bin', 'python');
  const venvWin = path.join(dir, '.venv', 'Scripts', 'python.exe');
  const venvUnix = path.join(dir, '.venv', 'bin', 'python');
  if (fs.existsSync(pythonWin) || fs.existsSync(pythonUnix) || fs.existsSync(venvWin) || fs.existsSync(venvUnix)) return true;

  return false;
}

function resolveFishSpeechRoot(selectedPath) {
  if (!selectedPath || !fs.existsSync(selectedPath)) return null;
  if (isValidFishSpeechDir(selectedPath)) return selectedPath;

  if (path.basename(selectedPath) === 'fish_speech_env' || path.basename(selectedPath) === '.venv' || path.basename(selectedPath) === 'tools') {
    const parent = path.dirname(selectedPath);
    if (isValidFishSpeechDir(parent)) return parent;
  }

  try {
    const entries = fs.readdirSync(selectedPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(selectedPath, entry.name);
        if (isValidFishSpeechDir(subDir)) return subDir;
      }
    }
  } catch { /* ignore */ }

  return null;
}

function getFishSpeechDir() {
  const config = loadConfig();
  if (config.fishspeechPath) {
    const resolved = resolveFishSpeechRoot(config.fishspeechPath);
    if (resolved) return resolved;
  }

  const candidates = isWin
    ? [
        'C:\\Clone Voice\\fish-speech',
        'C:\\Software\\fish-speech',
        'D:\\Software\\fish-speech',
        'D:\\fish-speech',
        'C:\\fish-speech',
        path.join(homeDir, 'fish-speech'),
      ]
    : [
        path.join(homeDir, 'Software', 'fish-speech'),
        path.join(homeDir, 'fish-speech'),
      ];

  for (const dir of candidates) {
    if (isValidFishSpeechDir(dir)) {
      config.fishspeechPath = dir;
      saveConfig(config);
      console.log(`[Fish Speech] Auto-detected at: ${dir}`);
      return dir;
    }
  }
  return null;
}

// --- Start Fish Speech Server (optional) ---

async function startFishSpeech() {
  const config = loadConfig();
  if (config.fishspeechMode === 'remote') {
    console.log('[Somleng] Fish Speech in remote (online) mode, skipping local auto-start');
    return;
  }

  if (await isPortInUse(FISHSPEECH_PORT)) {
    console.log(`[Somleng] Fish Speech already running on port ${FISHSPEECH_PORT}`);
    return;
  }

  const fishDir = getFishSpeechDir();
  if (!fishDir) {
    console.log('[Somleng] Fish Speech folder not configured or not found, skipping');
    return;
  }

  const pythonWin = path.join(fishDir, 'fish_speech_env', 'Scripts', 'python.exe');
  const pythonUnix = path.join(fishDir, 'fish_speech_env', 'bin', 'python');
  const venvWin = path.join(fishDir, '.venv', 'Scripts', 'python.exe');
  const venvUnix = path.join(fishDir, '.venv', 'bin', 'python');

  let venvPython = null;
  if (fs.existsSync(pythonWin)) venvPython = pythonWin;
  else if (fs.existsSync(pythonUnix)) venvPython = pythonUnix;
  else if (fs.existsSync(venvWin)) venvPython = venvWin;
  else if (fs.existsSync(venvUnix)) venvPython = venvUnix;

  const apiScript = path.join(fishDir, 'tools', 'api_server.py');
  const fallbackScript = path.join(fishDir, 'api_server.py');
  const runScript = fs.existsSync(apiScript) ? apiScript : fallbackScript;

  if (!venvPython || !fs.existsSync(venvPython) || !fs.existsSync(runScript)) {
    console.log('[Somleng] Fish Speech python or api script not found, skipping');
    return;
  }

  console.log(`[Somleng] Starting Fish Speech server on port ${FISHSPEECH_PORT} from: ${fishDir}`);

  const logStream = getLogStream(FISHSPEECH_LOG_FILE);

  // Command arguments: tools/api_server.py --listen 127.0.0.1:8080
  const args = [runScript, '--listen', `127.0.0.1:${FISHSPEECH_PORT}`];

  fishspeechProcess = spawn(venvPython, args, {
    cwd: fishDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  fishspeechProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[Fish Speech] ${text.trim()}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] STDOUT: ${text}`);
  });

  fishspeechProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`[Fish Speech] ${text.trim()}`);
    if (logStream) logStream.write(`[${new Date().toISOString()}] STDERR: ${text}`);
  });

  fishspeechProcess.on('close', (code) => {
    console.log(`[Fish Speech] Process exited with code ${code}`);
    if (logStream) {
      logStream.write(`[${new Date().toISOString()}] Process exited with code ${code}\n`);
      logStream.end();
    }
  });
}

// --- IPC Handlers for Show in Folder ---

const DOWNLOADS_DIR = path.join(require('os').homedir(), 'Downloads', 'Professor_Somleng_TTS');

// Keep a counter file for sequential naming
function getNextFileNumber() {
  const counterFile = path.join(DOWNLOADS_DIR, '.counter');
  let counter = 1;
  try {
    if (fs.existsSync(counterFile)) {
      counter = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) + 1;
    }
  } catch { counter = 1; }
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }
  fs.writeFileSync(counterFile, String(counter));
  return counter;
}

ipcMain.handle('show-item-in-folder', async (_event, filePath) => {
  // Special sentinel: open the output folder itself
  if (filePath === '__OPEN_OUTPUT_FOLDER__') {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }
    shell.openPath(DOWNLOADS_DIR);
    return true;
  }
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('save-file-and-reveal', async (_event, fileName, base64Data) => {
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }

    const num = getNextFileNumber();
    const padded = String(num).padStart(7, '0');
    const ext = fileName.endsWith('.mp3') ? '.mp3' : '.wav';
    const finalName = `Professor_Somleng-tts-${padded}${ext}`;
    const filePath = path.join(DOWNLOADS_DIR, finalName);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    shell.showItemInFolder(filePath);
    return { success: true, path: filePath, name: finalName };
  } catch (err) {
    console.error('[Show in Folder] Error:', err);
    return { success: false, error: err.message };
  }
});

// --- VoxCPM2 Config IPC Handlers ---

ipcMain.handle('browse-voxcpm2', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select VoxCPM2 Folder',
    properties: ['openDirectory'],
    message: 'Select the folder containing VoxCPM2 (VoxCPM2AI, or any folder with VoxCPM2Model)',
  });

  if (result.canceled || !result.filePaths[0]) {
    return { success: false, message: 'Cancelled' };
  }

  const selectedPath = result.filePaths[0];

  // Smart resolve — works no matter which subfolder user selects
  const resolvedPath = resolveVoxCPM2Root(selectedPath);
  if (!resolvedPath) {
    // List what we found to help debug
    let contents = [];
    try {
      contents = fs.readdirSync(selectedPath).slice(0, 10);
    } catch { /* */ }
    return {
      success: false,
      message: `Could not find VoxCPM2 in "${path.basename(selectedPath)}". Expected folders: VoxCPM, VoxCPM2Model, voxcpm_env/.venv. Found: ${contents.join(', ')}`,
    };
  }

  // Save to config
  const config = loadConfig();
  config.voxcpm2Path = resolvedPath;
  saveConfig(config);

  console.log(`[VoxCPM2] Path set to: ${resolvedPath}`);

  // Auto-start if not running
  if (!(await isPortInUse(VOXCPM2_PORT))) {
    startVoxCPM2();
  }

  return { success: true, path: selectedPath };
});

function isUrlReachable(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(urlStr);
      const httpModule = parsedUrl.protocol === 'https:' ? require('https') : require('http');
      
      const req = httpModule.get(urlStr, (res) => {
        res.resume();
        resolve(true);
      });
      
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function restartNextServer() {
  if (nextProcess && !nextProcess.killed) {
    console.log('[Somleng] Restarting Next.js server due to config change...');
    nextProcess.kill();
  }
}

ipcMain.handle('get-voxcpm2-config', async () => {
  const config = loadConfig();
  const voxDir = getVoxCPM2Dir();
  const { venv, script, modelDir } = getVoxCPM2Paths(voxDir);
  
  const isRemote = config.voxcpm2Mode === 'remote';
  const remoteUrl = config.voxcpm2Url || 'http://localhost:8808';
  
  let running = false;
  if (isRemote) {
    running = await isUrlReachable(remoteUrl);
  } else {
    running = await isPortInUse(VOXCPM2_PORT);
  }

  return {
    path: voxDir || null,
    found: !!voxDir,
    venvExists: venv ? fs.existsSync(venv) : false,
    scriptExists: script ? fs.existsSync(script) : false,
    modelExists: modelDir ? fs.existsSync(modelDir) : false,
    running,
    port: VOXCPM2_PORT,
    mode: config.voxcpm2Mode || 'local',
    url: remoteUrl,
    processAlive: !!(voxcpmProcess && !voxcpmProcess.killed),
  };
});

ipcMain.handle('save-voxcpm2-config', async (_event, updates) => {
  const config = loadConfig();
  const merged = { ...config, ...updates };
  saveConfig(merged);
  
  console.log('[VoxCPM2 Config] Updated:', updates);
  
  // Apply processes changes
  if (merged.voxcpm2Mode === 'remote') {
    if (voxcpmProcess) {
      console.log('[VoxCPM2] Stopping local server since remote mode is enabled');
      killProcessTree(voxcpmProcess);
      voxcpmProcess = null;
    }
  } else {
    // Mode is local, try starting if port not in use
    if (!(await isPortInUse(VOXCPM2_PORT))) {
      startVoxCPM2();
    }
  }
  
  // Restart Next.js server to propagate new env variable VOXCPM2_API_URL
  await restartNextServer();

  return { success: true };
});

ipcMain.handle('start-voxcpm2', async () => {
  if (await isPortInUse(VOXCPM2_PORT)) {
    return { success: true, message: 'Already running' };
  }
  try {
    await startVoxCPM2();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('stop-voxcpm2', async () => {
  if (voxcpmProcess) {
    killProcessTree(voxcpmProcess);
    voxcpmProcess = null;
    return { success: true };
  }
  return { success: false, message: 'Not running' };
});

// --- OmniVoice Config IPC Handlers ---

ipcMain.handle('browse-omnivoice', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select OmniVoice Folder',
    properties: ['openDirectory'],
    message: 'Select the folder containing OmniVoice (with omnivoice_env or .venv)',
  });

  if (result.canceled || !result.filePaths[0]) {
    return { success: false, message: 'Cancelled' };
  }

  const selectedPath = result.filePaths[0];
  const resolvedPath = resolveOmniVoiceRoot(selectedPath);
  if (!resolvedPath) {
    let contents = [];
    try {
      contents = fs.readdirSync(selectedPath).slice(0, 10);
    } catch { /* */ }
    return {
      success: false,
      message: `Could not find OmniVoice in "${path.basename(selectedPath)}". Expected to find omnivoice_env/.venv or omnivoice-server. Found: ${contents.join(', ')}`,
    };
  }

  // Save to config
  const config = loadConfig();
  config.omnivoicePath = resolvedPath;
  saveConfig(config);

  console.log(`[OmniVoice] Path set to: ${resolvedPath}`);

  // Auto-start if not running
  if (!(await isPortInUse(OMNIVOICE_PORT))) {
    startOmniVoice();
  }

  return { success: true, path: selectedPath };
});

ipcMain.handle('get-omnivoice-config', async () => {
  const config = loadConfig();
  const omniDir = getOmniVoiceDir();
  
  const serverWin = omniDir ? path.join(omniDir, 'omnivoice_env', 'Scripts', 'omnivoice-server.exe') : null;
  const serverUnix = omniDir ? path.join(omniDir, 'omnivoice_env', 'bin', 'omnivoice-server') : null;
  const venvServerWin = omniDir ? path.join(omniDir, '.venv', 'Scripts', 'omnivoice-server.exe') : null;
  const venvServerUnix = omniDir ? path.join(omniDir, '.venv', 'bin', 'omnivoice-server') : null;
  const rootServerWin = omniDir ? path.join(omniDir, 'omnivoice-server.exe') : null;
  const rootServerUnix = omniDir ? path.join(omniDir, 'omnivoice-server') : null;

  const pythonWin = omniDir ? path.join(omniDir, 'omnivoice_env', 'Scripts', 'python.exe') : null;
  const pythonUnix = omniDir ? path.join(omniDir, 'omnivoice_env', 'bin', 'python') : null;
  const venvPythonWin = omniDir ? path.join(omniDir, '.venv', 'Scripts', 'python.exe') : null;
  const venvPythonUnix = omniDir ? path.join(omniDir, '.venv', 'bin', 'python') : null;

  const pythonExists = !!((pythonWin && fs.existsSync(pythonWin)) ||
                          (pythonUnix && fs.existsSync(pythonUnix)) ||
                          (venvPythonWin && fs.existsSync(venvPythonWin)) ||
                          (venvPythonUnix && fs.existsSync(venvPythonUnix)));

  const serverExists = pythonExists ||
                       !!((serverWin && fs.existsSync(serverWin)) || 
                         (serverUnix && fs.existsSync(serverUnix)) ||
                         (venvServerWin && fs.existsSync(venvServerWin)) ||
                         (venvServerUnix && fs.existsSync(venvServerUnix)) ||
                         (rootServerWin && fs.existsSync(rootServerWin)) ||
                         (rootServerUnix && fs.existsSync(rootServerUnix)));

  const isRemote = config.omnivoiceMode === 'remote';
  const remoteUrl = config.omnivoiceUrl || 'http://localhost:8880';

  let running = false;
  if (isRemote) {
    running = await isUrlReachable(remoteUrl);
  } else {
    running = await isPortInUse(OMNIVOICE_PORT);
  }

  return {
    path: omniDir || null,
    found: !!omniDir,
    serverExists,
    running,
    port: OMNIVOICE_PORT,
    mode: config.omnivoiceMode || 'local',
    url: remoteUrl,
    processAlive: !!(omnivoiceProcess && !omnivoiceProcess.killed),
  };
});

ipcMain.handle('save-omnivoice-config', async (_event, updates) => {
  const config = loadConfig();
  const merged = { ...config, ...updates };
  saveConfig(merged);
  
  console.log('[OmniVoice Config] Updated:', updates);
  
  // Apply processes changes
  if (merged.omnivoiceMode === 'remote') {
    if (omnivoiceProcess) {
      console.log('[OmniVoice] Stopping local server since remote mode is enabled');
      killProcessTree(omnivoiceProcess);
      omnivoiceProcess = null;
    }
  } else {
    // Mode is local, try starting if port not in use
    if (!(await isPortInUse(OMNIVOICE_PORT))) {
      startOmniVoice();
    }
  }
  
  // Restart Next.js server to propagate new env variable OMNIVOICE_API_URL
  await restartNextServer();

  return { success: true };
});

ipcMain.handle('start-omnivoice', async () => {
  if (await isPortInUse(OMNIVOICE_PORT)) {
    return { success: true, message: 'Already running' };
  }
  try {
    await startOmniVoice();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('stop-omnivoice', async () => {
  if (omnivoiceProcess) {
    killProcessTree(omnivoiceProcess);
    omnivoiceProcess = null;
    return { success: true };
  }
  return { success: false, message: 'Not running' };
});

// --- Fish Speech Config IPC Handlers ---

ipcMain.handle('browse-fishspeech', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Fish Speech Folder',
    properties: ['openDirectory'],
    message: 'Select the folder containing Fish Speech (with fish_speech_env or .venv)',
  });

  if (result.canceled || !result.filePaths[0]) {
    return { success: false, message: 'Cancelled' };
  }

  const selectedPath = result.filePaths[0];
  const resolvedPath = resolveFishSpeechRoot(selectedPath);
  if (!resolvedPath) {
    let contents = [];
    try {
      contents = fs.readdirSync(selectedPath).slice(0, 10);
    } catch { /* */ }
    return {
      success: false,
      message: `Could not find Fish Speech in "${path.basename(selectedPath)}". Expected to find fish_speech_env/.venv and tools/api_server.py. Found: ${contents.join(', ')}`,
    };
  }

  // Save to config
  const config = loadConfig();
  config.fishspeechPath = resolvedPath;
  saveConfig(config);

  console.log(`[Fish Speech] Path set to: ${resolvedPath}`);

  // Auto-start if not running
  if (!(await isPortInUse(FISHSPEECH_PORT))) {
    startFishSpeech();
  }

  return { success: true, path: selectedPath };
});

ipcMain.handle('get-fishspeech-config', async () => {
  const config = loadConfig();
  const fishDir = getFishSpeechDir();
  
  const pythonWin = fishDir ? path.join(fishDir, 'fish_speech_env', 'Scripts', 'python.exe') : null;
  const pythonUnix = fishDir ? path.join(fishDir, 'fish_speech_env', 'bin', 'python') : null;
  const venvWin = fishDir ? path.join(fishDir, '.venv', 'Scripts', 'python.exe') : null;
  const venvUnix = fishDir ? path.join(fishDir, '.venv', 'bin', 'python') : null;
  const venvExists = !!(
    (pythonWin && fs.existsSync(pythonWin)) || 
    (pythonUnix && fs.existsSync(pythonUnix)) ||
    (venvWin && fs.existsSync(venvWin)) ||
    (venvUnix && fs.existsSync(venvUnix))
  );

  const apiScript = fishDir ? path.join(fishDir, 'tools', 'api_server.py') : null;
  const fallbackScript = fishDir ? path.join(fishDir, 'api_server.py') : null;
  const scriptExists = !!((apiScript && fs.existsSync(apiScript)) || (fallbackScript && fs.existsSync(fallbackScript)));

  const isRemote = config.fishspeechMode === 'remote';
  const remoteUrl = config.fishspeechUrl || 'http://localhost:8080';

  let running = false;
  if (isRemote) {
    running = await isUrlReachable(remoteUrl);
  } else {
    running = await isPortInUse(FISHSPEECH_PORT);
  }

  return {
    path: fishDir || null,
    found: !!fishDir,
    venvExists,
    scriptExists,
    running,
    port: FISHSPEECH_PORT,
    mode: config.fishspeechMode || 'local',
    url: remoteUrl,
    processAlive: !!(fishspeechProcess && !fishspeechProcess.killed),
  };
});

ipcMain.handle('save-fishspeech-config', async (_event, updates) => {
  const config = loadConfig();
  const merged = { ...config, ...updates };
  saveConfig(merged);
  
  console.log('[Fish Speech Config] Updated:', updates);
  
  // Apply processes changes
  if (merged.fishspeechMode === 'remote') {
    if (fishspeechProcess) {
      console.log('[Fish Speech] Stopping local server since remote mode is enabled');
      killProcessTree(fishspeechProcess);
      fishspeechProcess = null;
    }
  } else {
    // Mode is local, try starting if port not in use
    if (!(await isPortInUse(FISHSPEECH_PORT))) {
      startFishSpeech();
    }
  }
  
  // Restart Next.js server to propagate new env variable FISHSPEECH_API_URL
  await restartNextServer();

  return { success: true };
});

ipcMain.handle('start-fishspeech', async () => {
  if (await isPortInUse(FISHSPEECH_PORT)) {
    return { success: true, message: 'Already running' };
  }
  try {
    await startFishSpeech();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('stop-fishspeech', async () => {
  if (fishspeechProcess) {
    killProcessTree(fishspeechProcess);
    fishspeechProcess = null;
    return { success: true };
  }
  return { success: false, message: 'Not running' };
});

// --- Create Window ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: APP_TITLE,
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0a0a0f',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Show loading screen
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getLoadingHTML())}`);
  mainWindow.show();

  // Load actual app
  mainWindow.loadURL(`http://localhost:${NEXT_PORT}/en/studio`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes(`localhost:${NEXT_PORT}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- System Tray ---

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  if (!fs.existsSync(iconPath)) return;

  try {
    const { nativeImage } = require('electron');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
  } catch (e) {
    console.warn('[Somleng] Failed to create tray:', e);
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Professor Somleng TTS',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Open in Browser',
      click: () => shell.openExternal(`http://localhost:${NEXT_PORT}/en/studio`),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip(APP_TITLE);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// --- Loading HTML ---

function getLoadingHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(135deg, #0a0a1a 0%, #1a1040 50%, #0a0a1a 100%);
      color: white; display: flex; align-items: center; justify-content: center;
      height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
    }
    .container { text-align: center; }
    .logo { font-size: 48px; margin-bottom: 12px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px;
         background: linear-gradient(135deg, #818cf8, #c084fc);
         -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .sub { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
    .spinner {
      width: 40px; height: 40px; margin: 0 auto;
      border: 3px solid rgba(129, 140, 248, 0.2);
      border-top-color: #818cf8; border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    .status { margin-top: 16px; color: #64748b; font-size: 13px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .dots::after {
      content: ''; animation: dots 1.5s steps(4, end) infinite;
    }
    @keyframes dots {
      0% { content: ''; } 25% { content: '.'; }
      50% { content: '..'; } 75% { content: '...'; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🎙️</div>
    <h1>Professor Somleng TTS</h1>
    <p class="sub">សំឡេង TTS — Khmer Text-to-Speech</p>
    <div class="spinner"></div>
    <p class="status">Starting servers<span class="dots"></span></p>
  </div>
</body>
</html>`;
}

// --- App Lifecycle ---

app.whenReady().then(async () => {
  // Start TTS servers (both run in background, take longer to load)
  startVoxCPM2();
  startOmniVoice();
  startFishSpeech();

  // Start Next.js server
  await startNextServer();

  // Create window and tray
  createWindow();
  createTray();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  if (nextProcess && !nextProcess.killed) {
    console.log('[Somleng] Stopping Next.js...');
    killProcessTree(nextProcess);
  }
  if (voxcpmProcess && !voxcpmProcess.killed) {
    console.log('[Somleng] Stopping VoxCPM2...');
    killProcessTree(voxcpmProcess);
  }
  if (omnivoiceProcess && !omnivoiceProcess.killed) {
    console.log('[Somleng] Stopping OmniVoice...');
    killProcessTree(omnivoiceProcess);
  }
  if (fishspeechProcess && !fishspeechProcess.killed) {
    console.log('[Somleng] Stopping Fish Speech...');
    killProcessTree(fishspeechProcess);
  }
});

app.on('window-all-closed', () => {
  // On macOS, quit when all windows are closed (no tray on macOS by default)
  if (isMac) {
    app.quit();
  }
  // On Windows, minimize to tray
});

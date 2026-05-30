import { app, BrowserWindow, ipcMain, safeStorage, shell, systemPreferences } from 'electron';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { spawn, ChildProcess } from 'child_process';

// ─── State ────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = 8000;           // resolved at startup (may change if 8000 is busy)
let restartCount = 0;
let appIsQuitting = false;
const MAX_RESTARTS = 3;

const isDev = !app.isPackaged;

// ─── Free-port finder ────────────────────────────────────────────────────────

function findFreePort(preferred: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(preferred, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // preferred port is taken — let the OS pick one
      const fallback = net.createServer();
      fallback.listen(0, '127.0.0.1', () => {
        const { port } = fallback.address() as net.AddressInfo;
        fallback.close(() => resolve(port));
      });
    });
  });
}

// ─── Backend spawn + ready detection ─────────────────────────────────────────
// Returns a Promise that resolves when Uvicorn prints "Application startup
// complete." — the only reliable signal that THIS specific process is listening.
// Polling a port is unreliable because a stale instance from a previous session
// can answer the health-check before the new backend even starts.

function startBackend(timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendBin = path.join(process.resourcesPath, 'backend', 'autoqa-backend');

    // Write all backend output to a persistent log file for diagnostics
    const logPath = path.join(app.getPath('userData'), 'backend.log');
    fs.appendFileSync(logPath, `\n\n=== Launch ${new Date().toISOString()} port=${backendPort} ===\n`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    backendProcess = spawn(backendBin, [], {
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(backendPort),
        PYTHONUNBUFFERED: '1',   // flush stdout immediately — required for startup detection
        PYTHONFAULTHANDLER: '1', // print traceback on fatal signal
      },
      stdio: 'pipe',
    });

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Backend startup timed out after 30s'));
      }
    }, timeoutMs);

    backendProcess.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      logStream.write(text);

      // Uvicorn prints this line when all startup hooks have run and the
      // server is actually accepting connections.
      if (!resolved && text.includes('Application startup complete')) {
        resolved = true;
        clearTimeout(timer);
        resolve();
      }
    });

    backendProcess.stderr?.on('data', (d: Buffer) => logStream.write(d));

    backendProcess.on('exit', (code: number | null, signal: string | null) => {
      logStream.end();
      backendProcess = null;

      // If we haven't resolved yet the backend crashed during startup
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error(`Backend exited before startup: code=${code} signal=${signal}`));
      }

      if (appIsQuitting) return;
      if (restartCount >= MAX_RESTARTS) {
        console.error('[electron] Backend max restarts reached — giving up');
        return;
      }

      restartCount += 1;
      const delay = restartCount * 1000;
      console.log(`[electron] Backend restart ${restartCount}/${MAX_RESTARTS} in ${delay}ms…`);
      setTimeout(() => startBackend().catch(console.error), delay);
    });
  });
}

// ─── Window creation ──────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Show loading screen immediately while backend warms up
    mainWindow.loadFile(path.join(__dirname, '../dist/loading.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function navigateToApp() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  if (!isDev) {
    // 1. Find a free port (falls back from 8000 if busy)
    backendPort = await findFreePort(8000);
    console.log(`[electron] Using port ${backendPort} for backend`);

    // 2. Show loading screen immediately so user sees something
    createWindow();

    // 3. Spawn backend and wait for "Application startup complete." in its stdout
    try {
      await startBackend();
      console.log(`[electron] Backend ready on port ${backendPort} — loading app`);
    } catch (err) {
      console.error('[electron] Backend failed to start:', err);
      console.log('[electron] Navigating anyway — UI will surface the error');
    }

    // 4. Swap loading screen → real app
    navigateToApp();
  } else {
    // Dev: Vite serves the UI, backend is started manually
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  appIsQuitting = true;
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle('get-backend-url', () => {
  return process.env.AUTOQA_BACKEND_URL || `http://127.0.0.1:${backendPort}`;
});

// Permission checking via Electron/macOS APIs
// These check AutoQA.app's TCC status directly — accurate and instant,
// no dependency on the backend process being alive or restarted.
ipcMain.handle('check-permissions', () => {
  const screen = systemPreferences.getMediaAccessStatus('screen');
  const accessibility = systemPreferences.isTrustedAccessibilityClient(false);
  return {
    screen_recording: screen === 'granted',
    accessibility,
  };
});

// Opens System Preferences → Accessibility (prompts if not yet decided).
// isTrustedAccessibilityClient(true) triggers the macOS dialog; shell.openExternal
// is a guaranteed fallback in case the dialog doesn't auto-open.
ipcMain.handle('request-accessibility', () => {
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);
  if (!trusted) {
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
    );
  }
  return trusted;
});

// Requests Screen Recording permission via CGRequestScreenCaptureAccess() then
// opens System Preferences so the user can toggle the switch.
// Two-step because on macOS 14+, CGRequestScreenCaptureAccess() adds the app to
// the TCC list but does not always open System Preferences automatically.
ipcMain.handle('request-screen-recording', async () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const macPerms = require('node-mac-permissions');
    await macPerms.requestPermission('screen');
  } catch (e) {
    console.error('[electron] node-mac-permissions failed:', e);
  }
  // Always open System Preferences → Screen Recording.
  // If CGRequestScreenCaptureAccess() succeeded, AutoQA is now in the list.
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  );
  return systemPreferences.getMediaAccessStatus('screen') === 'granted';
});

// API key management via OS keychain (safeStorage)
const KEY_FILE = () => path.join(app.getPath('userData'), 'anthropic-key.bin');

ipcMain.handle('save-anthropic-key', (_event, key: string) => {
  if (!key) {
    const f = KEY_FILE();
    if (fs.existsSync(f)) fs.unlinkSync(f);
    return;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption is not available on this machine.');
  }
  const encrypted = safeStorage.encryptString(key);
  fs.writeFileSync(KEY_FILE(), encrypted);
});

ipcMain.handle('get-anthropic-key', () => {
  const f = KEY_FILE();
  if (!fs.existsSync(f)) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = fs.readFileSync(f);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
});

ipcMain.handle('delete-anthropic-key', () => {
  const f = KEY_FILE();
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

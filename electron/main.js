const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;
let setupProcess = null;

// セットアップ完了フラグのパス
const SETUP_FLAG = path.join(os.homedir(), '.tiktalk_setup_done');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 700,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 開発中はVite dev server、本番はビルド済みHTMLを読み込む
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function getPythonCommand() {
  if (app.isPackaged) {
    // 本番: PyInstallerでexe化したものを使用
    const exePath = path.join(process.resourcesPath, 'python', 'tiktok_reader.exe');
    return { command: exePath, args: [] };
  } else {
    // 開発: Pythonスクリプトを直接実行
    return { command: 'python', args: [path.join(__dirname, '..', 'python', 'tiktok_reader.py')] };
  }
}

function startPythonProcess(username) {
  if (pythonProcess) {
    stopPythonProcess();
  }

  const { command, args } = getPythonCommand();
  const fullArgs = [...args, username];

  pythonProcess = spawn(command, fullArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // stdoutからJSONLを読み取る
  let buffer = '';
  pythonProcess.stdout.on('data', (data) => {
    buffer += data.toString('utf-8');
    const lines = buffer.split('\n');
    // 最後の不完全な行はバッファに残す
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        mainWindow?.webContents.send('comment', msg);
      } catch {
        // JSONパース失敗は無視
      }
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    const text = data.toString('utf-8').trim();
    if (text) {
      console.error('[Python]', text);
      mainWindow?.webContents.send('status', { type: 'error', message: text });
    }
  });

  pythonProcess.on('close', (code) => {
    pythonProcess = null;
    mainWindow?.webContents.send('status', { type: 'stopped', code });
  });

  pythonProcess.on('error', (err) => {
    console.error('[Python起動エラー]', err.message);
    mainWindow?.webContents.send('status', { type: 'error', message: `Python起動失敗: ${err.message}` });
    pythonProcess = null;
  });

  mainWindow?.webContents.send('status', { type: 'started' });
}

function stopPythonProcess() {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
  mainWindow?.webContents.send('status', { type: 'stopped' });
}

// --- セットアップウィザード関連 ---

function getSetupPythonCommand(action) {
  const scriptPath = path.join(__dirname, '..', 'python', 'setup_wizard.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const args = [scriptPath];
  if (action) args.push(action);
  return { command: pythonCmd, args };
}

function runSetupWizard(action) {
  if (setupProcess) {
    setupProcess.kill();
    setupProcess = null;
  }

  const { command, args } = getSetupPythonCommand(action || 'full');
  setupProcess = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let buffer = '';
  setupProcess.stdout.on('data', (data) => {
    buffer += data.toString('utf-8');
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        mainWindow?.webContents.send('setup-progress', msg);
      } catch {
        // JSONパース失敗は無視
      }
    }
  });

  setupProcess.stderr.on('data', (data) => {
    console.error('[Setup]', data.toString('utf-8').trim());
  });

  setupProcess.on('close', () => {
    setupProcess = null;
  });
}

function checkTTS() {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: 'localhost', port: 5000, path: '/voice', method: 'HEAD', timeout: 5000 },
      (res) => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// IPC ハンドラー
ipcMain.on('start-reader', (_event, username) => {
  startPythonProcess(username);
});

ipcMain.on('stop-reader', () => {
  stopPythonProcess();
});

// セットアップ用IPC
ipcMain.on('run-setup', (_event, action) => {
  runSetupWizard(action);
});

ipcMain.handle('check-tts', async () => {
  return await checkTTS();
});

ipcMain.on('setup-done', () => {
  // メイン画面に切り替えるシグナルを送信
  mainWindow?.webContents.send('setup-completed');
});

// セットアップ済みか確認してから起動
app.whenReady().then(() => {
  createWindow();
  // セットアップ状態をRendererに通知
  mainWindow.webContents.on('did-finish-load', () => {
    const setupDone = fs.existsSync(SETUP_FLAG);
    mainWindow.webContents.send('setup-state', { setupDone });
  });
});

app.on('window-all-closed', () => {
  stopPythonProcess();
  app.quit();
});

app.on('before-quit', () => {
  stopPythonProcess();
  if (setupProcess) {
    setupProcess.kill();
    setupProcess = null;
  }
});

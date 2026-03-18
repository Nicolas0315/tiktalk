'use strict';

/**
 * TikTalk 軽量ファイルロガー
 * 外部依存ゼロ。Node.js標準モジュールのみ使用。
 * ログ保存先: %AppData%\TikTalk\logs\main.log (Windows)
 *             ~/Library/Logs/TikTalk/main.log  (macOS)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function getLogDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), 'TikTalk', 'logs');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Logs', 'TikTalk');
  } else {
    return path.join(os.homedir(), '.config', 'TikTalk', 'logs');
  }
}

const logDir = getLogDir();
const logFile = path.join(logDir, 'main.log');

// ログディレクトリを初期化
try {
  fs.mkdirSync(logDir, { recursive: true });
  // ファイルサイズチェック → 5MB超えたら古いログをリネームしてローテーション
  if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_SIZE) {
    const old = path.join(logDir, 'main.old.log');
    if (fs.existsSync(old)) fs.unlinkSync(old);
    fs.renameSync(logFile, old);
  }
} catch (_) {
  // ログ初期化失敗はサイレントに無視（アプリ動作は続ける）
}

function timestamp() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function write(level, args) {
  const msg = args.map(a =>
    (a instanceof Error) ? `${a.message}\n${a.stack}` :
    (typeof a === 'object' && a !== null) ? JSON.stringify(a) :
    String(a)
  ).join(' ');

  const line = `[${timestamp()}] [${level.padEnd(5)}] ${msg}\n`;

  // コンソール出力（開発時のみ）
  if (process.env.NODE_ENV === 'development') {
    process.stderr.write(line);
  }

  // ファイル出力
  try {
    fs.appendFileSync(logFile, line, 'utf8');
  } catch (_) {
    // ファイル書き込み失敗はサイレント無視
  }
}

const logger = {
  debug: (...args) => write('DEBUG', args),
  info:  (...args) => write('INFO',  args),
  warn:  (...args) => write('WARN',  args),
  error: (...args) => write('ERROR', args),
  getLogPath: () => logFile,
};

// uncaught例外も記録
process.on('uncaughtException', (err) => {
  logger.error('[UncaughtException]', err.message, err.stack || '');
});
process.on('unhandledRejection', (reason) => {
  logger.error('[UnhandledRejection]', reason instanceof Error ? reason.message : String(reason));
});

module.exports = logger;

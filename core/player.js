// 音声再生モジュール
// Windowsではpowershell経由、fallbackではffplayを使用

const { spawn } = require("child_process");
const fs = require("fs");

class AudioPlayer {
  constructor() {
    this._process = null;
  }

  /**
   * wavファイルを再生（完了まで待つ）
   * @param {string} wavPath
   * @returns {Promise<void>}
   */
  play(wavPath) {
    return new Promise((resolve, reject) => {
      let command;
      let args;

      if (process.platform === "win32") {
        // Windows: PowerShellでSoundPlayerを使用
        command = "powershell";
        args = [
          "-NoProfile",
          "-c",
          `(New-Object Media.SoundPlayer '${wavPath.replace(/'/g, "''")}').PlaySync()`,
        ];
      } else {
        // macOS/Linux: ffplayをfallbackとして使用
        command = "ffplay";
        args = ["-nodisp", "-autoexit", wavPath];
      }

      this._process = spawn(command, args, { stdio: "ignore" });

      this._process.on("close", () => {
        this._process = null;
        // 再生完了後にtempファイルを削除
        try {
          if (fs.existsSync(wavPath)) {
            fs.unlinkSync(wavPath);
          }
        } catch {
          // 削除失敗は無視
        }
        resolve();
      });

      this._process.on("error", (err) => {
        this._process = null;
        // tempファイルの削除を試みる
        try {
          if (fs.existsSync(wavPath)) {
            fs.unlinkSync(wavPath);
          }
        } catch {
          // 削除失敗は無視
        }
        reject(err);
      });
    });
  }

  /** 再生中のプロセスをkill */
  stop() {
    if (this._process) {
      this._process.kill();
      this._process = null;
    }
  }
}

module.exports = { AudioPlayer };

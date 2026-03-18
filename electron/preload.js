const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tiktalk', {
  // 読み上げ開始
  startReader: (username) => {
    ipcRenderer.send('start-reader', username);
  },

  // 読み上げ停止
  stopReader: () => {
    ipcRenderer.send('stop-reader');
  },

  // コメント受信コールバック
  onComment: (callback) => {
    ipcRenderer.on('comment', (_event, data) => callback(data));
  },

  // ステータス変更コールバック
  onStatus: (callback) => {
    ipcRenderer.on('status', (_event, data) => callback(data));
  },

  // --- セットアップウィザード ---

  // セットアップ実行（actionで個別ステップ指定可）
  runSetup: (action) => {
    ipcRenderer.send('run-setup', action);
  },

  // TTS疎通確認
  checkTTS: async () => {
    return await ipcRenderer.invoke('check-tts');
  },

  // セットアップ進捗コールバック
  onSetupProgress: (callback) => {
    ipcRenderer.on('setup-progress', (_event, data) => callback(data));
  },

  // セットアップ完了
  completeSetup: () => {
    ipcRenderer.send('setup-done');
  },

  // セットアップ状態通知コールバック
  onSetupState: (callback) => {
    ipcRenderer.on('setup-state', (_event, data) => callback(data));
  },

  // セットアップ完了通知コールバック
  onSetupCompleted: (callback) => {
    ipcRenderer.on('setup-completed', (_event) => callback());
  },
});

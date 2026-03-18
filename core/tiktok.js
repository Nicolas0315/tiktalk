// TikTokLive接続管理
// tiktok-live-connector を使用してTikTok LIVEのコメント・ギフト・入室イベントを取得

const { WebcastPushConnection } = require("tiktok-live-connector");
const EventEmitter = require("events");

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 5000;

class TikTokManager extends EventEmitter {
  constructor() {
    super();
    this._connection = null;
    this._connected = false;
    this._reconnectAttempts = 0;
    this._reconnectTimer = null;
    this._username = null;
  }

  /**
   * TikTok LIVEに接続
   * @param {string} username - TikTokユーザー名（@付きでもOK）
   */
  async connect(username) {
    // @を除去して正規化
    this._username = username.replace(/^@/, "");
    this._reconnectAttempts = 0;

    await this._doConnect();
  }

  async _doConnect() {
    try {
      if (this._connection) {
        this._connection.disconnect();
      }

      this._connection = new WebcastPushConnection(this._username);

      // チャットイベント
      this._connection.on("chat", (data) => {
        this.emit("comment", {
          userId: data.userId || data.uniqueId,
          username: data.nickname || data.uniqueId,
          text: data.comment,
          timestamp: Date.now(),
          type: "chat",
        });
      });

      // ギフトイベント
      this._connection.on("gift", (data) => {
        this.emit("comment", {
          userId: data.userId || data.uniqueId,
          username: data.nickname || data.uniqueId,
          text: `${data.giftName || "ギフト"}を送ってくれた！`,
          timestamp: Date.now(),
          type: "gift",
        });
      });

      // メンバー入室イベント
      this._connection.on("member", (data) => {
        const name = data.nickname || data.uniqueId;
        this.emit("comment", {
          userId: data.userId || data.uniqueId,
          username: name,
          text: `${name}さんが来た！`,
          timestamp: Date.now(),
          type: "member",
        });
      });

      // 接続成功
      this._connection.on("connected", () => {
        this._connected = true;
        this._reconnectAttempts = 0;
        this.emit("connected");
      });

      // 切断
      this._connection.on("disconnected", () => {
        this._connected = false;
        this.emit("disconnected");
        this._tryReconnect();
      });

      // エラー
      this._connection.on("error", (err) => {
        this.emit("error", err);
      });

      await this._connection.connect();
    } catch (err) {
      this._connected = false;
      this.emit("error", err);
      this._tryReconnect();
    }
  }

  _tryReconnect() {
    if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.emit("error", new Error("再接続の最大回数に達しました"));
      return;
    }

    this._reconnectAttempts++;
    this._reconnectTimer = setTimeout(() => {
      this._doConnect();
    }, RECONNECT_DELAY_MS);
  }

  /** 接続を切断 */
  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // 再接続を防止

    if (this._connection) {
      try {
        this._connection.disconnect();
      } catch {
        // 切断エラーは無視
      }
      this._connection = null;
    }
    this._connected = false;
  }

  /**
   * 接続中かどうか
   * @returns {boolean}
   */
  isConnected() {
    return this._connected;
  }
}

module.exports = { TikTokManager };

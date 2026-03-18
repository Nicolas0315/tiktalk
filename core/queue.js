// コメント優先度キュー管理
// 読み上げ順序と優先度を制御する

/** 優先度定義 */
const Priority = {
  GIFT: 10,
  FIRST_COMMENT: 8,
  NORMAL: 5,
  REPEAT_USER: 2,
};

const MAX_QUEUE_SIZE = 10;
const EXPIRE_MS = 60_000;

class CommentQueue {
  constructor() {
    this._queue = []; // { comment, priority, addedAt }
    this._speaking = false;
    this._onReadyCallback = null;
  }

  /**
   * コメントを優先度付きでキューに追加
   * @param {object} comment
   * @param {number} priority
   */
  add(comment, priority = Priority.NORMAL) {
    try {
      this._purgeExpired();

      const entry = { comment, priority, addedAt: Date.now() };
      this._queue.push(entry);

      // 優先度降順でソート
      this._queue.sort((a, b) => b.priority - a.priority);

      // 最大件数を超えたら末尾（低優先度）を捨てる
      while (this._queue.length > MAX_QUEUE_SIZE) {
        this._queue.pop();
      }

      // 空→1件になったときcallback
      if (this._queue.length === 1 && this._onReadyCallback) {
        this._onReadyCallback();
      }
    } catch (e) {
      console.error("CommentQueue.add error:", e);
    }
  }

  /**
   * 次に読み上げるコメントを取得
   * @returns {object|null}
   */
  next() {
    if (this._speaking) return null;

    this._purgeExpired();

    if (this._queue.length === 0) return null;

    const entry = this._queue.shift();
    return entry.comment;
  }

  /**
   * 読み上げ中フラグを設定
   * @param {boolean} bool
   */
  setSpeaking(bool) {
    this._speaking = bool;
  }

  /**
   * 読み上げ中かどうか
   * @returns {boolean}
   */
  isSpeaking() {
    return this._speaking;
  }

  /** キューを空にする */
  clear() {
    this._queue = [];
  }

  /**
   * 現在のキューサイズ
   * @returns {number}
   */
  size() {
    this._purgeExpired();
    return this._queue.length;
  }

  /**
   * キューが空→1件になったときのコールバック登録
   * @param {Function} callback
   */
  onReady(callback) {
    this._onReadyCallback = callback;
  }

  /** 期限切れエントリを削除 */
  _purgeExpired() {
    const now = Date.now();
    this._queue = this._queue.filter(
      (entry) => now - entry.addedAt < EXPIRE_MS
    );
  }
}

module.exports = { CommentQueue, Priority };

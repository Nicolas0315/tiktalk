// コメントフィルタリング層
// 不要なコメントを除外する

// 絵文字判定用の正規表現
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

const URL_REGEX = /^https?:\/\/\S+$/i;

class CommentFilter {
  /**
   * @param {string[]} ngWords - NGワードリスト
   */
  constructor(ngWords = []) {
    this.ngWords = ngWords.map((w) => w.toLowerCase());
    // userId → { lastText, lastTime }
    this.userHistory = new Map();
  }

  /**
   * コメントをフィルタすべきか判定
   * @param {{ userId: string, username: string, text: string, timestamp: number }} comment
   * @returns {boolean} true = 除外する
   */
  shouldFilter(comment) {
    try {
      const { userId, text, timestamp } = comment;
      const trimmed = (text ?? "").trim();

      // 1. テキストが空 or 絵文字のみ
      if (!trimmed || trimmed.replace(EMOJI_REGEX, "").trim() === "") {
        return true;
      }

      // 2. URLのみ
      if (URL_REGEX.test(trimmed)) {
        return true;
      }

      // 3. 3文字未満 かつ 同一ユーザーが30秒以内に既にコメント済み
      if (trimmed.length < 3 && this.userHistory.has(userId)) {
        const prev = this.userHistory.get(userId);
        if (timestamp - prev.lastTime < 30_000) {
          return true;
        }
      }

      // 4. NGワードリストに一致（部分一致）
      const lower = trimmed.toLowerCase();
      if (this.ngWords.some((ng) => lower.includes(ng))) {
        return true;
      }

      // 5. 同一ユーザーが10秒以内に同じテキストを送信（重複）
      if (this.userHistory.has(userId)) {
        const prev = this.userHistory.get(userId);
        if (prev.lastText === trimmed && timestamp - prev.lastTime < 10_000) {
          return true;
        }
      }

      // 6. 絵文字率が80%超
      const emojis = trimmed.match(EMOJI_REGEX);
      if (emojis) {
        const emojiCount = emojis.length;
        const totalChars = [...trimmed].length;
        if (totalChars > 0 && emojiCount / totalChars > 0.8) {
          return true;
        }
      }

      // 履歴更新
      this.userHistory.set(userId, { lastText: trimmed, lastTime: timestamp });

      return false;
    } catch (e) {
      console.error("CommentFilter.shouldFilter error:", e);
      return false;
    }
  }

  /**
   * NGワードリスト更新
   * @param {string[]} words
   */
  updateNgWords(words) {
    this.ngWords = words.map((w) => w.toLowerCase());
  }

  /** 履歴リセット */
  clearHistory() {
    this.userHistory.clear();
  }
}

module.exports = { CommentFilter };

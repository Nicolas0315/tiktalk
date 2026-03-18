// コメント整形エンジン
// 読み上げ用にテキストを変換する

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

const URL_REGEX = /https?:\/\/\S+/gi;

// 全角換算の文字数カウント（半角=0.5、全角=1）
function zenCount(str) {
  let count = 0;
  for (const ch of str) {
    count += ch.charCodeAt(0) > 0xff ? 1 : 0.5;
  }
  return count;
}

// 全角換算で先頭n文字を切り出す
function zenSlice(str, maxZen) {
  let count = 0;
  let i = 0;
  const chars = [...str];
  while (i < chars.length) {
    const w = chars[i].charCodeAt(0) > 0xff ? 1 : 0.5;
    if (count + w > maxZen) break;
    count += w;
    i++;
  }
  return chars.slice(0, i).join("");
}

export class CommentFormatter {
  /**
   * @param {Record<string, string>} userDict - { userId: "よみがな" }
   */
  constructor(userDict = {}) {
    this.userDict = { ...userDict };
  }

  /**
   * コメントを読み上げ用テキストに整形
   * @param {{ userId: string, username: string, text: string }} comment
   * @returns {string}
   */
  format(comment) {
    try {
      const { userId, username, text } = comment;
      let result = text ?? "";

      // 1. URL → "URL省略"
      result = result.replace(URL_REGEX, "URL省略");

      // 2. 絵文字を除去
      result = result.replace(EMOJI_REGEX, "");

      // 3. "www" "wwww"... → "わら"
      result = result.replace(/w{3,}/gi, "わら");

      // 4. "草"が3文字以上連続 → "大草原"
      result = result.replace(/草{3,}/g, "大草原");

      // 5. 同じ文字の4連打以上を2文字に圧縮
      result = result.replace(/(.)(\1{3,})/g, "$1$1");

      // 6. 英字のみの羅列（5文字以上）→ "英語コメント"
      result = result.replace(/[a-zA-Z]{5,}/g, "英語コメント");

      // 8. 先頭・末尾の空白をtrim（7の前に一旦trim）
      result = result.trim();

      // 7. 長文（全角換算40文字超）→ 先頭40文字 + "、以下省略"
      if (zenCount(result) > 40) {
        result = zenSlice(result, 40) + "、以下省略";
      }

      // 9. ユーザー名読み仮名変換
      const displayName = this.userDict[userId] || username;

      return `${displayName}さん、${result}`;
    } catch (e) {
      console.error("CommentFormatter.format error:", e);
      const fallbackName = comment?.username ?? "不明";
      return `${fallbackName}さん、コメント`;
    }
  }

  /**
   * ユーザー辞書更新
   * @param {string} userId
   * @param {string} reading - よみがな
   */
  updateUserDict(userId, reading) {
    this.userDict[userId] = reading;
  }
}

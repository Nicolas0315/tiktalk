const assert = require("node:assert");
const { CommentFormatter } = require("./formatter.js");

const fmt = new CommentFormatter({ user1: "たろう" });

function makeComment(text, userId = "user1", username = "taro") {
  return { userId, username, text };
}

// "wwww" → "わら"
{
  const result = fmt.format(makeComment("面白いwwww"));
  assert.ok(result.includes("わら"), `"wwww" → "わら" 変換失敗: ${result}`);
  assert.ok(!result.includes("wwww"), `"wwww"が残っている: ${result}`);
}

// URL → "URL省略"
{
  const result = fmt.format(makeComment("見て https://example.com すごい"));
  assert.ok(
    result.includes("URL省略"),
    `URL → "URL省略" 変換失敗: ${result}`
  );
  assert.ok(!result.includes("https://"), `URLが残っている: ${result}`);
}

// 長文（全角換算40文字超）→ 先頭40文字 + "、以下省略"
{
  const longText = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん漢字追加テスト";
  const result = fmt.format(makeComment(longText));
  assert.ok(result.includes("、以下省略"), `長文省略が機能していない: ${result}`);
}

// 絵文字除去
{
  const result = fmt.format(makeComment("楽しい😀よね"));
  assert.ok(!result.includes("😀"), `絵文字が残っている: ${result}`);
  assert.ok(result.includes("楽しい"), `テキストが消えている: ${result}`);
  assert.ok(result.includes("よね"), `テキストが消えている: ${result}`);
}

// ユーザー辞書によるよみがな変換
{
  const result = fmt.format(makeComment("テスト"));
  assert.ok(result.startsWith("たろうさん"), `よみがな変換失敗: ${result}`);
}

// 草の連続 → 大草原
{
  const result = fmt.format(makeComment("草草草草草"));
  assert.ok(result.includes("大草原"), `草連続変換失敗: ${result}`);
}

// 同じ文字の4連打以上を2文字に圧縮
{
  const result = fmt.format(makeComment("すごーーーーい"));
  assert.ok(result.includes("ーー"), `圧縮失敗: ${result}`);
  assert.ok(!result.includes("ーーー"), `圧縮不足: ${result}`);
}

console.log("✓ formatter.test.js: 全テスト合格");

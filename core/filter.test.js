import assert from "node:assert";
import { CommentFilter } from "./filter.js";

const now = Date.now();

function makeComment(overrides = {}) {
  return {
    userId: "user1",
    username: "テスト太郎",
    text: "こんにちは",
    timestamp: now,
    ...overrides,
  };
}

// URLのみのコメントが除外されること
{
  const f = new CommentFilter();
  assert.strictEqual(
    f.shouldFilter(makeComment({ text: "https://example.com/path" })),
    true,
    "URLのみは除外されるべき"
  );
}

// 絵文字のみが除外されること
{
  const f = new CommentFilter();
  assert.strictEqual(
    f.shouldFilter(makeComment({ text: "😀😂🎉" })),
    true,
    "絵文字のみは除外されるべき"
  );
}

// NGワード一致が除外されること
{
  const f = new CommentFilter(["スパム", "詐欺"]);
  assert.strictEqual(
    f.shouldFilter(makeComment({ text: "これはスパムです" })),
    true,
    "NGワード含むコメントは除外されるべき"
  );
}

// 通常テキストは通ること
{
  const f = new CommentFilter();
  assert.strictEqual(
    f.shouldFilter(makeComment({ text: "今日は楽しいですね" })),
    false,
    "通常テキストは通過するべき"
  );
}

// 空テキストが除外されること
{
  const f = new CommentFilter();
  assert.strictEqual(
    f.shouldFilter(makeComment({ text: "" })),
    true,
    "空テキストは除外されるべき"
  );
}

// 重複コメント（同一ユーザー10秒以内）が除外されること
{
  const f = new CommentFilter();
  f.shouldFilter(makeComment({ text: "同じコメント", timestamp: now }));
  assert.strictEqual(
    f.shouldFilter(
      makeComment({ text: "同じコメント", timestamp: now + 5_000 })
    ),
    true,
    "10秒以内の重複コメントは除外されるべき"
  );
}

// 絵文字率80%超が除外されること
{
  const f = new CommentFilter();
  assert.strictEqual(
    f.shouldFilter(makeComment({ text: "😀😂🎉🎊🥳あ" })),
    true,
    "絵文字率80%超は除外されるべき"
  );
}

console.log("✓ filter.test.js: 全テスト合格");

const { CommentFilter } = require("./filter.js");
const { CommentFormatter } = require("./formatter.js");
const { CommentQueue, Priority } = require("./queue.js");

module.exports = { CommentFilter, CommentFormatter, CommentQueue, Priority };

/**
 * コメントパイプラインのファクトリ関数
 * @param {{ ngWords?: string[], userDict?: Record<string, string> }} options
 */
function createCommentPipeline(options = {}) {
  const filter = new CommentFilter(options.ngWords);
  const formatter = new CommentFormatter(options.userDict);
  const queue = new CommentQueue();
  return { filter, formatter, queue };
}

module.exports.createCommentPipeline = createCommentPipeline;

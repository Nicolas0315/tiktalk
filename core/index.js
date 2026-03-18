import { CommentFilter } from "./filter.js";
import { CommentFormatter } from "./formatter.js";
import { CommentQueue, Priority } from "./queue.js";

export { CommentFilter, CommentFormatter, CommentQueue, Priority };

/**
 * コメントパイプラインのファクトリ関数
 * @param {{ ngWords?: string[], userDict?: Record<string, string> }} options
 */
export function createCommentPipeline(options = {}) {
  const filter = new CommentFilter(options.ngWords);
  const formatter = new CommentFormatter(options.userDict);
  const queue = new CommentQueue();
  return { filter, formatter, queue };
}

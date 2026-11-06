import sanitizeHtml from "sanitize-html";
export function plain(value) {
  return sanitizeHtml(String(value ?? ""), {
    allowedTags: [],
    allowedAttributes: {},
    parser: { decodeEntities: true },
  })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function authorIds(value) {
  return [
    ...new Set(
      (String(value ?? "").match(/\d+/g) ?? [])
        .map(Number)
        .filter(Number.isSafeInteger),
    ),
  ];
}
export const sorts = {
  newest: "a.date_of_publication DESC, a.article_id DESC",
  oldest: "a.date_of_publication ASC, a.article_id ASC",
  title: "a.article_title ASC, a.article_id DESC",
  popular: "COALESCE(a.views,0) DESC, a.article_id DESC",
};

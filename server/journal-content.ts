import sanitizeHtml from "sanitize-html";
export function journalHtml(value) {
  if (value == null) return null;
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "a",
      "hr",
    ],
    allowedAttributes: { "*": ["style"], a: ["href", "title"], ol: ["start"] },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

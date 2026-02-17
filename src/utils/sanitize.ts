import DOMPurify from "dompurify";

export const sanitizeHtml = (input: string | null | undefined): string => {
  if (!input) return "";

  return DOMPurify.sanitize(input, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link", "meta"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick", "onmouseover"],
  });
};

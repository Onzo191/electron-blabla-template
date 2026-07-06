import DOMPurify from "dompurify";
import { useMemo } from "react";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "span",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}

/**
 * The ONLY sanctioned raw-HTML sink in the renderer. Used for
 * backend-authored HTML fragments (e.g. agent greeting messages `<p>…</p>`).
 * Markdown never goes through here — react-markdown escapes HTML itself.
 */
export function SafeHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}): React.JSX.Element {
  const clean = useMemo(() => sanitize(html), [html]);
  return (
    <div
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify-sanitized, allowlisted tags/attrs/protocols only
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

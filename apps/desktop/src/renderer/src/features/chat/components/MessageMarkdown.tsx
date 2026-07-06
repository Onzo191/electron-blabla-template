import { memo, useMemo } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

const LINK_PROTOCOLS = /^(https?:|mailto:)/i;

function safeUrl(url: string): string {
  const sanitized = defaultUrlTransform(url);
  return LINK_PROTOCOLS.test(sanitized) ? sanitized : "";
}

function safeImageUrl(url: string): string {
  const sanitized = defaultUrlTransform(url);
  return /^https:/i.test(sanitized) ? sanitized : "";
}

/**
 * Splits markdown into paragraphs on blank lines, but never inside a
 * ``` / ~~~ code fence — each block becomes an independently memoized
 * ReactMarkdown so a streaming append only re-parses the final block.
 */
export function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;

  const flush = (): void => {
    const text = current.join("\n").trim();
    if (text !== "") blocks.push(text);
    current = [];
  };

  for (const line of markdown.split("\n")) {
    const fenceMatch = /^\s*(```|~~~)/.exec(line);
    if (fenceMatch) {
      const token = fenceMatch[1] ?? "```";
      fence = fence === null ? token : fence === token ? null : fence;
      current.push(line);
      continue;
    }
    if (fence === null && line.trim() === "") {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

const MarkdownBlock = memo(function MarkdownBlock({
  text,
}: {
  text: string;
}): React.JSX.Element {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      urlTransform={safeUrl}
      components={{
        a: ({ node: _node, href, children, ...rest }) => (
          <a
            {...rest}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-brand-600"
          >
            {children}
          </a>
        ),
        img: ({ node: _node, src, alt }) => {
          const url = typeof src === "string" ? safeImageUrl(src) : "";
          if (url === "") return null;
          return (
            <img
              src={url}
              alt={alt ?? ""}
              loading="lazy"
              className="max-w-full rounded-lg"
            />
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

/**
 * Assistant prose renderer. Blocks are keyed by index — indexes are
 * append-only while streaming, so earlier blocks stay referentially stable.
 */
export const MessageMarkdown = memo(function MessageMarkdown({
  text,
}: {
  text: string;
}): React.JSX.Element {
  const blocks = useMemo(() => splitMarkdownBlocks(text), [text]);
  return (
    <div className="chat-prose flex min-w-0 flex-col gap-3 text-[15px] leading-relaxed">
      {blocks.map((block, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: blocks are append-only during a stream; index keys keep prior blocks stable
        <MarkdownBlock key={index} text={block} />
      ))}
    </div>
  );
});

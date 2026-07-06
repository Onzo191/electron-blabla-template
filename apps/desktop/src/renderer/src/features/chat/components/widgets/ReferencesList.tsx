import type { ReferencesPayload } from "@myvng/shared";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

const SAFE_URL = /^https?:/i;

export function ReferencesList({
  payload,
}: {
  payload: ReferencesPayload;
}): React.JSX.Element | null {
  const { t } = useTranslation("aiAgents");
  const items = payload.items.filter(
    (item) => item.title != null || item.url != null,
  );
  if (items.length === 0) return null;

  return (
    <section
      aria-label={t("block.references")}
      className="rounded-lg border border-border-subtle bg-surface-raised p-3"
    >
      <h3 className="mb-2 text-xs font-medium text-text-faint">
        {payload.intro ?? t("block.references")}
      </h3>
      <ol className="flex list-none flex-col gap-1.5">
        {items.map((item, index) => {
          const title = item.title ?? item.url ?? "";
          const url =
            item.url != null && SAFE_URL.test(item.url) ? item.url : null;
          return (
            <li key={title} className="flex items-baseline gap-2 text-sm">
              <span className="shrink-0 text-xs text-text-faint">
                [{index + 1}]
              </span>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1 text-accent hover:underline"
                >
                  <span className="truncate">{title}</span>
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              ) : (
                <span className="truncate">{title}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

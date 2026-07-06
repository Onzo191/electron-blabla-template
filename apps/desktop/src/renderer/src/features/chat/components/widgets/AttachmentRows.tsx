import type { AttachmentsPayload } from "@myvng/shared";
import { Download, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

const SAFE_URL = /^https?:/i;

function formatSize(size: string | number | null | undefined): string | null {
  if (size == null) return null;
  if (typeof size === "string") return size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Direct-download file rows. */
export function AttachmentRows({
  payload,
}: {
  payload: AttachmentsPayload;
}): React.JSX.Element | null {
  const { t } = useTranslation("aiAgents");
  const items = payload.items.filter((item) => SAFE_URL.test(item.url));
  if (items.length === 0) return null;

  return (
    <section
      aria-label={t("block.attachments")}
      className="flex flex-col gap-2"
    >
      {payload.intro ? (
        <p className="text-sm text-text-muted">{payload.intro}</p>
      ) : null}
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              download={item.name}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 hover:border-accent"
            >
              <FileText size={16} className="shrink-0 text-text-faint" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {item.name}
              </span>
              {formatSize(item.size) ? (
                <span className="shrink-0 text-xs text-text-faint">
                  {formatSize(item.size)}
                </span>
              ) : null}
              <Download size={14} className="shrink-0 text-text-faint" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

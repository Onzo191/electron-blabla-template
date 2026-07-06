import { Button } from "@chakra-ui/react";
import type { ExportArtifactPayload } from "@myvng/shared";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

const ABSOLUTE_HTTPS = /^https:/i;

/**
 * Download card for an agent-generated document. The authed blob download
 * (attachment/export APIs) is out of scope this round — View works only for
 * absolute https URLs; Download ships with the attachments phase.
 */
export function ExportArtifactCard({
  payload,
}: {
  payload: ExportArtifactPayload;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const fileName =
    payload.fileName.trim() === ""
      ? t("exportArtifact.untitled")
      : payload.fileName;
  const viewUrl =
    payload.viewUrl != null && ABSOLUTE_HTTPS.test(payload.viewUrl)
      ? payload.viewUrl
      : null;

  return (
    <section
      aria-label={t("block.exportArtifact")}
      className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised p-3"
    >
      <FileText size={20} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        {payload.format ? (
          <p className="text-xs uppercase text-text-faint">{payload.format}</p>
        ) : null}
      </div>
      {viewUrl ? (
        <Button asChild size="xs" variant="outline">
          <a href={viewUrl} target="_blank" rel="noopener noreferrer">
            {t("exportArtifact.view")}
          </a>
        </Button>
      ) : null}
    </section>
  );
}
